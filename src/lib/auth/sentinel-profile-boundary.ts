import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '@/utils/supabase/server';

export const SENTINEL_ROLES = [
    'SUPER_ADMIN',
    'ADMIN',
    'TEAM_MANAGER',
    'MEMBER',
    'GUEST',
] as const;

export type SentinelRole = (typeof SENTINEL_ROLES)[number];

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

export type SentinelProfile = {
    id: string;
    email: string;
    full_name: string | null;
    role: SentinelRole;
    team_id: string | null;
    teams?: { name: string } | { name: string }[] | null;
};

export type SentinelActorResolution =
    | {
        ok: true;
        supabase: SessionClient;
        actor: SentinelProfile;
        organization_membership: 'current';
    }
    | {
        ok: false;
        supabase: SessionClient;
        reason:
        | 'session_missing'
        | 'profile_missing'
        | 'profile_ambiguous'
        | 'profile_invalid'
        | 'organization_missing'
        | 'organization_ambiguous';
        guest?: SentinelProfile;
    };

function createProfileAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error('sentinel_profile_boundary_unconfigured');
    }

    return createSupabaseClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}

function isSentinelRole(value: unknown): value is SentinelRole {
    return typeof value === 'string' && SENTINEL_ROLES.includes(value as SentinelRole);
}

function normalizeProfile(row: Record<string, unknown>): SentinelProfile | null {
    if (
        typeof row.id !== 'string'
        || typeof row.email !== 'string'
        || !isSentinelRole(row.role)
    ) {
        return null;
    }

    return {
        id: row.id,
        email: row.email,
        full_name: typeof row.full_name === 'string' ? row.full_name : null,
        role: row.role,
        team_id: typeof row.team_id === 'string' ? row.team_id : null,
        teams: (row.teams ?? null) as SentinelProfile['teams'],
    };
}

export async function resolveSentinelActor(options: {
    allowGuestWithoutOrganization?: boolean;
    supabase?: SessionClient;
} = {}): Promise<SentinelActorResolution> {
    const supabase = options.supabase ?? await createSessionClient();
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user?.id) {
        return { ok: false, supabase, reason: 'session_missing' };
    }

    const admin = createProfileAdminClient();
    const { data: profileRows, error: profileError } = await admin
        .from('users')
        .select('id, email, full_name, role, team_id')
        .eq('id', user.id)
        .limit(2);

    if (profileError) throw new Error('sentinel_profile_boundary_read_failed');
    if (!profileRows || profileRows.length === 0) {
        return { ok: false, supabase, reason: 'profile_missing' };
    }
    if (profileRows.length !== 1) {
        return { ok: false, supabase, reason: 'profile_ambiguous' };
    }

    const actor = normalizeProfile(profileRows[0] as Record<string, unknown>);
    if (!actor || actor.id !== user.id) {
        return { ok: false, supabase, reason: 'profile_invalid' };
    }

    if (!actor.team_id) {
        if (actor.role === 'GUEST' && options.allowGuestWithoutOrganization) {
            return { ok: false, supabase, reason: 'organization_missing', guest: actor };
        }
        return { ok: false, supabase, reason: 'organization_missing' };
    }

    const { data: organizationRows, error: organizationError } = await admin
        .from('teams')
        .select('id, name')
        .eq('id', actor.team_id)
        .limit(2);

    if (organizationError) throw new Error('sentinel_organization_boundary_read_failed');
    if (!organizationRows || organizationRows.length === 0) {
        return { ok: false, supabase, reason: 'organization_missing' };
    }
    if (organizationRows.length !== 1) {
        return { ok: false, supabase, reason: 'organization_ambiguous' };
    }

    actor.teams = { name: String(organizationRows[0].name ?? '') };
    return {
        ok: true,
        supabase,
        actor,
        organization_membership: 'current',
    };
}

export function hasSentinelRole(
    actor: SentinelProfile,
    roles: readonly SentinelRole[],
) {
    return roles.includes(actor.role);
}

export async function listSentinelProfilesForActor(actor: SentinelProfile) {
    if (!actor.team_id) throw new Error('sentinel_organization_membership_required');

    const admin = createProfileAdminClient();
    let query = admin
        .from('users')
        .select('id, email, full_name, role, team_id, created_at, teams(name)')
        .order('created_at', { ascending: false })
        .limit(200);

    if (!hasSentinelRole(actor, ['SUPER_ADMIN', 'ADMIN'])) {
        query = query.eq('team_id', actor.team_id);
    }

    const { data, error } = await query;
    if (error) throw new Error('sentinel_profile_list_failed');
    return data ?? [];
}

export async function listGuestProfilesForAdministrator(actor: SentinelProfile) {
    if (!actor.team_id || !hasSentinelRole(actor, ['SUPER_ADMIN', 'ADMIN'])) {
        throw new Error('sentinel_profile_administrator_required');
    }

    const admin = createProfileAdminClient();
    const { data, error } = await admin
        .from('users')
        .select('id, email, full_name, role, team_id, created_at')
        .eq('role', 'GUEST')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw new Error('sentinel_guest_profile_list_failed');
    return data ?? [];
}

export async function updateSentinelProfileForAdministrator(input: {
    actor: SentinelProfile;
    targetUserId: string;
    role: SentinelRole;
    teamId: string | null;
    fullName?: string | null;
}) {
    if (!input.actor.team_id || !hasSentinelRole(input.actor, ['SUPER_ADMIN', 'ADMIN'])) {
        throw new Error('sentinel_profile_administrator_required');
    }
    if (!input.targetUserId || !isSentinelRole(input.role)) {
        throw new Error('sentinel_profile_update_invalid');
    }

    const payload: Record<string, string | null> = {
        role: input.role,
        team_id: input.teamId,
    };
    if (input.fullName !== undefined) payload.full_name = input.fullName;

    const admin = createProfileAdminClient();
    const { data, error } = await admin
        .from('users')
        .update(payload)
        .eq('id', input.targetUserId)
        .select('id')
        .limit(2);

    if (error || !data || data.length !== 1) {
        throw new Error('sentinel_profile_update_failed');
    }
}

export async function inviteSentinelMemberForActor(input: {
    actor: SentinelProfile;
    email: string;
    role: SentinelRole;
    teamId: string | null;
}) {
    const canManage = hasSentinelRole(input.actor, ['SUPER_ADMIN', 'ADMIN', 'TEAM_MANAGER']);
    if (!input.actor.team_id || !canManage || !input.email.trim() || !isSentinelRole(input.role)) {
        throw new Error('sentinel_member_invitation_forbidden');
    }

    const targetRole = input.actor.role === 'TEAM_MANAGER' ? 'MEMBER' : input.role;
    const targetTeamId = input.actor.role === 'TEAM_MANAGER' ? input.actor.team_id : input.teamId;
    const admin = createProfileAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email.trim());

    if (error || !data.user?.id) {
        throw new Error('sentinel_member_invitation_failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    const { data: updatedRows, error: updateError } = await admin
        .from('users')
        .update({ role: targetRole, team_id: targetTeamId })
        .eq('id', data.user.id)
        .select('id')
        .limit(2);

    if (updateError || !updatedRows || updatedRows.length !== 1) {
        throw new Error('sentinel_member_profile_assignment_failed');
    }
}

export async function deleteSentinelMemberForAdministrator(input: {
    actor: SentinelProfile;
    targetUserId: string;
}) {
    if (
        !input.actor.team_id
        || !hasSentinelRole(input.actor, ['SUPER_ADMIN', 'ADMIN'])
        || !input.targetUserId
        || input.targetUserId === input.actor.id
    ) {
        throw new Error('sentinel_member_delete_forbidden');
    }

    const admin = createProfileAdminClient();
    const { error } = await admin.auth.admin.deleteUser(input.targetUserId);
    if (error) throw new Error('sentinel_member_delete_failed');
}

export function buildBrowserSafeSentinelProfile(actor: SentinelProfile) {
    return {
        authenticated: true as const,
        profile_present: true as const,
        organization_membership: actor.team_id ? 'current' as const : 'missing' as const,
        role: actor.role,
        display_label: actor.full_name?.trim() || '로그인 계정',
    };
}

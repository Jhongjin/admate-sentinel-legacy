'use server';

import { createClient } from '@/utils/supabase/server';
import {
    deleteSentinelMemberForAdministrator,
    inviteSentinelMemberForActor,
    resolveSentinelActor,
    type SentinelRole,
    updateSentinelProfileForAdministrator,
} from '@/lib/auth/sentinel-profile-boundary';
import { revalidatePath } from 'next/cache';

export async function inviteMemberAction(formData: FormData): Promise<void> {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) {
        console.error('sentinel_member_invitation_authority_missing');
        return;
    }

    try {
        await inviteSentinelMemberForActor({
            actor: actorResolution.actor,
            email: String(formData.get('email') || ''),
            role: String(formData.get('role') || 'MEMBER') as SentinelRole,
            teamId: String(formData.get('teamId') || '') || null,
        });
    } catch {
        console.error('sentinel_member_invitation_failed');
        return;
    }

    revalidatePath('/settings/members');
}

export async function updateMemberAction(formData: FormData): Promise<void> {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) {
        console.error('sentinel_member_update_authority_missing');
        return;
    }

    const fullNameValue = formData.get('fullName');

    try {
        await updateSentinelProfileForAdministrator({
            actor: actorResolution.actor,
            targetUserId: String(formData.get('userId') || ''),
            role: String(formData.get('role') || '') as SentinelRole,
            teamId: String(formData.get('teamId') || '') || null,
            fullName: typeof fullNameValue === 'string' ? fullNameValue.trim() || null : undefined,
        });
    } catch {
        console.error('sentinel_member_update_failed');
        return;
    }

    revalidatePath('/settings/members');
}

export async function deleteMemberAction(formData: FormData): Promise<void> {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) {
        console.error('sentinel_member_delete_authority_missing');
        return;
    }

    try {
        await deleteSentinelMemberForAdministrator({
            actor: actorResolution.actor,
            targetUserId: String(formData.get('userId') || ''),
        });
    } catch {
        console.error('sentinel_member_delete_failed');
        return;
    }

    revalidatePath('/settings/members');
}

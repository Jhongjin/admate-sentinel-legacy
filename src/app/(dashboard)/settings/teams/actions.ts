'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { hasSentinelRole, resolveSentinelActor } from '@/lib/auth/sentinel-profile-boundary';

async function requireAdmin() {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) throw new Error('Unauthorized');
    if (!hasSentinelRole(actorResolution.actor, ['SUPER_ADMIN', 'ADMIN'])) {
        throw new Error('Forbidden: Admin only');
    }
    return supabase;
}

export async function createTeamAction(name: string) {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('teams').insert({ name });
    if (error) throw new Error(error.message);
    revalidatePath('/settings/teams');
}

export async function updateTeamAction(id: string, name: string) {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('teams').update({ name }).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/settings/teams');
}

export async function deleteTeamAction(id: string) {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/settings/teams');
    revalidatePath('/settings/accounts'); // Keep mappings updated
}

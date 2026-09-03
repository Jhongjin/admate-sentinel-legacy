'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { resolveSentinelActor } from '@/lib/auth/sentinel-profile-boundary';

export async function passAuditErrorAction(logId: string, rowId: number) {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) throw new Error('sentinel_profile_authority_required');
    const passedBy = actorResolution.actor.full_name || actorResolution.actor.email;

    // Fetch the specific log
    const { data: log } = await supabase.from('audit_logs').select('details').eq('id', logId).single();
    if (!log || !log.details) throw new Error('Log not found');

    let details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;

    // Find the row and mark it as passed
    details = details.map((d: any) => {
        if (d.rowId === rowId && d.status !== 'PASS') {
            return {
                ...d,
                passed: true,
                passedBy: passedBy
            };
        }
        return d;
    });

    // Recalculate physical error_count
    const newErrorCount = details.filter((d: any) => d.status !== 'PASS' && !d.passed).length;

    // Update DB
    await supabase.from('audit_logs').update({
        details: details,
        error_count: newErrorCount
    }).eq('id', logId);

    revalidatePath('/history');
    return { success: true };
}

export async function passAllAuditErrorsAction(logId: string) {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) throw new Error('sentinel_profile_authority_required');
    const passedBy = actorResolution.actor.full_name || actorResolution.actor.email;

    // Fetch the specific log
    const { data: log } = await supabase.from('audit_logs').select('details').eq('id', logId).single();
    if (!log || !log.details) throw new Error('Log not found');

    let details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;

    // Mark ALL unpassed rows as passed
    details = details.map((d: any) => {
        if (d.status !== 'PASS' && !d.passed) {
            return {
                ...d,
                passed: true,
                passedBy: passedBy
            };
        }
        return d;
    });

    // Update DB (Error count is now implicitly 0)
    await supabase.from('audit_logs').update({
        details: details,
        error_count: 0
    }).eq('id', logId);

    revalidatePath('/history');
    return { success: true };
}

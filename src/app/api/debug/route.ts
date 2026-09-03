import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    hasSentinelRole,
    listSentinelProfilesForActor,
    resolveSentinelActor,
} from '@/lib/auth/sentinel-profile-boundary';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok && actorResolution.reason === 'session_missing') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
        !actorResolution.ok
        || !hasSentinelRole(actorResolution.actor, ['SUPER_ADMIN', 'ADMIN'])
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await listSentinelProfilesForActor(actorResolution.actor);
    const { data: teams } = await supabase.from('teams').select('id');
    const { data: maps } = await supabase.from('team_account_map').select('id');

    return NextResponse.json({
        users: {
            records_present: users.length > 0,
            organization_membership_complete: users.every((candidate) => Boolean(candidate.team_id)),
        },
        teams: { records_present: Boolean(teams?.length) },
        maps: { records_present: Boolean(maps?.length) },
    });
}

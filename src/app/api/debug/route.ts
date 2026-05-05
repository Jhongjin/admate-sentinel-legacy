import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['SUPER_ADMIN', 'ADMIN'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Development-only debug data. Do not use a service role client here.
    const { data: users } = await supabase.from('users').select('email, role, team_id');
    const { data: teams } = await supabase.from('teams').select('id, name');
    const { data: maps } = await supabase.from('team_account_map').select('*');

    return NextResponse.json({
        users,
        teams,
        maps
    });
}

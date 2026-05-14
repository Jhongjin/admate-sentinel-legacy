import { createClient } from '@/utils/supabase/server';
import { Gauge, RadioTower, ShieldCheck } from 'lucide-react';
import AuditClientUI from './AuditClientUI';

export default async function AuditPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch user details for team
    const { data: myUser } = await supabase.from('users').select('*, teams(name)').eq('id', user.id).single();

    return (
        <div className="space-y-4 flex flex-col h-[calc(100vh-3rem)]">
            <header className="flex justify-between items-end flex-shrink-0 border-b border-slate-300 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        <RadioTower className="h-4 w-4 text-cyan-700" />
                        Sentinel Operations Console
                    </div>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-cyan-700" />
                        Prelaunch Audit Gate
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        미디어믹스와 매체 세팅값을 출시 전 단계에서 대조하고, 예산/일정/트래킹 불일치를 운영 관점으로 판정합니다.
                    </p>
                </div>
                <div className="hidden xl:flex items-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 shadow-sm">
                    <Gauge className="h-5 w-5 text-cyan-700" />
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Gate Mode</p>
                        <p className="text-sm font-semibold text-slate-900">Desktop monitoring</p>
                    </div>
                </div>
            </header>

            <AuditClientUI teamId={myUser?.team_id} teamName={myUser?.teams?.name} />
        </div>
    );
}

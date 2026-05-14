'use client';

import { useState } from 'react';
import {
    AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, RadioTower, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

type KpiRecord = {
    title: string;
    value: string | number;
    change?: string;
    isPositive?: boolean;
    icon?: string;
};

type LiveCampaignRecord = {
    id: string;
    account_id?: string | null;
    name?: string | null;
    objective?: string | null;
    effective_status?: string | null;
};

type RecentAuditRecord = {
    id: string;
    created_at: string;
    total_campaigns?: number | null;
    error_count?: number | null;
};

export default function ActiveDashboardClientUI({
    kpis,
    liveCampaigns,
    recentAudits
}: {
    kpis: KpiRecord[];
    liveCampaigns: LiveCampaignRecord[];
    recentAudits: RecentAuditRecord[];
}) {
    const [activeTab, setActiveTab] = useState<'meta' | 'google'>('meta');
    const activeCampaigns = liveCampaigns.filter((campaign) => campaign.effective_status === 'ACTIVE').length;
    const pausedCampaigns = liveCampaigns.filter((campaign) => campaign.effective_status === 'PAUSED').length;
    const recentFailAudits = recentAudits.filter((audit) => (audit.error_count || 0) > 0).length;
    const recentAuditScope = recentAudits.reduce((sum, audit) => sum + (audit.total_campaigns || 0), 0);
    const legacyKpiCount = kpis.length;
    const gateStatus = recentFailAudits > 0 ? '검토 필요' : recentAudits.length > 0 ? '통과 유지' : '대기';
    const gateTone = recentFailAudits > 0 ? 'amber' : recentAudits.length > 0 ? 'emerald' : 'slate';
    const gatePanels = [
        {
            label: 'Launch Gate',
            value: gateStatus,
            helper: recentFailAudits > 0 ? `${recentFailAudits}개 검수에서 불일치 발견` : '최근 검수 기준 이상 없음',
        },
        {
            label: 'Mapped Campaigns',
            value: liveCampaigns.length.toLocaleString(),
            helper: `${activeCampaigns} active / ${pausedCampaigns} paused`,
        },
        {
            label: 'Recent Audit Scope',
            value: recentAuditScope.toLocaleString(),
            helper: `${recentAudits.length}개 최근 검수 로그`,
        },
        {
            label: 'Platform Boundary',
            value: activeTab === 'meta' ? 'Meta' : 'Google',
            helper: activeTab === 'meta' ? '계정 매핑 기반 상태 확인' : '연동 준비 중',
        },
        {
            label: 'Legacy Metrics',
            value: legacyKpiCount.toLocaleString(),
            helper: '성과 KPI는 launch gate 판단에서 분리',
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl animate-in fade-in duration-500 pb-12">
            <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                <div className="grid gap-px bg-slate-300 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="bg-[#101820] p-6 text-white">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-sm border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Pre-launch Validation
                            </span>
                            <span className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[11px] font-bold ${
                                gateTone === 'amber'
                                    ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                                    : gateTone === 'emerald'
                                        ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
                                        : 'border-slate-500 bg-white/5 text-slate-300'
                            }`}>
                                <span className={`h-2 w-2 rounded-full ${
                                    gateTone === 'amber' ? 'bg-amber-300' : gateTone === 'emerald' ? 'bg-emerald-300' : 'bg-slate-400'
                                }`} />
                                {gateStatus}
                            </span>
                        </div>
                        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight">
                            Sentinel Launch Gate
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-300">
                            미디어믹스 기준값과 실제 매체 세팅을 대조하기 전에, 팀 매핑 캠페인과 최근 검수
                            결과를 먼저 보는 사전 집행 보호 보드입니다.
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {[
                                ['Source of truth', 'Media mix Excel'],
                                ['Actual state', 'Meta / Google Ads'],
                                ['Decision', 'Pass · Warning · Fail'],
                            ].map(([label, value]) => (
                                <div key={label} className="border border-white/10 bg-white/[0.06] px-3 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                                    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside className="bg-[#f7f9f8] p-5">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            <RadioTower className="h-4 w-4 text-cyan-700" />
                            Gate Watch
                        </div>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-md border border-slate-300 bg-white p-4">
                                <p className="text-xs font-semibold text-slate-500">이번 화면의 목적</p>
                                <p className="mt-2 text-xl font-bold text-slate-950">집행 전 사고 방지</p>
                                <p className="mt-2 text-xs leading-5 text-slate-600">
                                    예산, 일정, 랜딩 URL, UTM, 픽셀/이벤트 불일치를 launch gate에서 먼저 확인합니다.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-md border border-slate-300 bg-white p-3">
                                    <p className="text-[11px] font-bold text-slate-500">Active</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-950">{activeCampaigns}</p>
                                </div>
                                <div className="rounded-md border border-slate-300 bg-white p-3">
                                    <p className="text-[11px] font-bold text-slate-500">Review</p>
                                    <p className="mt-1 text-2xl font-bold text-slate-950">{recentFailAudits}</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div className="grid gap-px bg-slate-300 md:grid-cols-5">
                    {gatePanels.map((panel) => (
                        <div key={panel.label} className="bg-white px-4 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{panel.label}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-950">{panel.value}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{panel.helper}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
                <button
                    onClick={() => setActiveTab('meta')}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'meta' ? 'border-cyan-700 text-cyan-800 dark:border-cyan-400 dark:text-cyan-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    Meta (Facebook/Instagram)
                </button>
                <button
                    onClick={() => setActiveTab('google')}
                    className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'google' ? 'border-cyan-700 text-cyan-800 dark:border-cyan-400 dark:text-cyan-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    Google Ads
                </button>
            </div>

            {activeTab === 'google' ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-zinc-200 bg-white p-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20">
                        <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Google Ads launch gate 준비 중</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
                        Google Ads API 승인 후 미디어믹스 기준값과 실제 세팅 대조 흐름을 이 보드에 연결합니다.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                            { title: 'Launch readiness', value: gateStatus, icon: ShieldCheck, helper: '최근 검수 이력 기반' },
                            { title: 'Live mapping scope', value: liveCampaigns.length.toLocaleString(), icon: RadioTower, helper: '팀 매핑 Meta 캠페인' },
                            { title: 'Audit review load', value: recentFailAudits.toLocaleString(), icon: AlertTriangle, helper: '최근 검수 중 FAIL 포함' },
                        ].map((card) => (
                            <div key={card.title} className="relative overflow-hidden rounded-md border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{card.title}</h3>
                                        <p className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{card.value}</p>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{card.helper}</p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-900/20 dark:text-cyan-300">
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-96">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    팀 매핑 캠페인 상태
                                    <span className="bg-cyan-100 text-cyan-800 text-[10px] px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">Pre-check scope</span>
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-900/60 font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4">계정 ID</th>
                                            <th className="px-6 py-4">캠페인 명</th>
                                            <th className="px-6 py-4">목적 (Objective)</th>
                                            <th className="px-6 py-4 text-center">동작 상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                        {liveCampaigns.length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">연결된 라이브 캠페인이 없습니다.</td></tr>
                                        )}
                                        {liveCampaigns.map((camp) => (
                                            <tr key={camp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-zinc-500 text-xs">{camp.account_id?.replace('act_', '')}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{camp.name}</div>
                                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{camp.id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs">{camp.objective}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {camp.effective_status === 'ACTIVE' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" /> ACTIVE</span>
                                                    ) : camp.effective_status === 'PAUSED' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">PAUSED</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">{camp.effective_status}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-96">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0 gap-2">
                                <Clock className="w-5 h-5 text-cyan-700" /> 최근 launch gate 검수
                            </h2>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {recentAudits.length === 0 && (
                                    <div className="text-center text-zinc-500 text-sm mt-10">최근 진행된 검수가 없습니다.</div>
                                )}
                                {recentAudits.map(audit => (
                                    <div key={audit.id} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] text-zinc-400 font-mono">{format(new Date(audit.created_at), 'MM/dd HH:mm')}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${audit.error_count === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {audit.error_count === 0 ? 'PASS' : `${audit.error_count} FAIL`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">총 {audit.total_campaigns}개 검증 완료</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

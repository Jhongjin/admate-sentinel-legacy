'use client';

import { useMemo, useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    Download,
    FileSpreadsheet,
    Gauge,
    Layers3,
    Loader2,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    UploadCloud,
} from 'lucide-react';
import { crosscheckApiAction } from './actions';

export interface ParsedRow {
    Platform: string;
    Team: string;
    AccountID: string;
    CampaignName: string;
    Currency: string;
    CampaignDailyBudget: number;
    CampaignLifetimeBudget: number;
    StartDate: string;
    EndDate: string;
    AdSetName: string;
    AdSetDailyBudget: number;
    AdSetLifetimeBudget: number;
    CampaignObjective: string;
    CampaignBuyingType: string;
    AdName: string;
    LandingURL: string;
    UTMParameters: string;
    AdSetOptimizationGoal: string;
    AdSetBillingEvent: string;
    PixelID: string;
    CustomEventType: string;
}

export interface AuditResult {
    rowId: number;
    CampaignName: string;
    AdSetName: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    errors: string[];
}

const formatBudget = (value: number) => value > 0 ? value.toLocaleString() : '-';

const statusCopy = {
    PASS: { label: 'PASS', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
    FAIL: { label: 'FAIL', className: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
    WARNING: { label: 'WARN', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
} as const;

export default function AuditClientUI({ teamId, teamName }: { teamId?: string, teamName?: string }) {
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [results, setResults] = useState<AuditResult[] | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedRow = rows[selectedRowIndex] || rows[0];
    const selectedResult = results?.find(result => result.rowId === selectedRowIndex);

    const gateStats = useMemo(() => {
        const pass = results?.filter(result => result.status === 'PASS').length || 0;
        const fail = results?.filter(result => result.status === 'FAIL').length || 0;
        const warning = results?.filter(result => result.status === 'WARNING').length || 0;
        const totalBudget = rows.reduce((sum, row) => sum + row.CampaignDailyBudget + row.CampaignLifetimeBudget + row.AdSetDailyBudget + row.AdSetLifetimeBudget, 0);
        const accounts = new Set(rows.map(row => row.AccountID).filter(Boolean)).size;
        const platforms = new Set(rows.map(row => row.Platform).filter(Boolean)).size;
        const blocked = fail > 0;
        const ready = rows.length > 0 && results && fail === 0;

        return { pass, fail, warning, totalBudget, accounts, platforms, blocked, ready };
    }, [results, rows]);

    const workflowSteps = [
        { label: 'Template intake', state: rows.length > 0 ? 'complete' : 'active' },
        { label: 'Field normalization', state: rows.length > 0 ? 'complete' : 'pending' },
        { label: 'Live media check', state: results ? 'complete' : rows.length > 0 ? 'active' : 'pending' },
        { label: 'Launch decision', state: results ? gateStats.blocked ? 'blocked' : 'complete' : 'pending' },
    ];

    const downloadTemplate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const headers = [
            '매체', '팀명', '계정 ID',
            '캠페인명', '통화', '캠페인 일 예산', '캠페인 예산', '시작일', '종료일',
            '광고 세트명', '광고 세트 일 예산', '광고 세트 예산',
            '캠페인 목적', '구매 유형', '광고명', '랜딩 URL', 'UTM 파라미터',
            '최적화 목표', '과금 기준', '픽셀/이벤트', '이벤트 유형'
        ];

        const mockData1 = [
            'Meta', teamName || '소속 팀명 입력', '1777607596977990',
            '24년_봄_프로모션_캠페인', 'KRW', '500000', '10000000', '2024-04-01', '2024-04-30',
            '세트_A_타겟', '', '2000000',
            'OUTCOME_SALES', 'AUCTION', '이미지_소재_1', 'https://example.com/spring', 'utm_source=fb&utm_medium=cpa',
            'CONVERSIONS', 'IMPRESSIONS', '123456789', 'Purchase'
        ];
        const mockData2 = [
            'Meta', teamName || '소속 팀명 입력', '1777607596977990',
            '24년_가을_프로모션_캠페인', 'KRW', '', '20000000', '2024-09-01', '2024-09-30',
            '세트_B_타겟', '50000', '',
            'OUTCOME_TRAFFIC', 'AUCTION', '참여유도_소재_A', 'https://example.com/fall', 'utm_source=fb&utm_medium=cpc',
            'LINK_CLICKS', 'IMPRESSIONS', '', ''
        ];

        const wb = xlsx.utils.book_new();
        const wsData = xlsx.utils.aoa_to_sheet([headers, mockData1, mockData2]);
        xlsx.utils.book_append_sheet(wb, wsData, '미디어믹스_기본양식');

        const referenceHeaders = ['항목명', '입력 가능한 값 (Meta API 기준) / 설명'];
        const referenceData = [
            ['통화 (Currency)', 'KRW, USD, JPY 등 ISO 4217 표준 통화 코드 (대문자 입력 권장)'],
            ['캠페인 목적 (Objective)', 'OUTCOME_SALES (판매), OUTCOME_LEADS (리드), OUTCOME_TRAFFIC (트래픽), OUTCOME_ENGAGEMENT (참여), OUTCOME_AWARENESS (인지도), OUTCOME_APP_PROMOTION (앱 홍보)'],
            ['구매 유형 (Buying Type)', 'AUCTION (경매), RESERVE (도달 및 빈도)'],
            ['타겟팅 요약', '자유 양식 (예: KR, 25-44세, 여성) - API의 복잡한 타겟팅 JSON과 직관적으로 비교하기 위한 메모 용도'],
            ['최적화 목표 (Optimization)', 'CONVERSIONS (전환), LINK_CLICKS (링크 클릭), IMPRESSIONS (노출), REACH (도달), LANDING_PAGE_VIEWS (랜딩 페이지 조회), THRUPLAY (동영상 조회)'],
            ['과금 기준 (Billing Event)', 'IMPRESSIONS (노출), LINK_CLICKS (링크 클릭), THRUPLAY (동영상 조회)'],
            ['픽셀/이벤트 (Event)', 'Purchase (구매), Lead (리드), AddToCart (장바구니 담기), ViewContent (콘텐츠 조회) 등 표준 이벤트명 및 맞춤 이벤트명']
        ];
        const wsRef = xlsx.utils.aoa_to_sheet([referenceHeaders, ...referenceData]);
        wsRef['!cols'] = [{ wch: 25 }, { wch: 120 }];

        xlsx.utils.book_append_sheet(wb, wsRef, '입력 가이드(옵션값)');
        xlsx.writeFile(wb, 'Ad-Sentinel_표준_미디어믹스_템플릿.xlsx');
    };

    const processFile = (file: File) => {
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: Record<string, unknown>[] = xlsx.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });

                const parseBudget = (val: unknown) => {
                    if (!val) return 0;
                    const str = String(val).replace(/,/g, '').trim();

                    if (str.includes('만')) {
                        const numPart = Number(str.replace(/만/g, '').replace(/원/g, '').replace(/[^0-9.]/g, ''));
                        return numPart * 10000;
                    }

                    const cleanVal = str.replace(/[^0-9.]/g, '');
                    return Number(cleanVal) || 0;
                };

                const parseDate = (val: unknown) => {
                    if (!val) return '';
                    if (typeof val === 'number') {
                        const utcDays = Math.floor(val - 25569);
                        const dateObj = new Date(utcDays * 86400 * 1000);
                        return dateObj.toISOString().split('T')[0];
                    }
                    if (typeof val === 'string') {
                        if (!isNaN(Number(val)) && Number(val) > 10000) {
                            const utcDays = Math.floor(Number(val) - 25569);
                            const dateObj = new Date(utcDays * 86400 * 1000);
                            return dateObj.toISOString().split('T')[0];
                        }
                        if (val.includes('/')) {
                            const parts = val.split('/');
                            if (parts.length === 3) {
                                let y = parts[2];
                                let m = parts[0];
                                let d = parts[1];
                                if (parts[0].length === 4) {
                                    y = parts[0];
                                    m = parts[1];
                                    d = parts[2];
                                } else if (parts[2].length === 2) {
                                    y = '20' + parts[2];
                                }
                                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            }
                        }
                    }
                    return String(val).trim();
                };

                const mappedData: ParsedRow[] = data.map(item => ({
                    Platform: String(item['매체'] || ''),
                    Team: String(item['팀명'] || ''),
                    AccountID: item['계정 ID']?.toString() || '',
                    CampaignName: String(item['캠페인명'] || ''),
                    Currency: String(item['통화'] || ''),
                    CampaignDailyBudget: parseBudget(item['캠페인 일 예산']),
                    CampaignLifetimeBudget: parseBudget(item['캠페인 예산']),
                    StartDate: parseDate(item['시작일']),
                    EndDate: parseDate(item['종료일']),
                    AdSetName: String(item['광고 세트명'] || item['광고 세트/그룹명'] || ''),
                    AdSetDailyBudget: parseBudget(item['광고 세트 일 예산']),
                    AdSetLifetimeBudget: parseBudget(item['광고 세트 예산']),
                    CampaignObjective: String(item['캠페인 목적'] || ''),
                    CampaignBuyingType: String(item['구매 유형'] || ''),
                    AdName: String(item['광고명'] || ''),
                    LandingURL: String(item['랜딩 URL'] || ''),
                    UTMParameters: String(item['UTM 파라미터'] || ''),
                    AdSetOptimizationGoal: String(item['최적화 목표'] || ''),
                    AdSetBillingEvent: String(item['과금 기준'] || ''),
                    PixelID: item['픽셀/이벤트']?.toString() || '',
                    CustomEventType: String(item['이벤트 유형'] || '')
                }));

                setRows(mappedData);
                setResults(null);
                setSelectedRowIndex(0);
            } catch (error) {
                console.error('Excel Parsing Error:', error);
                alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 양식이 맞는지 확인해주세요.');
            } finally {
                setIsParsing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleAudit = async () => {
        if (rows.length === 0) return;
        setIsAuditing(true);
        try {
            const auditRes = await crosscheckApiAction(rows);
            setResults(auditRes);
        } catch (error) {
            console.error('Audit Error:', error);
            alert('실시간 검수 중 서버 오류가 발생했습니다.');
        } finally {
            setIsAuditing(false);
        }
    };

    return (
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
            <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)_360px] bg-slate-100">
                <aside className="flex min-h-0 flex-col border-r border-slate-300 bg-[#15202b] text-slate-100">
                    <div className="border-b border-slate-700 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Workflow Rail</p>
                        <p className="mt-2 text-sm font-semibold text-white">{teamName || '미지정 팀'}</p>
                        <p className="mt-1 truncate text-xs text-slate-400" title={teamId || 'No team id'}>{teamId || 'Team ID pending'}</p>
                    </div>

                    <div className="space-y-3 p-4">
                        {workflowSteps.map((step, index) => (
                            <div key={step.label} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold ${
                                        step.state === 'complete' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' :
                                            step.state === 'blocked' ? 'border-rose-400/40 bg-rose-400/15 text-rose-200' :
                                                step.state === 'active' ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' :
                                                    'border-slate-700 bg-slate-800 text-slate-500'
                                    }`}>
                                        {index + 1}
                                    </span>
                                    {index < workflowSteps.length - 1 && <span className="h-7 w-px bg-slate-700" />}
                                </div>
                                <div className="pt-1">
                                    <p className="text-sm font-semibold text-slate-100">{step.label}</p>
                                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-500">{step.state}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mx-4 rounded-md border border-slate-700 bg-slate-900/60 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Gauge className="h-4 w-4 text-cyan-300" />
                            Gate readiness
                        </div>
                        <p className="mt-2 text-2xl font-bold text-white">
                            {!rows.length ? 'Standby' : results ? gateStats.blocked ? 'Blocked' : 'Ready' : 'Loaded'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                            {results ? `${gateStats.pass} pass, ${gateStats.warning} warn, ${gateStats.fail} fail` : `${rows.length} rows prepared for verification`}
                        </p>
                    </div>

                    <div className="mt-auto border-t border-slate-700 p-4">
                        <button
                            onClick={downloadTemplate}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-600 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                            <Download className="h-4 w-4" />
                            템플릿 다운로드
                        </button>
                    </div>
                </aside>

                <main className="flex min-w-0 min-h-0 flex-col bg-[#f5f7f8]">
                    <section className="grid grid-cols-4 gap-px border-b border-slate-300 bg-slate-300">
                        {[
                            ['Loaded rows', rows.length.toLocaleString(), 'Excel intake scope'],
                            ['Accounts', gateStats.accounts.toLocaleString(), `${gateStats.platforms || 0} media platforms`],
                            ['Discrepancies', (gateStats.fail + gateStats.warning).toLocaleString(), results ? 'From live check' : 'Awaiting check'],
                            ['Budget scope', formatBudget(gateStats.totalBudget), 'KRW normalized'],
                        ].map(([label, value, helper]) => (
                            <div key={label} className="bg-white px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
                                <p className="mt-1 text-xs text-slate-500">{helper}</p>
                            </div>
                        ))}
                    </section>

                    {rows.length === 0 ? (
                        <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                            <div
                                className={`flex h-full w-full max-w-5xl cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-8 text-center transition ${
                                    isDragOver ? 'border-cyan-600 bg-cyan-50 shadow-inner' : 'border-slate-300 bg-white hover:border-cyan-600 hover:bg-slate-50'
                                }`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 text-cyan-700">
                                    {isParsing ? <Loader2 className="h-10 w-10 animate-spin" /> : <UploadCloud className="h-10 w-10" />}
                                </div>
                                <h3 className="mt-5 text-2xl font-bold text-slate-950">미디어믹스 파일을 게이트에 적재</h3>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                                    Excel 표준 양식을 업로드하면 행 단위로 파싱하고, 이후 매체 연동 검수 버튼으로 라이브 데이터 대조를 시작합니다.
                                </p>
                                <div className="mt-6 grid w-full max-w-2xl grid-cols-3 gap-3 text-left">
                                    {[
                                        ['01', 'Campaign budget', '일/총 예산 기준값'],
                                        ['02', 'Schedule window', '시작/종료일 범위'],
                                        ['03', 'Tracking setup', 'UTM, 픽셀, 이벤트'],
                                    ].map(([num, title, body]) => (
                                        <div key={title} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-[11px] font-bold text-cyan-700">{num}</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
                                            <p className="mt-1 text-xs text-slate-500">{body}</p>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-950">Discrepancy Grid</h3>
                                        <p className="text-xs text-slate-500">Parsed rows are selectable; the inspector shows launch impact and setup details.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setRows([]); setResults(null); setSelectedRowIndex(0); }}
                                        className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        다시 올리기
                                    </button>
                                    <button
                                        onClick={handleAudit}
                                        disabled={isAuditing}
                                        className="flex items-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:opacity-50"
                                    >
                                        {isAuditing ? <><Loader2 className="h-4 w-4 animate-spin" /> Live check running</> : <><ShieldCheck className="h-4 w-4" /> 매체 연동 검수 시작</>}
                                    </button>
                                </div>
                            </div>

                            <div className="relative min-h-0 flex-1 overflow-auto">
                                {isAuditing && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
                                        <div className="rounded-md border border-slate-300 bg-white p-6 text-center shadow-xl">
                                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-700" />
                                            <h3 className="mt-3 font-bold text-slate-950">API 연동 검수 중...</h3>
                                            <p className="mt-1 text-sm text-slate-500">매체 세팅값과 기준 행을 대조하고 있습니다.</p>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full min-w-[1180px] text-left text-xs">
                                    <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-900 text-slate-200 shadow-sm">
                                        <tr>
                                            <th className="px-3 py-3 font-semibold">Gate</th>
                                            <th className="px-3 py-3 font-semibold">매체</th>
                                            <th className="px-3 py-3 font-semibold">캠페인</th>
                                            <th className="px-3 py-3 font-semibold">광고 세트</th>
                                            <th className="px-3 py-3 text-right font-semibold">Campaign budget</th>
                                            <th className="px-3 py-3 text-right font-semibold">Set budget</th>
                                            <th className="px-3 py-3 font-semibold">Schedule</th>
                                            <th className="px-3 py-3 font-semibold">Tracking</th>
                                            <th className="px-3 py-3 font-semibold">Discrepancy</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {rows.map((row, index) => {
                                            const res = results?.find(result => result.rowId === index);
                                            const status = res ? statusCopy[res.status] : null;
                                            const isSelected = index === selectedRowIndex;

                                            return (
                                                <tr
                                                    key={`${row.CampaignName}-${row.AdSetName}-${index}`}
                                                    onClick={() => setSelectedRowIndex(index)}
                                                    className={`cursor-pointer transition hover:bg-cyan-50/60 ${isSelected ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-300' : ''}`}
                                                >
                                                    <td className="px-3 py-3">
                                                        {status ? (
                                                            <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-bold ring-1 ${status.className}`}>
                                                                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                                                                {status.label}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100 px-2 py-1 font-bold text-slate-500 ring-1 ring-slate-200">
                                                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                                                READY
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="rounded-sm bg-slate-100 px-2 py-1 font-bold text-slate-700">{row.Platform || '미상'}</span>
                                                    </td>
                                                    <td className="max-w-[220px] truncate px-3 py-3 font-semibold text-slate-950" title={row.CampaignName}>{row.CampaignName || '-'}</td>
                                                    <td className="max-w-[220px] truncate px-3 py-3 text-slate-700" title={row.AdSetName}>{row.AdSetName || '-'}</td>
                                                    <td className="px-3 py-3 text-right font-mono text-slate-700">{formatBudget(row.CampaignDailyBudget || row.CampaignLifetimeBudget)}</td>
                                                    <td className="px-3 py-3 text-right font-mono text-slate-700">{formatBudget(row.AdSetDailyBudget || row.AdSetLifetimeBudget)}</td>
                                                    <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{row.StartDate || '-'} <ArrowRight className="mx-1 inline h-3 w-3" /> {row.EndDate || '-'}</td>
                                                    <td className="max-w-[180px] truncate px-3 py-3 font-mono text-[11px] text-slate-600" title={`${row.UTMParameters} ${row.PixelID}`}>{row.UTMParameters || row.PixelID || '-'}</td>
                                                    <td className="max-w-[240px] truncate px-3 py-3 text-slate-600" title={res?.errors?.join(', ')}>{res?.errors?.[0] || 'No live result yet'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </main>

                <aside className="flex min-h-0 flex-col border-l border-slate-300 bg-white">
                    <div className="border-b border-slate-300 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Inspector Panel</p>
                        <h3 className="mt-2 text-xl font-bold text-slate-950">{selectedRow?.CampaignName || 'No row selected'}</h3>
                        <p className="mt-1 text-sm text-slate-500">{selectedRow?.AdSetName || 'Upload a file to inspect rows'}</p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        {!selectedRow ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                파일 업로드 후 행을 선택하면 이 영역에 게이트 판정과 세부 필드가 표시됩니다.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`rounded-md border p-4 ${
                                    selectedResult?.status === 'FAIL' ? 'border-rose-200 bg-rose-50' :
                                        selectedResult?.status === 'WARNING' ? 'border-amber-200 bg-amber-50' :
                                            selectedResult?.status === 'PASS' ? 'border-emerald-200 bg-emerald-50' :
                                                'border-slate-200 bg-slate-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {selectedResult?.status === 'FAIL' ? <ShieldAlert className="h-5 w-5 text-rose-700" /> :
                                            selectedResult?.status === 'WARNING' ? <AlertCircle className="h-5 w-5 text-amber-700" /> :
                                                selectedResult?.status === 'PASS' ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> :
                                                    <ClipboardCheck className="h-5 w-5 text-slate-600" />}
                                        <p className="font-bold text-slate-950">
                                            {selectedResult ? `${statusCopy[selectedResult.status].label} launch decision` : 'Ready for live check'}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {selectedResult?.errors?.length ? selectedResult.errors.join(', ') : '매체 연동 검수를 실행하면 불일치 사유가 이곳에 누적됩니다.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        ['Platform', selectedRow.Platform || '-'],
                                        ['Account', selectedRow.AccountID || '-'],
                                        ['Currency', selectedRow.Currency || '-'],
                                        ['Buying', selectedRow.CampaignBuyingType || '-'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-md border border-slate-200 bg-white p-3">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                                            <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={value}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                <section className="rounded-md border border-slate-200">
                                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                                        <Layers3 className="h-4 w-4 text-cyan-700" />
                                        <p className="text-sm font-bold text-slate-900">Launch parameters</p>
                                    </div>
                                    <dl className="divide-y divide-slate-100 text-sm">
                                        {[
                                            ['Campaign daily', formatBudget(selectedRow.CampaignDailyBudget)],
                                            ['Campaign lifetime', formatBudget(selectedRow.CampaignLifetimeBudget)],
                                            ['Ad set daily', formatBudget(selectedRow.AdSetDailyBudget)],
                                            ['Ad set lifetime', formatBudget(selectedRow.AdSetLifetimeBudget)],
                                            ['Objective', selectedRow.CampaignObjective || '-'],
                                            ['Optimization', selectedRow.AdSetOptimizationGoal || '-'],
                                            ['Billing event', selectedRow.AdSetBillingEvent || '-'],
                                            ['Pixel/Event', selectedRow.PixelID || '-'],
                                            ['Custom event', selectedRow.CustomEventType || '-'],
                                        ].map(([label, value]) => (
                                            <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2 px-3 py-2">
                                                <dt className="text-slate-500">{label}</dt>
                                                <dd className="truncate font-medium text-slate-900" title={value}>{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </section>

                                <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Landing URL</p>
                                    {selectedRow.LandingURL ? (
                                        <a href={selectedRow.LandingURL} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-medium text-cyan-800 hover:underline">
                                            {selectedRow.LandingURL}
                                        </a>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-500">-</p>
                                    )}
                                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">UTM</p>
                                    <p className="mt-2 break-all font-mono text-xs text-slate-700">{selectedRow.UTMParameters || '-'}</p>
                                </section>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

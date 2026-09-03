'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Activity,
    History,
    Cable,
    Users,
    ShieldCheck,
    LogOut,
    UserCheck,
    Network,
    FolderGit2,
    RadioTower
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_MANAGER' | 'MEMBER' | 'GUEST';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    // Auth State
    const [userLabel, setUserLabel] = useState<string>('Loading...');
    const [role, setRole] = useState<Role>('GUEST');

    useEffect(() => {
        const fetchUser = async () => {
            const response = await fetch('/api/session/profile', {
                cache: 'no-store',
                credentials: 'same-origin',
            });
            if (!response.ok) return;
            const profile = await response.json();
            if (profile?.profile_present === true && profile?.role) {
                setUserLabel(profile.display_label || '로그인 계정');
                setRole(profile.role as Role);
            }
        };
        fetchUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh(); // will trigger layout's auth check and redirect to /login
    };

    const menuGroups = [
        {
            groupName: '서비스',
            items: [
                { name: '대시보드', href: '/active', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_MANAGER', 'MEMBER'] },
                { name: '실시간 검수 센터', href: '/audit', icon: Activity, roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_MANAGER', 'MEMBER'] },
                { name: '검수 히스토리', href: '/history', icon: History, roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_MANAGER', 'MEMBER'] },
            ]
        },
        {
            groupName: '매체 관리',
            items: [
                { name: '매체 API 연동 관리', href: '/settings/media', icon: Cable, roles: ['SUPER_ADMIN', 'ADMIN'] },
                { name: '매체 연결 팀 계정 관리', href: '/settings/accounts', icon: Network, roles: ['SUPER_ADMIN', 'ADMIN'] },
            ]
        },
        {
            groupName: '사용자 관리',
            items: [
                { name: '가입 승인 관리', href: '/settings/users', icon: UserCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
                { name: '팀 계정 관리', href: '/settings/teams', icon: FolderGit2, roles: ['SUPER_ADMIN', 'ADMIN'] },
                { name: '멤버 관리', href: '/settings/members', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_MANAGER'] },
            ]
        }
    ];

    const getRoleBadgeColor = () => {
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 'bg-amber-100 text-amber-900 border-amber-200';
        if (role === 'TEAM_MANAGER') return 'bg-cyan-100 text-cyan-900 border-cyan-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const roleLabel = {
        'SUPER_ADMIN': '슈퍼 관리자',
        'ADMIN': '관리자',
        'TEAM_MANAGER': '팀 관리자',
        'MEMBER': '팀원',
        'GUEST': 'GUEST (미승인)'
    }[role] || '알 수 없음';

    return (
        <aside className="fixed top-0 left-0 z-50 w-72 h-screen bg-[#111820] border-r border-slate-800 flex flex-col transition-all text-slate-100">
            {/* Brand */}
            <div className="h-20 flex items-center gap-3 px-5 border-b border-slate-800 bg-[#0c1218]">
                <div className="w-10 h-10 rounded-md bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">Ad-Sentinel</h1>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ops Console</p>
                </div>
            </div>

            <div className="mx-4 mt-4 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                    <RadioTower className="h-4 w-4" />
                    Launch Gate Monitoring
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">Prelaunch checks and media discrepancy review.</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-5 custom-scrollbar">
                {menuGroups.map((group, gIdx) => {
                    const visibleItems = group.items.filter(item => item.roles.includes(role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={gIdx} className="space-y-1">
                            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
                                {group.groupName}
                            </p>
                            {visibleItems.map((item) => {
                                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                            ? 'bg-cyan-400/12 text-cyan-100 ring-1 ring-cyan-400/25'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0c1218]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-slate-300 font-medium">
                            {userLabel.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden ml-1">
                        <p className="text-sm font-medium text-slate-100 truncate">
                            {userLabel}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-sm text-xs font-semibold border ${getRoleBadgeColor()}`}>
                            {roleLabel}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors border border-slate-800 hover:border-slate-700"
                >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                </button>
            </div>
        </aside>
    );
}

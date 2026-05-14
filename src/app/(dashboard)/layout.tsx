import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Ad-Sentinel Dashboard',
    description: 'Ad-Sentinel MVP for Campaign Auditing',
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Role Fetching
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = data?.role || 'GUEST';

    // Route Guard
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') || '';

    if (role === 'GUEST' && !pathname.startsWith('/sample')) {
        redirect('/sample');
    }
    if (role !== 'GUEST' && pathname.startsWith('/sample')) {
        redirect('/active');
    }

    return (
        <div className={`${inter.className} min-h-screen bg-[#eef1f3] text-slate-950 flex`}>
            <Sidebar />
            <main className="flex-1 ml-72">
                <div className="px-8 py-6 max-w-[1680px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

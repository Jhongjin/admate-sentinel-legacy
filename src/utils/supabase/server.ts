import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import {
    SENTINEL_LOCAL_AUTH_FIXTURE_HEADER,
    isSentinelLocalAuthFixtureEnabled,
    sentinelLocalAuthFixtureHeaders,
} from './local-auth-fixture'

export async function createClient() {
    if (isSentinelLocalAuthFixtureEnabled()) {
        return createLocalAuthFixtureClient()
    }

    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

async function createLocalAuthFixtureClient() {
    const headerList = await headers()
    const fixtureName = headerList.get(SENTINEL_LOCAL_AUTH_FIXTURE_HEADER)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const fixtureHeaders = sentinelLocalAuthFixtureHeaders(fixtureName)

    const client = createSupabaseClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
            global: {
                headers: fixtureHeaders,
            },
        }
    )

    const localAuth = client.auth as any
    localAuth.getUser = async () => {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            cache: 'no-store',
            headers: fixtureHeaders,
        })

        if (response.status === 401) {
            return {
                data: { user: null },
                error: null,
            }
        }

        if (!response.ok) {
            return {
                data: { user: null },
                error: null,
            }
        }

        return {
            data: { user: await response.json() },
            error: null,
        }
    }

    return client
}

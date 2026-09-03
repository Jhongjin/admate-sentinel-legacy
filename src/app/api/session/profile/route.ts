import { NextResponse } from 'next/server';
import {
    buildBrowserSafeSentinelProfile,
    resolveSentinelActor,
} from '@/lib/auth/sentinel-profile-boundary';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
    try {
        const result = await resolveSentinelActor({ allowGuestWithoutOrganization: true });

        if (result.ok) {
            return NextResponse.json(buildBrowserSafeSentinelProfile(result.actor), {
                headers: NO_STORE_HEADERS,
            });
        }

        if (result.reason === 'session_missing') {
            return NextResponse.json(
                { authenticated: false, profile_present: false, organization_membership: 'unknown' },
                { status: 401, headers: NO_STORE_HEADERS },
            );
        }

        if (result.guest) {
            return NextResponse.json(buildBrowserSafeSentinelProfile(result.guest), {
                headers: NO_STORE_HEADERS,
            });
        }

        return NextResponse.json(
            { authenticated: true, profile_present: false, organization_membership: 'unknown' },
            { status: 403, headers: NO_STORE_HEADERS },
        );
    } catch {
        return NextResponse.json(
            { authenticated: true, profile_present: false, organization_membership: 'unknown' },
            { status: 503, headers: NO_STORE_HEADERS },
        );
    }
}

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { hasSentinelRole, resolveSentinelActor } from '@/lib/auth/sentinel-profile-boundary';

type PlatformSecretUpdate = {
    platform: string;
    app_id: string;
    business_id: string | null;
    updated_at: string;
    app_secret?: string;
    access_token?: string;
    refresh_token?: string;
};

type PlatformSecrets = {
    app_id?: string | null;
    app_secret?: string | null;
    access_token?: string | null;
    business_id?: string | null;
    refresh_token?: string | null;
};

// Reusable auth check
async function requireAdmin() {
    const supabase = await createClient();
    const actorResolution = await resolveSentinelActor({ supabase });
    if (!actorResolution.ok) throw new Error('Unauthorized');
    if (!hasSentinelRole(actorResolution.actor, ['SUPER_ADMIN', 'ADMIN'])) {
        throw new Error('Forbidden');
    }
    return supabase;
}

export async function savePlatformSettingsAction(formData: FormData): Promise<void> {
    const supabase = await requireAdmin();
    const platform = String(formData.get('platform') || '');
    const appId = String(formData.get('appId') || '');
    const appSecret = String(formData.get('appSecret') || '');
    const accessToken = String(formData.get('accessToken') || '');
    const businessId = String(formData.get('businessId') || '');
    const refreshToken = String(formData.get('refreshToken') || '');

    const payload: PlatformSecretUpdate = {
        platform,
        app_id: appId,
        business_id: businessId || null,
        updated_at: new Date().toISOString()
    };

    // Blank secret fields mean "keep the existing stored value".
    if (appSecret.trim()) payload.app_secret = appSecret.trim();
    if (accessToken.trim()) payload.access_token = accessToken.trim();
    if (refreshToken.trim()) payload.refresh_token = refreshToken.trim();

    const { data: existingSetting } = await supabase
        .from('platform_settings')
        .select('platform')
        .eq('platform', platform)
        .maybeSingle();

    const { error } = existingSetting
        ? await supabase.from('platform_settings').update(payload).eq('platform', platform)
        : await supabase.from('platform_settings').insert(payload);

    if (error) {
        console.error('Platform settings update failed', { platform, code: error.code });
        return;
    }
    revalidatePath('/settings/media');
}

export async function testMetaConnectionAction(): Promise<{ valid: boolean; message: string }> {
    const supabase = await requireAdmin();
    const { data: metaSettings } = await supabase
        .from('platform_settings')
        .select('access_token')
        .eq('platform', 'META')
        .single();

    const token = metaSettings?.access_token;
    if (!token) return { valid: false, message: '저장된 Meta 인증 정보가 없습니다.' };

    // Server execution for security
    try {
        const res = await fetch('https://graph.facebook.com/v19.0/me', {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            console.error('Meta connection test failed', { status: res.status });
            return { valid: false, message: 'Meta 연결에 실패했습니다. 저장된 인증 정보를 확인해주세요.' };
        }

        return { valid: true, message: '정상 연결 성공' };
    } catch {
        console.error('Meta connection test failed');
        return { valid: false, message: 'Meta 연결 테스트 중 서버 오류가 발생했습니다.' };
    }
}

export async function testGoogleConnectionAction(): Promise<{ valid: boolean; message: string }> {
    const supabase = await requireAdmin();
    const { data: googleSettings } = (await supabase
        .from('platform_settings')
        .select('app_id, app_secret, refresh_token, access_token, business_id')
        .eq('platform', 'GOOGLE_ADS')
        .single()) as { data: PlatformSecrets | null };

    const appId = googleSettings?.app_id;
    const appSecret = googleSettings?.app_secret;
    const refreshToken = googleSettings?.refresh_token;
    const developerToken = googleSettings?.access_token;
    const businessId = googleSettings?.business_id;

    if (!appId || !appSecret || !refreshToken || !developerToken) {
        return { valid: false, message: 'Google 연동에 필요한 필수 정보(Client ID, Secret, Refresh Token, Developer Token)가 부족합니다.' };
    }

    try {
        // 1. Get short-lived access token using refresh_token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: appId.trim(),
                client_secret: appSecret.trim(),
                refresh_token: refreshToken.trim(),
                grant_type: 'refresh_token',
            }).toString(),
        });

        const tokenText = await tokenRes.text();
        let tokenData;
        try {
            tokenData = JSON.parse(tokenText);
        } catch {
            console.error('Google OAuth token response parse failed', { status: tokenRes.status });
            return { valid: false, message: 'Google 인증 응답을 처리하지 못했습니다.' };
        }

        if (!tokenRes.ok || !tokenData.access_token) {
            console.error('Google OAuth token exchange failed', { status: tokenRes.status });
            return { valid: false, message: 'Google Access Token 발급에 실패했습니다. 저장된 인증 정보를 확인해주세요.' };
        }

        const currentAccessToken = tokenData.access_token;
        const adsHeaders: Record<string, string> = {
            'Authorization': `Bearer ${currentAccessToken}`,
            'developer-token': developerToken.trim(),
        };

        if (businessId) {
            adsHeaders['login-customer-id'] = businessId.replace(/[^0-9]/g, '');
        }

        // 2. Ping Google Ads API (List Accessible Customers)
        const adsRes = await fetch('https://googleads.googleapis.com/v18/customers:listAccessibleCustomers', {
            method: 'GET',
            cache: 'no-store',
            headers: adsHeaders,
        });

        const adsText = await adsRes.text();
        let adsData;
        try {
            adsData = JSON.parse(adsText);
        } catch {
            console.error('Google Ads response parse failed', { status: adsRes.status });
            return { valid: false, message: 'Google Ads API 응답을 처리하지 못했습니다.' };
        }

        if (!adsRes.ok || adsData.error) {
            console.error('Google Ads connection test failed', { status: adsRes.status });
            return { valid: false, message: 'Google Ads API 연결에 실패했습니다. 저장된 인증 정보를 확인해주세요.' };
        }

        // Extract customer Resource Names (e.g. customers/1234567890)
        const customers = adsData.resourceNames || [];
        if (customers.length === 0) {
            return { valid: true, message: '인증은 성공했으나 접근 가능한 Google Ads 계정이 없습니다.' };
        }

        return { valid: true, message: `정상 연결 성공. 접근 가능 계정 수: ${customers.length}` };
    } catch {
        console.error('Google connection test failed');
        return { valid: false, message: 'Google 연결 테스트 중 서버 오류가 발생했습니다.' };
    }
}

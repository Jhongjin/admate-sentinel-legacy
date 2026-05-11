export const SENTINEL_LOCAL_AUTH_FIXTURE_HEADER = 'x-sentinel-fixture';

export function isSentinelLocalAuthFixtureEnabled() {
    return (
        process.env.SENTINEL_LOCAL_AUTH_FIXTURE === '1' &&
        isLoopbackUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    );
}

export function sentinelLocalAuthFixtureHeaders(fixtureName: string | null): Record<string, string> {
    if (!fixtureName) return {};

    return {
        Authorization: `Bearer sentinel-local-fixture:${fixtureName}`,
        [SENTINEL_LOCAL_AUTH_FIXTURE_HEADER]: fixtureName,
    };
}

function isLoopbackUrl(value: string | undefined) {
    if (!value) return false;

    try {
        const url = new URL(value);
        return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    } catch {
        return false;
    }
}

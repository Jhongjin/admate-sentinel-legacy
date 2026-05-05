'use client';

import { useState } from 'react';
import { testGoogleConnectionAction } from './actions';
import { RefreshCw } from 'lucide-react';

export default function TestGoogleButton() {
    const [loading, setLoading] = useState(false);

    const handleTest = async () => {
        setLoading(true);
        try {
            const result = await testGoogleConnectionAction();
            if (result.valid) {
                alert(result.message);
            } else {
                alert(`❌ 연결 실패\n내용: ${result.message}`);
            }
        } catch {
            alert('알 수 없는 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleTest}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '테스트 중...' : '연동 테스트 (즉시 확인)'}
        </button>
    );
}

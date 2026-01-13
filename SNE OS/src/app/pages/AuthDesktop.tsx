import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

type Status = 'idle' | 'connecting' | 'signing' | 'redirecting' | 'error' | 'success';

export function AuthDesktop() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [manualLink, setManualLink] = useState<string | null>(null);

    const state = searchParams.get('state') || '';
    const app = searchParams.get('app') || '';

    async function redirectToDesktop() {
        setStatus('redirecting');
        setError(null);
        setManualLink(null);

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('sne_token') || '';

            const res = await fetch(`${API_URL}/api/auth/desktop-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: 'include',
                body: JSON.stringify({ state })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to generate code');
            }

            const { code, state: returnState } = await res.json();
            const deepLink = `sneradar://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(returnState)}`;
            setManualLink(deepLink);

            window.location.href = deepLink;
            setTimeout(() => setStatus('success'), 1500);
        } catch (err: any) {
            setError(err?.message || 'Erro ao gerar código');
            setStatus('error');
        }
    }

    async function handleConnect() {
        setStatus('connecting');
        setError(null);

        // TODO: Integrate with real wallet connection from AuthProvider
        // For now, redirect to desktop-code if already authenticated
        const token = localStorage.getItem('auth_token') || localStorage.getItem('sne_token');
        if (token) {
            await redirectToDesktop();
        } else {
            setError('Por favor, conecte sua wallet primeiro usando o botão no canto superior direito.');
            setStatus('error');
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000'
        }}>
            <div style={{
                backgroundColor: '#18181b',
                padding: '2rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#22c55e' }}>SNE Radar</h1>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>Desktop Authentication</p>
                </div>

                {status === 'idle' && (
                    <>
                        <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                            Conecte sua wallet para autorizar o Desktop App
                        </p>
                        <button
                            onClick={handleConnect}
                            style={{
                                width: '100%',
                                backgroundColor: '#22c55e',
                                color: '#000',
                                fontWeight: 'bold',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                        >
                            Autorizar Desktop
                        </button>
                    </>
                )}

                {status === 'connecting' && (
                    <div style={{ padding: '2rem 0' }}>
                        <div style={{
                            width: '2rem',
                            height: '2rem',
                            border: '2px solid #22c55e',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem'
                        }} />
                        <p style={{ color: '#facc15' }}>Verificando autenticação...</p>
                    </div>
                )}

                {status === 'redirecting' && (
                    <div style={{ padding: '2rem 0' }}>
                        <div style={{
                            width: '2rem',
                            height: '2rem',
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem',
                            animation: 'bounce 1s infinite'
                        }}>
                            <span style={{ color: '#22c55e' }}>🚀</span>
                        </div>
                        <p style={{ color: '#22c55e', marginBottom: '1rem' }}>Abrindo SNE Radar Desktop...</p>
                        {manualLink && (
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                Se não abrir automaticamente:{' '}
                                <a href={manualLink} style={{ color: '#22c55e', textDecoration: 'underline' }}>
                                    clique aqui
                                </a>
                            </p>
                        )}
                    </div>
                )}

                {status === 'success' && (
                    <div style={{ padding: '2rem 0' }}>
                        <div style={{
                            width: '3rem',
                            height: '3rem',
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <span style={{ color: '#22c55e', fontSize: '1.5rem' }}>✓</span>
                        </div>
                        <p style={{ color: '#22c55e', marginBottom: '0.75rem' }}>Autenticação enviada para o Desktop!</p>
                        {manualLink && (
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                Não abriu?{' '}
                                <a href={manualLink} style={{ color: '#22c55e', textDecoration: 'underline' }}>
                                    Abrir SNE Radar
                                </a>
                            </p>
                        )}
                        <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '1rem' }}>Você pode fechar esta aba.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ padding: '2rem 0' }}>
                        <div style={{
                            width: '3rem',
                            height: '3rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <span style={{ color: '#ef4444', fontSize: '1.5rem' }}>✗</span>
                        </div>
                        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
                        <button
                            onClick={() => { setStatus('idle'); setError(null); }}
                            style={{
                                color: '#22c55e',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </div>
    );
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'

const API_URL = import.meta.env.VITE_API_URL || ''

type Status = 'idle' | 'connecting' | 'signing' | 'redirecting' | 'error' | 'success'

export default function AuthDesktop() {
    const [searchParams] = useSearchParams()
    const { isAuthenticated, connect, signIn } = useWallet()

    const [status, setStatus] = useState<Status>('idle')
    const [error, setError] = useState<string | null>(null)
    const [manualLink, setManualLink] = useState<string | null>(null)

    const state = searchParams.get('state') || ''
    const app = searchParams.get('app') || '' // 'desktop'

    useEffect(() => {
        if (isAuthenticated && app === 'desktop') {
            redirectToDesktop()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, app])

    async function redirectToDesktop() {
        setStatus('redirecting')
        setError(null)
        setManualLink(null)

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('sne_token') || ''

            const res = await fetch(`${API_URL}/api/auth/desktop-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                // importante se sua sessão web estiver em cookie (snelabs.space -> api.snelabs.space)
                credentials: 'include',
                body: JSON.stringify({ state })
            })

            if (!res.ok) {
                const msg = await safeError(res)
                throw new Error(msg || 'Failed to generate code')
            }

            const { code, state: returnState } = await res.json()

            const deepLink = `sneradar://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(returnState)}`
            setManualLink(deepLink)

            // tenta abrir o app
            window.location.href = deepLink

            // fallback visual
            setTimeout(() => setStatus('success'), 1500)
        } catch (err: any) {
            setError(err?.message || 'Erro ao gerar código')
            setStatus('error')
        }
    }

    async function handleConnect() {
        setStatus('connecting')
        setError(null)

        try {
            await connect()
            setStatus('signing')
            await signIn()
            // isAuthenticated muda e o useEffect chama redirectToDesktop()
        } catch (err: any) {
            setError(err?.message || 'Erro ao conectar')
            setStatus('error')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="bg-zinc-900 p-8 rounded-lg border border-green-500/30 max-w-md w-full text-center">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-green-400">SNE Radar</h1>
                    <p className="text-gray-500 text-sm mt-1">Desktop Authentication</p>
                </div>

                {status === 'idle' && (
                    <>
                        <p className="text-gray-400 mb-6">
                            Conecte sua wallet para autorizar o Desktop App
                        </p>
                        <button
                            onClick={handleConnect}
                            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded transition-colors"
                        >
                            Conectar Wallet
                        </button>
                    </>
                )}

                {status === 'connecting' && (
                    <div className="py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-yellow-400 animate-pulse">Conectando wallet...</p>
                    </div>
                )}

                {status === 'signing' && (
                    <div className="py-8">
                        <div className="animate-pulse w-8 h-8 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-green-400">✍️</span>
                        </div>
                        <p className="text-yellow-400 animate-pulse">Assine a mensagem na sua wallet...</p>
                    </div>
                )}

                {status === 'redirecting' && (
                    <div className="py-8">
                        <div className="animate-bounce w-8 h-8 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-green-400">🚀</span>
                        </div>
                        <p className="text-green-400 animate-pulse mb-4">Abrindo SNE Radar Desktop...</p>
                        {manualLink && (
                            <p className="text-gray-500 text-sm">
                                Se não abrir automaticamente:{' '}
                                <a className="text-green-400 underline" href={manualLink}>
                                    clique aqui
                                </a>
                            </p>
                        )}
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-green-400 text-2xl">✓</span>
                        </div>
                        <p className="text-green-400 mb-3">Autenticação enviada para o Desktop!</p>
                        {manualLink && (
                            <p className="text-gray-500 text-sm">
                                Não abriu?{' '}
                                <a className="text-green-400 underline" href={manualLink}>
                                    Abrir SNE Radar
                                </a>
                            </p>
                        )}
                        <p className="text-gray-600 text-xs mt-4">Você pode fechar esta aba.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-red-400 text-2xl">✗</span>
                        </div>
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={() => {
                                setStatus('idle')
                                setError(null)
                            }}
                            className="text-green-400 underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

async function safeError(res: Response) {
    try {
        const data = await res.json()
        return data?.error || data?.message || ''
    } catch {
        return ''
    }
}

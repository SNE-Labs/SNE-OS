import { useAccount, useConnect, useSignMessage, useDisconnect } from 'wagmi'
import { toast } from 'sonner'
import { SiweMessage } from 'siwe'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '../services'

const SIWE_DOMAIN = import.meta.env.VITE_SIWE_DOMAIN || 'radar.snelabs.space'
const SIWE_ORIGIN = import.meta.env.VITE_SIWE_ORIGIN || 'https://radar.snelabs.space'
const CHAIN_ID = 534351 // Scroll Sepolia

export function useWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [tier, setTier] = useState<'free' | 'premium' | 'pro'>('free')
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Verificar autenticação ao montar e conectar wallet
  useEffect(() => {
    const initializeAuth = async () => {
      // Primeiro tentar restaurar sessão se houver token salvo
      const savedToken = localStorage.getItem('auth_token')
      if (savedToken && !isAuthenticated) {
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
        await checkAuth()
      }
      // Só verificar wallet conectada se NÃO houver token (evitar chamadas desnecessárias)
      else if (isConnected && address && !isAuthenticated && !savedToken) {
        // Wallet conectada mas sem token - verificar se já está autenticado no backend
        await checkAuth()
      }
    }

    initializeAuth()
  }, [isConnected, address, isAuthenticated])

  // Capturar erros globais de WalletConnect
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason

      // Verificar se é erro do WalletConnect/relayer
      if (error?.message?.includes('relayer') ||
          error?.message?.includes('socket error') ||
          error?.message?.includes('Connection interrupted') ||
          error?.message?.includes('walletconnect')) {

        console.error('WalletConnect relayer error:', error)
        toast.error('Conexão instável. Tente reconectar sua wallet.')

        // Impedir que apareça como unhandled rejection
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const checkAuth = async () => {
    if (!address) return false

    try {
      // Verificar se há token salvo
      const savedToken = localStorage.getItem('auth_token')
      if (!savedToken) {
        // Sem token salvo - não está autenticado
        setIsAuthenticated(false)
        return false
      }

      // Configurar axios com o token salvo
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`

      const response = await api.get('/api/auth/verify')

      if (response.status === 200) {
        const { tier: verifiedTier } = response.data
        setTier(verifiedTier || 'free')
        setIsAuthenticated(true)
        return true
      }
    } catch (error: any) {
      // Tratar diferentes tipos de erro adequadamente
      if (error.response?.status === 401) {
        // Token inválido/expirado - limpar e não logar como erro grave
        console.log('Token inválido ou expirado - usuário não autenticado')
        localStorage.removeItem('auth_token')
        delete api.defaults.headers.common['Authorization']
      } else {
        // Outros erros (rede, servidor, etc) - logar como warning
        console.warn('Auth check failed:', error.message)
      }
    }

    setIsAuthenticated(false)
    return false
  }

  const signIn = async () => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    try {
      // 1. Obter nonce
      const nonceRes = await api.post('/api/auth/nonce', { address })

      if (nonceRes.status !== 200) {
        throw new Error('Failed to get nonce')
      }

      const { nonce } = nonceRes.data

      // 2. Criar mensagem SIWE
      const message = new SiweMessage({
        domain: SIWE_DOMAIN,
        address,
        statement: 'Sign in to SNE Radar',
        uri: SIWE_ORIGIN,
        version: '1',
        chainId: CHAIN_ID,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
      })

      const messageToSign = message.prepareMessage()

      // 3. Solicitar assinatura
      const signature = await signMessageAsync({ message: messageToSign })

      // 4. Autenticar via backend
      const authRes = await api.post('/api/auth/siwe', {
        message: messageToSign,
        signature,
      })

      if (authRes.status !== 200) {
        throw new Error(authRes.data?.error || 'Authentication failed')
      }

      const { token, tier } = authRes.data

      // Salvar token JWT
      localStorage.setItem('auth_token', token)

      // Configurar axios para enviar token automaticamente
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // Atualizar estado local
      setTier(tier || 'free')
      setIsAuthenticated(true)

      // Garantir que o estado esteja sincronizado chamando verify
      await checkAuth()

      toast.success('Autenticado com sucesso!')
      return { token, tier }
    } catch (error: any) {
      console.error('SIWE error:', error)
      toast.error(error.message || 'Erro ao autenticar')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    // Desconectar wallet
    disconnect()

    // Fazer logout no backend
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }

    // Limpar token e headers
    localStorage.removeItem('auth_token')
    delete api.defaults.headers.common['Authorization']

    setTier('free')
    setIsAuthenticated(false)
    toast.info('Desconectado')
  }

  const connectWallet = async (connectorId?: string) => {
    try {
      const connector = connectorId
        ? connectors.find((c) => c.id === connectorId)
        : connectors[0] // WalletConnect por padrão

      if (!connector) {
        throw new Error('Connector not found')
      }

      // Capturar erros de WebSocket/WalletConnect
      try {
        connect({ connector })
      } catch (connectError: any) {
        console.error('WalletConnect connection error:', connectError)

        // Tratar erros específicos do WalletConnect
        if (connectError.message?.includes('socket error') ||
            connectError.message?.includes('Connection interrupted') ||
            connectError.message?.includes('relayer')) {
          throw new Error('Problema de conexão com WalletConnect. Verifique sua internet e tente novamente.')
        }

        throw connectError
      }

      toast.success('Wallet conectada!')

      // Após conectar, verificar se já está autenticado
      // Nota: checkAuth será chamado pelo useEffect quando isConnected mudar
    } catch (error: any) {
      console.error('Wallet connection error:', error)

      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao conectar wallet'

      if (error.message?.includes('User rejected')) {
        errorMessage = 'Conexão rejeitada pelo usuário'
      } else if (error.message?.includes('MetaMask extension not found')) {
        errorMessage = 'MetaMask não encontrada. Instale a extensão MetaMask.'
      } else if (error.message?.includes('socket error') || error.message?.includes('relayer')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.'
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
      throw error
    }
  }

  return {
    address,
    isConnected,
    isAuthenticated,
    tier,
    loading,
    connect: connectWallet,
    disconnect: signOut,
    signIn,
    checkAuth,
    connectors,
  }
}


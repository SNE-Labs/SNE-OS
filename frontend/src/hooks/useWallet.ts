import { useAccount, useConnect, useSignMessage, useDisconnect } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import api from '../services/api'

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
    if (isConnected && address && !isAuthenticated) {
      // Wallet conectada mas não autenticada - verificar se já tem sessão válida
      checkAuth()
    }
  }, [isConnected, address, isAuthenticated])

  const checkAuth = async () => {
    if (!address) return false

    try {
      const response = await api.get('/api/auth/verify')

      if (response.status === 200) {
        const { tier: verifiedTier } = response.data
        setTier(verifiedTier || 'free')
        setIsAuthenticated(true)
        return true
      }
    } catch (error) {
      console.error('Auth check failed:', error)
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

      const { license } = authRes.data

      // Atualizar estado local
      setTier(license.tier || 'free')
      setIsAuthenticated(true)

      // Garantir que o estado esteja sincronizado chamando verify
      await checkAuth()

      toast.success('Autenticado com sucesso!')
      return { license }
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

      await connect({ connector })
      toast.success('Wallet conectada!')

      // Após conectar, verificar se já está autenticado
      await checkAuth()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar wallet')
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


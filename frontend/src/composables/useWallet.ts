import { ref, computed } from 'vue'
import { createConfig, getAccount, connect, disconnect, signMessage, http } from '@wagmi/core'
import { walletConnect } from '@wagmi/connectors/walletConnect'
import { injected } from '@wagmi/connectors/injected'
import { metaMask } from '@wagmi/connectors/metaMask'
import { SiweMessage } from 'siwe'
import { scrollSepolia } from 'viem/chains'

// Configuração Wagmi
// Project ID do WalletConnect (pode ser sobrescrito por variável de ambiente)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3fcc6bba6f1de962d911bb5b5c3dba68'

export const wagmiConfig = createConfig({
  chains: [scrollSepolia],
  connectors: [
    walletConnect({
      projectId: projectId,
    }),
    injected(),
    metaMask()
  ],
  transports: {
    [scrollSepolia.id]: http(),
  },
})

// Estado reativo
export const address = ref<string | null>(null)
export const isConnected = ref(false)
export const tier = ref<'free' | 'premium' | 'pro'>('free')
export const isLoading = ref(false)
export const error = ref<string | null>(null)

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const SIWE_DOMAIN = import.meta.env.VITE_SIWE_DOMAIN || 'radar.snelabs.space'
const SIWE_ORIGIN = import.meta.env.VITE_SIWE_ORIGIN || window.location.origin

// Conectar wallet
export const connectWallet = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const account = getAccount(wagmiConfig)
    
    if (!account.isConnected) {
      await connect(wagmiConfig, { connector: injected() })
    }
    
    const newAccount = getAccount(wagmiConfig)
    if (newAccount.address) {
      address.value = newAccount.address
      isConnected.value = true
    }
  } catch (err: any) {
    error.value = err.message
    throw err
  } finally {
    isLoading.value = false
  }
}

// Desconectar wallet
export const disconnectWallet = async () => {
  await disconnect(wagmiConfig)
  address.value = null
  isConnected.value = false
  tier.value = 'free'
}

// Assinar mensagem (via wagmi core - correto)
const signMessageWithWallet = async (message: string) => {
  if (!address.value) {
    throw new Error('Wallet not connected')
  }
  
  // ✅ Usar signMessage do @wagmi/core (não publicClient)
  const signature = await signMessage(wagmiConfig, {
    message: message as `0x${string}` | string
  })
  
  return signature
}

// SIWE (Sign-In with Ethereum)
export const signIn = async () => {
  if (!address.value) {
    throw new Error('Wallet not connected')
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    // 1. Obter nonce do backend
    // ✅ credentials: 'include' para garantir cookies em cross-origin
    const nonceResponse = await fetch(
      `${API_BASE}/api/auth/nonce`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ✅ OBRIGATÓRIO: permite cookies em cross-origin
        body: JSON.stringify({ address: address.value })
      }
    )
    
    const { nonce } = await nonceResponse.json()
    
    // 2. Criar mensagem SIWE (EIP-4361)
    const message = new SiweMessage({
      domain: SIWE_DOMAIN,              // Domain binding
      address: address.value,
      statement: 'Sign in to SNE Radar',
      uri: SIWE_ORIGIN,
      version: '1',
      chainId: 534351,                  // Scroll Sepolia
      nonce: nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min
    })
    
    const messageToSign = message.prepareMessage()
    
    // 3. Assinar mensagem com wallet
    const signature = await signMessageWithWallet(messageToSign)
    
    // 4. Autenticar via backend (SIWE)
    // ✅ credentials: 'include' é OBRIGATÓRIO para cookie HttpOnly em cross-origin
    const authResponse = await fetch(
      `${API_BASE}/api/auth/siwe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // ✅ OBRIGATÓRIO: permite Set-Cookie em cross-origin
        body: JSON.stringify({
          message: messageToSign,
          signature
        })
      }
    )
    
    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      throw new Error(errorData.error || 'Authentication failed')
    }
    
    const result = await authResponse.json()
    
    // 5. Atualizar tier
    if (result.license?.tier) {
      tier.value = result.license.tier
    }
    
    return result
  } catch (err: any) {
    error.value = err.message
    throw err
  } finally {
    isLoading.value = false
  }
}

// Verificar token/sessão
export const verifySession = async () => {
  try {
    const response = await fetch(
      `${API_BASE}/api/auth/verify`,
      {
        method: 'GET',
        credentials: 'include'  // ✅ Inclui cookies HttpOnly
      }
    )
    
    if (!response.ok) {
      return false
    }
    
    const data = await response.json()
    
    if (data.valid && data.address) {
      address.value = data.address
      tier.value = data.tier || 'free'
      isConnected.value = true
      return true
    }
    
    return false
  } catch (err) {
    return false
  }
}

// Logout
export const logout = async () => {
  try {
    await fetch(
      `${API_BASE}/api/auth/logout`,
      {
        method: 'POST',
        credentials: 'include'
      }
    )
  } catch (err) {
    // Ignorar erros no logout
  } finally {
    await disconnectWallet()
  }
}

// Computed
export const isAuthenticated = computed(() => isConnected.value && address.value !== null)

// Export composable
export function useWallet() {
  return {
    address,
    isConnected,
    tier,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    signIn,
    verifySession,
    logout,
    isAuthenticated
  }
}


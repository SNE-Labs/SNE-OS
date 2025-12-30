<template>
  <div class="layout min-h-screen bg-terminal-bg">
    <!-- Header -->
    <header class="border-b border-terminal-border bg-dark-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <router-link to="/" class="flex items-center gap-3">
              <div class="w-10 h-10 border-2 border-terminal-accent rounded flex items-center justify-center">
                <span class="text-terminal-accent font-mono font-bold text-xl">SNE</span>
              </div>
              <div>
                <h1 class="text-xl font-mono font-bold text-terminal-fg">SNE Radar</h1>
                <p class="text-xs text-gray-500">Technical Analysis</p>
              </div>
            </router-link>
            
            <nav class="hidden md:flex items-center gap-6 ml-8">
              <router-link
                to="/dashboard"
                class="text-sm font-mono uppercase tracking-wider text-gray-400 hover:text-terminal-accent transition-colors"
                active-class="text-terminal-accent"
              >
                Dashboard
              </router-link>
              <router-link
                to="/chart"
                class="text-sm font-mono uppercase tracking-wider text-gray-400 hover:text-terminal-accent transition-colors"
                active-class="text-terminal-accent"
              >
                Charts
              </router-link>
              <router-link
                to="/analysis"
                class="text-sm font-mono uppercase tracking-wider text-gray-400 hover:text-terminal-accent transition-colors"
                active-class="text-terminal-accent"
              >
                Analysis
              </router-link>
            </nav>
          </div>
          
          <div class="flex items-center gap-4">
            <button
              v-if="!isConnected"
              @click="connectWallet"
              class="terminal-button primary sm"
            >
              Connect Wallet
            </button>
            <div v-else class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-xs text-gray-500 font-mono">Tier</div>
                <div class="text-sm font-mono text-terminal-accent uppercase">{{ tier }}</div>
              </div>
              <div class="w-8 h-8 rounded-full border border-terminal-accent flex items-center justify-center">
                <span class="text-xs font-mono text-terminal-accent">
                  {{ address?.slice(0, 4) }}...{{ address?.slice(-4) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <slot />
    </main>
    
    <!-- Footer -->
    <footer class="border-t border-terminal-border mt-auto py-6">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-center justify-between text-sm text-gray-500 font-mono">
          <div>
            <span>SNE Radar v1.0.0</span>
            <span class="mx-2">•</span>
            <span>Powered by SNE Labs</span>
          </div>
          <div class="flex items-center gap-4">
            <a href="https://snelabs.space" target="_blank" class="hover:text-terminal-accent transition-colors">
              SNE Vault
            </a>
            <a href="https://pass.snelabs.space" target="_blank" class="hover:text-terminal-accent transition-colors">
              SNE Pass
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Estado do wallet com valores padrão seguros
const address = ref<string | null>(null)
const isConnected = ref(false)
const tier = ref<'free' | 'premium' | 'pro'>('free')

// Função de conexão segura
const connectWallet = async () => {
  try {
    // Importar dinamicamente para evitar erro em SSR
    const { useWallet } = await import('@/composables/useWallet')
    const wallet = useWallet()
    await wallet.connectWallet()
    address.value = wallet.address.value
    isConnected.value = wallet.isConnected.value
    tier.value = wallet.tier.value
  } catch (err) {
    console.error('Failed to connect wallet:', err)
  }
}

// Tentar carregar estado do wallet se disponível
if (typeof window !== 'undefined') {
  import('@/composables/useWallet')
    .then(({ useWallet }) => {
      const wallet = useWallet()
      address.value = wallet.address.value
      isConnected.value = wallet.isConnected.value
      tier.value = wallet.tier.value
    })
    .catch((err) => {
      console.warn('Wallet not available:', err)
      // Continuar sem wallet
    })
}
</script>

<style scoped>
.router-link-active {
  position: relative;
}

.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--terminal-accent);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}
</style>


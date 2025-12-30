<template>
  <div class="layout min-h-screen bg-sne">
    <!-- Navigation -->
    <nav
      role="navigation"
      aria-label="Main navigation"
      class="fixed top-0 left-0 right-0 z-50 border-b"
      style="background-color: var(--sne-bg); border-color: var(--border)"
    >
      <div class="max-w-[1440px] mx-auto px-6 lg:px-24">
        <div class="flex items-center justify-between h-16">
          <!-- Brand -->
          <router-link
            to="/"
            class="flex items-center gap-2 group"
            aria-label="SNE Radar - Home"
          >
            <span
              class="font-mono tracking-tight transition-colors"
              style="color: var(--sne-text-primary); font-weight: 700; font-size: 1rem"
            >
              SNE Radar
            </span>
          </router-link>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-1">
            <router-link
              to="/dashboard"
              class="px-4 py-2 rounded transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style="color: var(--sne-text-secondary)"
              active-class="text-accent"
            >
              Dashboard
            </router-link>
            <router-link
              to="/chart"
              class="px-4 py-2 rounded transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style="color: var(--sne-text-secondary)"
              active-class="text-accent"
            >
              Charts
            </router-link>
            <router-link
              to="/analysis"
              class="px-4 py-2 rounded transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style="color: var(--sne-text-secondary)"
              active-class="text-accent"
            >
              Analysis
            </router-link>
          </div>

          <!-- Actions -->
          <div class="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/SNE-Labs"
              target="_blank"
              rel="noopener noreferrer"
              class="p-2 rounded transition-colors"
              style="color: var(--sne-text-secondary)"
              aria-label="GitHub"
            >
              <Github class="w-5 h-5" />
            </a>

            <button
              v-if="!isConnected"
              @click="connectWallet"
              class="btn-primary px-4 py-2"
            >
              Conectar Carteira
            </button>
            <div v-else class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-xs font-mono" style="color: var(--sne-text-secondary)">Tier</div>
                <div class="text-sm font-mono uppercase" style="color: var(--sne-accent)">{{ tier }}</div>
              </div>
              <div
                class="w-8 h-8 rounded-full border flex items-center justify-center"
                style="border-color: var(--sne-accent)"
              >
                <span class="text-xs font-mono text-accent">
                  {{ address?.slice(0, 4) }}...{{ address?.slice(-4) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Mobile Toggle -->
          <button
            class="md:hidden p-2"
            @click="mobileOpen = !mobileOpen"
            :aria-expanded="mobileOpen"
            aria-controls="sne-mobile-menu"
            :aria-label="mobileOpen ? 'Fechar menu' : 'Abrir menu'"
            style="color: var(--sne-text-primary)"
          >
            <Menu v-if="!mobileOpen" class="w-6 h-6" />
            <X v-else class="w-6 h-6" />
          </button>
        </div>

        <!-- Mobile Menu -->
        <div
          v-if="mobileOpen"
          id="sne-mobile-menu"
          class="md:hidden py-4 border-t"
          style="border-color: var(--border)"
        >
          <router-link
            to="/dashboard"
            @click="mobileOpen = false"
            class="flex items-center gap-2 px-4 py-3 transition-colors"
            style="color: var(--sne-text-secondary)"
          >
            Dashboard
          </router-link>
          <router-link
            to="/chart"
            @click="mobileOpen = false"
            class="flex items-center gap-2 px-4 py-3 transition-colors"
            style="color: var(--sne-text-secondary)"
          >
            Charts
          </router-link>
          <router-link
            to="/analysis"
            @click="mobileOpen = false"
            class="flex items-center gap-2 px-4 py-3 transition-colors"
            style="color: var(--sne-text-secondary)"
          >
            Analysis
          </router-link>
          <div class="mt-4 px-4">
            <button
              v-if="!isConnected"
              @click="connectWallet(); mobileOpen = false"
              class="btn-primary w-full px-4 py-2"
            >
              Conectar Carteira
            </button>
            <div v-else class="text-sm" style="color: var(--sne-text-secondary)">
              {{ address?.slice(0, 6) }}...{{ address?.slice(-4) }}
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content (with padding for fixed nav) -->
    <main class="pt-16">
      <slot />
    </main>

    <!-- Footer -->
    <footer
      class="py-12 px-6 lg:px-24 border-t mt-auto"
      style="border-color: var(--border); background-color: var(--sne-surface-1)"
    >
      <div class="max-w-[1200px] mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div class="flex items-center gap-2 mb-4">
              <span
                class="font-mono"
                style="color: var(--sne-text-primary); font-weight: 700"
              >
                SNE Radar
              </span>
            </div>
            <p style="font-size: var(--text-small); color: var(--sne-text-secondary)">
              Análise técnica avançada com IA e execução verificável
            </p>
          </div>

          <div>
            <h4 class="mb-3" style="color: var(--sne-text-primary)">Produtos</h4>
            <ul class="space-y-2" style="font-size: var(--text-body)">
              <li>
                <a href="https://radar.snelabs.space" style="color: var(--sne-text-secondary)">
                  SNE Radar
                </a>
              </li>
              <li>
                <a href="https://snelabs.space" style="color: var(--sne-text-secondary)">
                  SNE Vault
                </a>
              </li>
              <li>
                <a href="https://pass.snelabs.space" style="color: var(--sne-text-secondary)">
                  SNE Pass
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 class="mb-3" style="color: var(--sne-text-primary)">Recursos</h4>
            <ul class="space-y-2" style="font-size: var(--text-body)">
              <li>
                <router-link to="/dashboard" style="color: var(--sne-text-secondary)">
                  Dashboard
                </router-link>
              </li>
              <li>
                <router-link to="/chart" style="color: var(--sne-text-secondary)">
                  Gráficos
                </router-link>
              </li>
              <li>
                <router-link to="/analysis" style="color: var(--sne-text-secondary)">
                  Análise
                </router-link>
              </li>
            </ul>
          </div>

          <div>
            <h4 class="mb-3" style="color: var(--sne-text-primary)">Legal</h4>
            <ul class="space-y-2" style="font-size: var(--text-body)">
              <li>
                <a href="#" style="color: var(--sne-text-secondary)">
                  Licenças
                </a>
              </li>
              <li>
                <a href="#" style="color: var(--sne-text-secondary)">
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="pt-6 border-t" style="border-color: var(--border)">
          <p style="font-size: var(--text-small); color: var(--sne-text-secondary)">
            © {{ currentYear }} SNE Labs. Licença MIT. Sistema operando em Scroll L2.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Menu, X, Github } from 'lucide-vue-next'

// Estado do wallet com valores padrão seguros
const address = ref<string | null>(null)
const isConnected = ref(false)
const tier = ref<'free' | 'premium' | 'pro'>('free')
const mobileOpen = ref(false)

const currentYear = new Date().getFullYear()

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
onMounted(() => {
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
})
</script>

<style scoped>
.bg-sne {
  background: var(--sne-bg);
}

.router-link-active {
  color: var(--sne-accent) !important;
}
</style>

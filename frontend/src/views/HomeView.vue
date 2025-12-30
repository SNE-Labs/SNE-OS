<template>
  <Layout>
    <div class="relative overflow-hidden">
      <!-- Decorative fluid gradient background -->
      <div
        aria-hidden="true"
        class="sne-bg-grad"
        style="
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          filter: blur(80px) saturate(120%);
          opacity: 0.9;
        "
      />

      <!-- Hero Section -->
      <section class="py-24 px-6 lg:px-24">
        <div class="max-w-[1200px] mx-auto">
          <div class="mb-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border" style="background-color: var(--sne-surface-elevated); border-color: rgba(255, 106, 0, 0.3)">
              <div class="w-2 h-2 rounded-full animate-pulse" style="background-color: var(--sne-success)"></div>
              <span class="text-xs font-mono uppercase tracking-wider" style="color: var(--sne-accent)">Sistema Operacional</span>
            </div>
          </div>

          <h1 class="mb-6 max-w-3xl" style="color: var(--sne-text-primary)">
            Análise técnica avançada com inteligência artificial e execução verificável
          </h1>

          <p class="mb-8 max-w-2xl" style="font-size: var(--text-body-lg); color: var(--sne-text-secondary)">
            SNE Radar fornece análise técnica profissional com níveis operacionais precisos,
            indicadores avançados e visualizações interativas em tempo real para traders e analistas.
          </p>

          <div class="flex flex-wrap gap-4 mb-12">
            <router-link to="/dashboard">
              <button class="btn-primary flex items-center gap-2 px-6 py-3">
                Acessar Dashboard
                <ArrowRight class="w-4 h-4" />
              </button>
            </router-link>
            <router-link to="/analysis">
              <button class="btn-secondary flex items-center gap-2 px-6 py-3">
                <FileText class="w-4 h-4" />
                Análise Completa
              </button>
            </router-link>
            <a
              href="https://github.com/SNE-Labs"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary flex items-center gap-2 px-6 py-3"
            >
              <Github class="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-16 px-6 lg:px-24" style="background-color: var(--sne-surface-1)">
        <div class="max-w-[1200px] mx-auto">
          <div class="mb-12">
            <h2 class="mb-4" style="color: var(--sne-text-primary)">Recursos Principais</h2>
            <p style="color: var(--sne-text-secondary)">Ferramentas profissionais para análise técnica avançada</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Gráficos Interativos -->
            <div
              class="card cursor-pointer group"
              @click="$router.push('/chart')"
            >
              <div
                class="w-12 h-12 rounded flex items-center justify-center mb-6"
                style="background-color: var(--sne-surface-elevated); border: 1px solid var(--sne-accent)"
              >
                <ChartBar class="w-6 h-6" style="color: var(--sne-accent)" />
              </div>
              <h3 class="mb-3" style="color: var(--sne-text-primary)">Gráficos Interativos</h3>
              <p class="mb-4" style="color: var(--sne-text-secondary)">
                TradingView Lightweight Charts com indicadores técnicos avançados e análise em múltiplos timeframes.
              </p>
              <div class="flex items-center gap-2 text-sm group-hover:gap-3 transition-all" style="color: var(--sne-accent)">
                Explorar gráficos
                <ArrowRight class="w-4 h-4" />
              </div>
            </div>

            <!-- IA & ML -->
            <div
              class="card cursor-pointer group"
              @click="$router.push('/analysis')"
            >
              <div
                class="w-12 h-12 rounded flex items-center justify-center mb-6"
                style="background-color: var(--sne-surface-elevated); border: 1px solid var(--sne-accent)"
              >
                <Brain class="w-6 h-6" style="color: var(--sne-accent)" />
              </div>
              <h3 class="mb-3" style="color: var(--sne-text-primary)">IA & Machine Learning</h3>
              <p class="mb-4" style="color: var(--sne-text-secondary)">
                Motor de análise com machine learning, reconhecimento de padrões e sinais operacionais precisos.
              </p>
              <div class="flex items-center gap-2 text-sm group-hover:gap-3 transition-all" style="color: var(--sne-accent)">
                Ver análise
                <ArrowRight class="w-4 h-4" />
              </div>
            </div>

            <!-- Tempo Real -->
            <div
              class="card cursor-pointer group"
              @click="$router.push('/dashboard')"
            >
              <div
                class="w-12 h-12 rounded flex items-center justify-center mb-6"
                style="background-color: var(--sne-surface-elevated); border: 1px solid var(--sne-accent)"
              >
                <Zap class="w-6 h-6" style="color: var(--sne-accent)" />
              </div>
              <h3 class="mb-3" style="color: var(--sne-text-primary)">Tempo Real</h3>
              <p class="mb-4" style="color: var(--sne-text-secondary)">
                Atualizações em tempo real via WebSocket, análise contínua e alertas instantâneos de sinais.
              </p>
              <div class="flex items-center gap-2 text-sm group-hover:gap-3 transition-all" style="color: var(--sne-accent)">
                Ver dashboard
                <ArrowRight class="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Section -->
      <section class="py-16 px-6 lg:px-24">
        <div class="max-w-[1200px] mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-mono font-bold mb-2" style="color: var(--sne-accent)">100+</div>
              <div class="text-xs uppercase tracking-wider" style="color: var(--sne-text-secondary)">Indicadores</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-mono font-bold mb-2" style="color: var(--sne-accent)">24/7</div>
              <div class="text-xs uppercase tracking-wider" style="color: var(--sne-text-secondary)">Monitoramento</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-mono font-bold mb-2" style="color: var(--sne-accent)">99.9%</div>
              <div class="text-xs uppercase tracking-wider" style="color: var(--sne-text-secondary)">Uptime</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-mono font-bold mb-2" style="color: var(--sne-accent)">&lt;100ms</div>
              <div class="text-xs uppercase tracking-wider" style="color: var(--sne-text-secondary)">Latência</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ChartBar, Brain, Zap, ArrowRight, FileText, Github } from 'lucide-vue-next'
import Layout from '@/components/Layout.vue'
</script>

<style scoped>
</style>

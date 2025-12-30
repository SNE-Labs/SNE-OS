<template>
  <TerminalCard class="metric-card">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm text-gray-400 uppercase tracking-wider">{{ label }}</span>
      <slot name="badge" />
    </div>
    <div class="flex items-baseline gap-2">
      <span :class="['text-3xl font-mono font-bold', valueColor]">
        {{ formattedValue }}
      </span>
      <span v-if="change !== null" :class="['text-sm font-mono', changeColor]">
        {{ change > 0 ? '+' : '' }}{{ change.toFixed(2) }}%
      </span>
    </div>
    <div v-if="subtitle" class="mt-2 text-xs text-gray-500">
      {{ subtitle }}
    </div>
    <div v-if="progress !== null" class="mt-4">
      <div class="h-1 bg-dark-border rounded-full overflow-hidden">
        <div
          :class="['h-full transition-all duration-500', progressColor]"
          :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
        />
      </div>
    </div>
  </TerminalCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TerminalCard from './TerminalCard.vue'

const props = defineProps<{
  label: string
  value: number | string
  change?: number | null
  subtitle?: string
  progress?: number | null
  format?: 'number' | 'currency' | 'percent'
}>()

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  
  if (props.format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(props.value)
  }
  
  if (props.format === 'percent') {
    return `${props.value.toFixed(2)}%`
  }
  
  if (props.value >= 1e12) return `${(props.value / 1e12).toFixed(2)}T`
  if (props.value >= 1e9) return `${(props.value / 1e9).toFixed(2)}B`
  if (props.value >= 1e6) return `${(props.value / 1e6).toFixed(2)}M`
  if (props.value >= 1e3) return `${(props.value / 1e3).toFixed(2)}K`
  
  return props.value.toLocaleString()
})

const valueColor = computed(() => {
  if (props.change === null || props.change === undefined) return 'text-terminal-fg'
  if (props.change > 0) return 'text-terminal-success'
  if (props.change < 0) return 'text-terminal-error'
  return 'text-terminal-fg'
})

const changeColor = computed(() => {
  if (props.change === null || props.change === undefined) return ''
  if (props.change > 0) return 'text-terminal-success'
  if (props.change < 0) return 'text-terminal-error'
  return 'text-gray-400'
})

const progressColor = computed(() => {
  if (props.progress === null || props.progress === undefined) return 'bg-terminal-accent'
  if (props.progress > 70) return 'bg-terminal-success'
  if (props.progress > 30) return 'bg-terminal-warning'
  return 'bg-terminal-error'
})
</script>

<style scoped>
.metric-card {
  min-height: 120px;
}
</style>


<template>
  <button
    :class="[
      'terminal-button',
      variant,
      size,
      { 'w-full': fullWidth }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.terminal-button.primary {
  border-color: var(--terminal-accent);
  color: var(--terminal-accent);
}

.terminal-button.primary:hover:not(:disabled) {
  background: var(--terminal-accent);
  color: var(--terminal-bg);
}

.terminal-button.secondary {
  border-color: var(--terminal-info);
  color: var(--terminal-info);
}

.terminal-button.secondary:hover:not(:disabled) {
  background: var(--terminal-info);
  color: var(--terminal-bg);
}

.terminal-button.danger {
  border-color: var(--terminal-error);
  color: var(--terminal-error);
}

.terminal-button.danger:hover:not(:disabled) {
  background: var(--terminal-error);
  color: var(--terminal-bg);
}

.terminal-button.success {
  border-color: var(--terminal-success);
  color: var(--terminal-success);
}

.terminal-button.success:hover:not(:disabled) {
  background: var(--terminal-success);
  color: var(--terminal-bg);
}

.terminal-button.sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.terminal-button.md {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.terminal-button.lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}
</style>


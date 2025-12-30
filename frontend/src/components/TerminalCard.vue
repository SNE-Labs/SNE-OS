<template>
  <div
    :class="[
      'terminal-card',
      { 'hover-effect': hover }
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hover?: boolean
}>()
</script>

<style scoped>
.terminal-card.hover-effect:hover {
  transform: translateY(-2px);
}
</style>


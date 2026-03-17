<!-- UmweltWrapper.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps(['spec'])
const container = ref(null)
let viewer = null

onMounted(async () => {
  const { createViewer } = await import('./index.js')
  if (container.value) {
    viewer = createViewer(props.spec, container.value)
  }
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<template>
  <div ref="container"></div>
</template>

<style>
.umwelt-container {
  h2 {
    border: none;
    margin: inherit;
  }
  button, input, optgroup, select, textarea {
    all: initial;
  }
}
</style>
<!-- UmweltWrapper.vue -->
<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps(['spec'])
const container = ref(null)

onMounted(async () => {
  // Dynamically import browser-dependent code
  const { UmweltViewer, render } = await import('./index.js')
  container.value && render(() => UmweltViewer({spec: props.spec}), container.value)
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
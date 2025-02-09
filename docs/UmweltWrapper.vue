<!-- UmweltWrapper.vue -->
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { UmweltViewer, render } from '../packages/umwelt-js/src/index'

const props = defineProps(['spec'])
let cleanup = null

onMounted(() => {
  const container = document.getElementById('umwelt-container')
  cleanup = render(() => UmweltViewer({spec: props.spec}), container)
})

onUnmounted(() => {
  if (cleanup) cleanup()
})
</script>

<template>
  <div id="umwelt-container"></div>
</template>


<style>
#umwelt-container {
  h2 {
    border: none;
    margin: inherit;
  }
  button, input, optgroup, select, textarea {
    all: initial;
  }
}
</style>
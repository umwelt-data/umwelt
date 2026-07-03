<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { GalleryExample } from '../examples/types.js';
import type { UmweltViewer } from 'umwelt-js';

const props = defineProps<{
  example: GalleryExample;
}>();

const container = ref<HTMLDivElement>();

let viewer: UmweltViewer | undefined;

async function mountViewer() {
  if (!container.value) return;

  const { createViewer } = await import('umwelt-js');
  viewer = createViewer(props.example.spec, container.value);
}

function teardown() {
  viewer?.destroy();
  viewer = undefined;
  if (container.value) container.value.innerHTML = '';
}

onMounted(() => void mountViewer());
onBeforeUnmount(teardown);

watch(
  () => props.example.id,
  () => {
    teardown();
    void mountViewer();
  },
);
</script>

<template>
  <div ref="container" class="umwelt-renderer" />
</template>

<style scoped>
.umwelt-renderer {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  min-height: 12rem;
  overflow: auto;
}
</style>

<style>
/* Undo VitePress's typographic defaults inside the embedded viewer. */
.umwelt-renderer .uw-viewer {
  h2 {
    border: none;
    margin: inherit;
  }
  button,
  input,
  optgroup,
  select,
  textarea {
    all: revert;
    appearance: auto;
  }
}
</style>

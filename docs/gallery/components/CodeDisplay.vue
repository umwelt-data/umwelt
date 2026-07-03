<script setup lang="ts">
import { computed } from 'vue';
import type { GalleryExample } from '../examples/types.js';

const props = defineProps<{
  example: GalleryExample;
}>();

const specCode = computed(() => JSON.stringify(props.example.spec, null, 2));

const usageCode = `import { createViewer } from 'umwelt-js';
import 'umwelt-js/style.css';

// spec is the Umwelt specification shown above
createViewer(spec, document.getElementById('umwelt-viewer'));`;
</script>

<template>
  <details class="code-display">
    <summary>Spec &amp; Code</summary>
    <div class="code-sections">
      <section>
        <h3>Spec</h3>
        <pre class="code-block"><code>{{ specCode }}</code></pre>
      </section>
      <section>
        <h3>Usage</h3>
        <pre class="code-block"><code>{{ usageCode }}</code></pre>
      </section>
    </div>
  </details>
</template>

<style scoped>
.code-display {
  margin-top: 1.5rem;
}

.code-display summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--vp-c-text-1);
  padding: 0.5rem 0;
  user-select: none;
}

.code-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.code-sections h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.code-block {
  background: var(--vp-code-block-bg);
  color: var(--vp-code-block-color);
  border-radius: 6px;
  padding: 1rem;
  overflow: auto;
  font-size: var(--vp-code-font-size);
  line-height: var(--vp-code-line-height);
  max-height: 24rem;
}

.code-block code {
  font-family: var(--vp-font-family-mono);
  white-space: pre;
}
</style>

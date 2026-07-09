<script setup lang="ts">
import { computed } from 'vue';
import LZString from 'lz-string';
import { findExample } from '../examples/index.js';
import UmweltRenderer from './UmweltRenderer.vue';
import CodeDisplay from './CodeDisplay.vue';

const EDITOR_URL = 'https://umwelt-data.github.io/umwelt/editor/';

const props = defineProps<{
  /** URL slug from the dynamic route. */
  id: string;
}>();

const example = computed(() => findExample(props.id));

// same encoding the editor's Export tab produces: the compressed spec in the
// hash fragment, so it is never sent to the server
const editorUrl = computed(() => {
  if (!example.value) return EDITOR_URL;
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(example.value.spec));
  return `${EDITOR_URL}#spec=${compressed}`;
});
</script>

<template>
  <article v-if="example">
    <header class="ex-header">
      <h1>{{ example.title }}</h1>
      <p v-if="example.description" class="ex-description">{{ example.description }}</p>
      <dl class="ex-tags">
        <div class="ex-tag">
          <dt>Visual</dt>
          <dd>{{ example.tags.visual }}</dd>
        </div>
        <div class="ex-tag">
          <dt>Sound</dt>
          <dd>{{ example.tags.audio }}</dd>
        </div>
        <div class="ex-tag">
          <dt>Text</dt>
          <dd>{{ example.tags.text }}</dd>
        </div>
      </dl>
      <p>
        <a :href="editorUrl" target="_blank" rel="noreferrer">Open this example in the editor</a>
      </p>
    </header>

    <UmweltRenderer :example="example" />

    <CodeDisplay :example="example" />
  </article>

  <article v-else>
    <h1>Example not found</h1>
    <p>
      No example is registered with id <code>{{ props.id }}</code
      >. Return to the <a href="/umwelt/gallery/">gallery index</a>.
    </p>
  </article>
</template>

<style scoped>
.ex-header {
  margin-bottom: 1.5rem;
}
.ex-description {
  color: var(--vp-c-text-2);
  margin-top: 0.25rem;
}
.ex-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.ex-tag {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ex-tag dt {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}
.ex-tag dd {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}
</style>

<script setup lang="ts">
import { galleryGroups } from '../examples/groups.js';
import { findExample } from '../examples/index.js';
import { withBase } from 'vitepress';
</script>

<template>
  <div class="gallery">
    <section v-for="group in galleryGroups" :key="group.label" class="gallery-group">
      <h2>{{ group.label }}</h2>
      <p class="gallery-group-blurb">{{ group.blurb }}</p>
      <ul class="gallery-grid">
        <li v-for="ex in group.items" :key="ex.id">
          <a :href="withBase(`/gallery/${ex.id}/`)" class="gallery-card">
            <h3>{{ ex.title }}</h3>
            <dl v-if="findExample(ex.id)?.tags" class="ex-tags">
              <div class="ex-tag">
                <dt>Visual</dt>
                <dd>{{ findExample(ex.id)!.tags.visual }}</dd>
              </div>
              <div class="ex-tag">
                <dt>Sound</dt>
                <dd>{{ findExample(ex.id)!.tags.audio }}</dd>
              </div>
              <div class="ex-tag">
                <dt>Text</dt>
                <dd>{{ findExample(ex.id)!.tags.text }}</dd>
              </div>
            </dl>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.gallery-group {
  margin-bottom: 2rem;
}
.gallery-group h2 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}
.gallery-group-blurb {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 60ch;
}
.gallery-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  gap: 1rem;
}
.gallery-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.1s ease;
}
.gallery-card:hover {
  border-color: var(--vp-c-brand-1);
}
.gallery-card h3 {
  margin: 0;
  font-size: 1.05rem;
}
.ex-tags {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ex-tag {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  gap: 0.5rem;
  align-items: baseline;
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
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.35;
}
.vp-doc li + li {
  margin: 0;
}
</style>

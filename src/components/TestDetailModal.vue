<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  test: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const statusMap = {
  1: { label: 'Passed', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  2: { label: 'Blocked', class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  3: { label: 'Untested', class: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400' },
  4: { label: 'Retest', class: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  5: { label: 'Failed', class: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
}

function statusInfo(statusId) {
  return statusMap[statusId] ?? { label: `Status ${statusId}`, class: 'bg-gray-100 text-gray-600' }
}

function formatFieldName(key) {
  return key
      .replace(/^custom_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isRichText(value) {
  return typeof value === 'string' && /<[a-z][\s\S]*>/i.test(value)
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || (attr.name === 'href' && /^\s*javascript:/i.test(attr.value))) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.test) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
      v-if="test"
      data-testid="test-modal-backdrop"
      class="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
      @click.self="emit('close')"
  >
    <div class="bg-[var(--surface)] text-[var(--text-h)] rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 border border-[var(--border)]">
      <div class="flex items-start justify-between gap-4 mb-3">
        <h2 class="text-lg font-semibold">{{ test.title }}</h2>
        <button
            data-testid="test-modal-close"
            @click="emit('close')"
            class="text-[var(--text)] hover:text-[var(--text-h)] text-xl leading-none shrink-0"
        >
          ✕
        </button>
      </div>

      <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-4" :class="statusInfo(test.status_id).class">
        {{ statusInfo(test.status_id).label }}
      </span>

      <dl class="space-y-4 text-sm">
        <template v-for="(value, key) in test" :key="key">
          <div v-if="key.startsWith('custom_') && formatFieldValue(value)">
            <dt class="font-medium text-[var(--text)] mb-1">{{ formatFieldName(key) }}</dt>
            <dd
                v-if="isRichText(formatFieldValue(value))"
                class="rich-text"
                v-html="sanitizeHtml(formatFieldValue(value))"
            ></dd>
            <dd v-else class="whitespace-pre-wrap">{{ formatFieldValue(value) }}</dd>
          </div>
        </template>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.rich-text :deep(*) {
  max-width: 100%;
  font-family: inherit !important;
  font-size: inherit !important;
  color: inherit !important;
  background: none !important;
}

.rich-text :deep(p) {
  margin: 0 0 0.5em;
}

.rich-text :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>

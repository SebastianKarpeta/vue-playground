<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  tests: { type: Array, required: true },
  selectedTestId: { type: Number, default: null },
  pageSize: { type: Number, default: 20 },
  hasNext: { type: Boolean, default: false },
  hasPrev: { type: Boolean, default: false },
  resultCounts: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['select', 'next-page', 'prev-page', 'change-page-size'])

const searchQuery = ref('')

const filteredTests = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.tests
  return props.tests.filter((t) => t.title.toLowerCase().includes(query))
})

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
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-[var(--text-h)]">Testy</h3>

      <label class="text-sm text-[var(--text)] flex items-center gap-2">
        Na stronę
        <select
            :value="pageSize"
            @change="emit('change-page-size', Number($event.target.value))"
            data-testid="tests-page-size"
            class="border border-[var(--border)] bg-[var(--surface)] rounded-md px-2 py-1 text-[var(--text-h)]
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
        >
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="250">250</option>
        </select>
      </label>
    </div>

    <input
        v-model="searchQuery"
        type="text"
        data-testid="tests-search"
        placeholder="Szukaj po nazwie testu (na tej stronie)…"
        class="w-full border border-[var(--border)] bg-[var(--surface)] rounded-md px-3 py-1.5 mb-3 text-sm text-[var(--text-h)]
               placeholder:text-[var(--text)]/60
               focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
    />

    <ul class="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] overflow-hidden">
      <li
          v-for="t in filteredTests"
          :key="t.id"
          data-testid="test-item"
          @click="emit('select', t.id)"
          class="cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-[var(--text-h)] transition-colors"
          :class="{ 'bg-emerald-500/10 font-medium': t.id === selectedTestId }"
      >
        <span class="truncate flex items-baseline gap-2">
          <span class="shrink-0 w-24 text-xs text-[var(--text)] tabular-nums">
            C{{ t.case_id }} ({{ resultCounts[t.id] ?? '…' }})
          </span>
          <span class="truncate">{{ t.title }}</span>
        </span>
        <span class="shrink-0 w-20 text-center px-2 py-0.5 rounded-full text-xs font-medium" :class="statusInfo(t.status_id).class">
          {{ statusInfo(t.status_id).label }}
        </span>
      </li>
      <li v-if="filteredTests.length === 0" class="px-4 py-3 text-sm text-[var(--text)]">
        Brak testów pasujących do "{{ searchQuery }}" na tej stronie.
      </li>
    </ul>

    <div class="flex gap-2 mt-4">
      <button
          data-testid="tests-prev"
          :disabled="!hasPrev"
          @click="emit('prev-page')"
          class="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--text-h)]
                 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        ← Wstecz
      </button>
      <button
          data-testid="tests-next"
          :disabled="!hasNext"
          @click="emit('next-page')"
          class="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--text-h)]
                 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        Dalej →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  tests: { type: Array, required: true },
  selectedTestId: { type: Number, default: null },
  pageSize: { type: Number, default: 20 },
  hasNext: { type: Boolean, default: false },
  hasPrev: { type: Boolean, default: false },
  // true, gdy rodzic wciąż doładowuje daty/liczby wyników dla bieżącej strony
  // (tryb serwerowy) — blokuje Wstecz/Dalej, żeby kliknięcie nie trafiło w
  // kolejkę za dziesiątkami zapytań do jednowątkowego serwera PHP.
  detailsLoading: { type: Boolean, default: false },
  resultCounts: { type: Object, default: () => ({}) },
  caseDates: { type: Object, default: () => ({}) },
  // Gdy true: cały (przefiltrowany) zbiór już jest w `tests`, a stronicowanie,
  // rozmiar strony i numery stron liczą się lokalnie, bez pytania rodzica.
  clientPaginate: { type: Boolean, default: false },
  // Numer bieżącej strony w trybie clientPaginate — rodzic trzyma go w URL-u
  // (żeby F5 nie zrzucał z powrotem na stronę 1), więc to on jest źródłem
  // prawdy; zmiany wychodzą przez update:page.
  page: { type: Number, default: 1 },
})

const emit = defineEmits(['select', 'next-page', 'prev-page', 'change-page-size', 'visible-tests-changed', 'update:page'])

const searchQuery = ref('')
const dateFilterField = ref('created') // 'created' | 'modified'
const dateFrom = ref('')
const dateTo = ref('')

function inRange(unixSeconds, fromStr, toStr) {
  if (!fromStr && !toStr) return true
  if (unixSeconds == null) return false
  const ms = unixSeconds * 1000
  if (fromStr && ms < new Date(fromStr).getTime()) return false
  if (toStr && ms > new Date(toStr).getTime() + 24 * 60 * 60 * 1000 - 1) return false
  return true
}

function matchesQuery(test, query) {
  if (test.title.toLowerCase().includes(query)) return true
  // po numerze case'a — z "C" (jak w kolumnie Case) albo bez
  return `c${test.case_id}`.includes(query)
}

const filteredTests = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.tests.filter((t) => {
    if (query && !matchesQuery(t, query)) return false
    const dates = props.caseDates[t.id]
    const relevantDate = dateFilterField.value === 'created' ? dates?.created_on : dates?.updated_on
    if (!inRange(relevantDate, dateFrom.value, dateTo.value)) return false
    return true
  })
})

const sortField = ref(null) // null | 'created' | 'modified'
const sortDirection = ref('asc')

function toggleSort(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const sortedTests = computed(() => {
  if (!sortField.value) return filteredTests.value
  const key = sortField.value === 'created' ? 'created_on' : 'updated_on'
  const dir = sortDirection.value === 'asc' ? 1 : -1

  return [...filteredTests.value].sort((a, b) => {
    const da = props.caseDates[a.id]?.[key]
    const db = props.caseDates[b.id]?.[key]
    if (da == null && db == null) return 0
    if (da == null) return 1 // testy bez wczytanej daty jeszcze zawsze na końcu
    if (db == null) return -1
    return (da - db) * dir
  })
})

const hasActiveFilter = computed(() => !!(searchQuery.value || dateFrom.value || dateTo.value))

function clearFilters() {
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  dateFilterField.value = 'created'
}

// Lokalna paginacja — tylko gdy clientPaginate=true (pełny, wczytany run).
// `page` sam w sobie NIE jest lokalnym stanem — właścicielem jest rodzic
// (trzyma go w URL-u), tu tylko czytamy props.page i emitujemy zmiany.
const localPageSize = ref(props.pageSize)
watch(() => props.pageSize, (v) => { localPageSize.value = v })

watch([searchQuery, dateFrom, dateTo, dateFilterField, sortField, sortDirection, () => props.tests], () => {
  if (props.page !== 1) emit('update:page', 1)
})

const effectivePageSize = computed(() => (props.clientPaginate ? localPageSize.value : props.pageSize))

const totalPages = computed(() =>
    props.clientPaginate ? Math.max(1, Math.ceil(sortedTests.value.length / effectivePageSize.value)) : 1
)

const visibleTests = computed(() => {
  if (!props.clientPaginate) return sortedTests.value
  const start = (props.page - 1) * effectivePageSize.value
  return sortedTests.value.slice(start, start + effectivePageSize.value)
})

watch(visibleTests, (val) => emit('visible-tests-changed', val), { immediate: true })

function goToPage(p) {
  const clamped = Math.min(Math.max(1, p), totalPages.value)
  if (clamped !== props.page) emit('update:page', clamped)
}

// Klasyczne 1 2 3 … N z oknem wokół bieżącej strony (jak w samym TestRailu).
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = props.page
  const window = 2
  const pages = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= current - window && p <= current + window)) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
})

function onPageSizeChange(event) {
  const value = Number(event.target.value)
  localPageSize.value = value
  if (props.page !== 1) emit('update:page', 1)
  emit('change-page-size', value)
}

const dateFormatter = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })

function formatDate(unixSeconds) {
  if (unixSeconds == null) return '…'
  return dateFormatter.format(new Date(unixSeconds * 1000))
}

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
            :value="effectivePageSize"
            @change="onPageSizeChange"
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
        :placeholder="clientPaginate ? 'Szukaj po nazwie lub numerze case (cały run)…' : 'Szukaj po nazwie lub numerze case (na tej stronie)…'"
        class="w-full border border-[var(--border)] bg-[var(--surface)] rounded-md px-3 py-1.5 mb-3 text-sm text-[var(--text-h)]
               placeholder:text-[var(--text)]/60
               focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
    />

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-[var(--text)]">
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="dateFilterField" type="radio" value="created" data-testid="filter-date-field-created" />
        Utworzenie
      </label>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input v-model="dateFilterField" type="radio" value="modified" data-testid="filter-date-field-modified" />
        Modyfikacja
      </label>
      <label class="flex items-center gap-1.5">
        <input v-model="dateFrom" type="date" data-testid="filter-date-from" class="border border-[var(--border)] bg-[var(--surface)] rounded px-1.5 py-1 text-[var(--text-h)]" />
        <span>–</span>
        <input v-model="dateTo" type="date" data-testid="filter-date-to" class="border border-[var(--border)] bg-[var(--surface)] rounded px-1.5 py-1 text-[var(--text-h)]" />
      </label>
      <button v-if="hasActiveFilter" data-testid="filter-tests-clear" @click="clearFilters" class="underline hover:no-underline">
        Wyczyść filtry
      </button>
    </div>

    <div class="border border-[var(--border)] rounded-lg overflow-x-auto">
      <table class="min-w-[640px] w-full text-sm text-[var(--text-h)] table-fixed">
        <thead>
          <tr class="text-left text-xs text-[var(--text)] border-b border-[var(--border)]">
            <th class="sticky left-0 z-10 bg-[var(--surface)] px-3 py-2 font-medium border-r border-[var(--border)]">Tytuł</th>
            <th class="w-28 px-3 py-2 font-medium">Case</th>
            <th class="w-24 px-3 py-2 font-medium">
              <button
                  data-testid="sort-created"
                  @click="toggleSort('created')"
                  class="flex items-center gap-1 font-medium hover:text-[var(--text-h)]"
              >
                Utworzono
                <span v-if="sortField === 'created'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </button>
            </th>
            <th class="w-24 px-3 py-2 font-medium">
              <button
                  data-testid="sort-modified"
                  @click="toggleSort('modified')"
                  class="flex items-center gap-1 font-medium hover:text-[var(--text-h)]"
              >
                Zmieniono
                <span v-if="sortField === 'modified'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </button>
            </th>
            <th class="sticky right-0 z-10 bg-[var(--surface)] w-24 px-3 py-2 font-medium text-center border-l border-[var(--border)]">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border)]">
          <tr
              v-for="t in visibleTests"
              :key="t.id"
              data-testid="test-item"
              @click="emit('select', t.id)"
              class="cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
              :class="{ 'bg-emerald-500/10 font-medium': t.id === selectedTestId }"
          >
            <td
                class="sticky left-0 z-10 px-3 py-2 truncate border-r border-[var(--border)]"
                :class="t.id === selectedTestId ? 'bg-emerald-500/10 font-medium' : 'bg-[var(--surface)]'"
            >
              {{ t.title }}
            </td>
            <td class="px-3 py-2 text-xs tabular-nums truncate">C{{ t.case_id }} ({{ resultCounts[t.id] ?? '…' }})</td>
            <td class="px-3 py-2 text-xs truncate" data-testid="test-item-created">{{ formatDate(caseDates[t.id]?.created_on) }}</td>
            <td class="px-3 py-2 text-xs truncate" data-testid="test-item-modified">{{ formatDate(caseDates[t.id]?.updated_on) }}</td>
            <td
                class="sticky right-0 z-10 px-3 py-2 text-center border-l border-[var(--border)]"
                :class="t.id === selectedTestId ? 'bg-emerald-500/10' : 'bg-[var(--surface)]'"
            >
              <span class="inline-block w-20 text-center px-2 py-0.5 rounded-full text-xs font-medium" :class="statusInfo(t.status_id).class">
                {{ statusInfo(t.status_id).label }}
              </span>
            </td>
          </tr>
          <tr v-if="visibleTests.length === 0">
            <td colspan="5" class="px-3 py-3 text-sm text-[var(--text)]">
              Brak testów pasujących do filtrów.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="clientPaginate" class="flex flex-wrap items-center gap-1 mt-4 text-sm">
      <button
          data-testid="tests-prev"
          :disabled="props.page === 1"
          @click="goToPage(props.page - 1)"
          class="px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-h)]
                 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        « Prev
      </button>
      <template v-for="(p, i) in pageNumbers" :key="i">
        <span v-if="p === '…'" class="px-1.5 text-[var(--text)]">…</span>
        <button
            v-else
            :data-testid="`tests-page-${p}`"
            @click="goToPage(p)"
            class="px-2.5 py-1 rounded-md border text-sm transition-colors"
            :class="p === props.page
                ? 'bg-emerald-500/15 border-emerald-500 text-[var(--text-h)] font-medium'
                : 'border-[var(--border)] text-[var(--text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'"
        >
          {{ p }}
        </button>
      </template>
      <button
          data-testid="tests-next"
          :disabled="props.page === totalPages"
          @click="goToPage(props.page + 1)"
          class="px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-h)]
                 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        Next »
      </button>
    </div>

    <div v-else class="flex gap-2 mt-4">
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
      <span
          v-if="detailsLoading"
          data-testid="tests-details-loading"
          class="flex items-center gap-1.5 text-xs text-[var(--text)]/60"
      >
        <span class="inline-block w-3 h-3 shrink-0 rounded-full border-2 border-[var(--border)] border-t-emerald-500 animate-spin"></span>
        Doładowywanie dat i wyników…
      </span>
    </div>
  </div>
</template>

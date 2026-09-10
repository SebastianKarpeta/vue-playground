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
  // true, gdy w tle trwa ładowanie całego runu — blokuje TYLKO paginację
  // (Wstecz/Dalej w trybie serwerowym odpaliłoby kolejne zapytanie do tego
  // samego jednowątkowego serwera PHP, który już jest zajęty ładowaniem
  // całości) i sortowanie po dacie (i tak sortowałoby tylko bieżącą,
  // tymczasową stronę, która zaraz zostanie zastąpiona pełnym zbiorem).
  // Wyszukiwanie, filtry dat i kliknięcie w wiersz zostają aktywne — nie
  // kolidują z trwającym ładowaniem.
  loadingBlockNav: { type: Boolean, default: false },
  // true, gdy rodzic właśnie odpytuje serwer o nową stronę (np. po Wstecz/
  // Dalej) — na ten czas `tests` jest tymczasowo puste, więc bez tego
  // widać by było mylące "Brak testów pasujących do filtrów" zamiast
  // informacji, że dane jeszcze idą.
  testsLoading: { type: Boolean, default: false },
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

// Zmiana kryteriów (szukanie/filtr/sortowanie) pokazuje inny zbiór, więc
// wraca na stronę 1. Samo odświeżenie danych (np. przycisk "Odśwież" albo
// ponowne "Załaduj cały run") NIE jest tu nasłuchiwane — inaczej cichcem
// zrzucałoby użytkownika ze strony 5 z powrotem na 1 przy każdym refreshu.
watch([searchQuery, dateFrom, dateTo, dateFilterField, sortField, sortDirection], () => {
  if (props.page !== 1) emit('update:page', 1)
})

const effectivePageSize = computed(() => (props.clientPaginate ? localPageSize.value : props.pageSize))

const totalPages = computed(() =>
    props.clientPaginate ? Math.max(1, Math.ceil(sortedTests.value.length / effectivePageSize.value)) : 1
)

// Odświeżone (lub przefiltrowane) dane mogą mieć mniej stron niż wcześniej —
// zamiast cichego pustego widoku, ściągnij bieżącą stronę do ostatniej ważnej.
watch(totalPages, (total) => {
  if (props.page > total) emit('update:page', total)
})

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

// Kolory z pełną krycją (nie /15 jak w plakietce) — ta komórka jest teraz
// sticky (prawa kolumna), więc tło musi zasłaniać przewijaną zawartość pod
// spodem, a nie tylko delikatnie ją podbarwiać.
const statusMap = {
  1: { label: 'Passed', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' },
  2: { label: 'Blocked', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' },
  3: { label: 'Untested', class: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  4: { label: 'Retest', class: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200' },
  5: { label: 'Failed', class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
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
            :disabled="testsLoading || loadingBlockNav"
            @change="onPageSizeChange"
            data-testid="tests-page-size"
            class="border border-[var(--border)] bg-[var(--surface)] rounded-md px-2 py-1 text-[var(--text-h)]
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
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
        :disabled="testsLoading || loadingBlockNav"
        :placeholder="clientPaginate ? 'Szukaj po nazwie lub numerze case (cały run)…' : 'Szukaj po nazwie lub numerze case (na tej stronie)…'"
        class="w-full border border-[var(--border)] bg-[var(--surface)] rounded-md px-3 py-1.5 mb-3 text-sm text-[var(--text-h)]
               placeholder:text-[var(--text)]/60
               focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500
               disabled:opacity-50 disabled:cursor-not-allowed"
    />

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-[var(--text)]">
      <label class="flex items-center gap-1.5" :class="(testsLoading || loadingBlockNav) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'">
        <input v-model="dateFilterField" type="radio" value="created" :disabled="testsLoading || loadingBlockNav" data-testid="filter-date-field-created" />
        Utworzenie
      </label>
      <label class="flex items-center gap-1.5" :class="(testsLoading || loadingBlockNav) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'">
        <input v-model="dateFilterField" type="radio" value="modified" :disabled="testsLoading || loadingBlockNav" data-testid="filter-date-field-modified" />
        Modyfikacja
      </label>
      <label class="flex items-center gap-1.5">
        <input v-model="dateFrom" type="date" :disabled="testsLoading || loadingBlockNav" data-testid="filter-date-from" class="border border-[var(--border)] bg-[var(--surface)] rounded px-1.5 py-1 text-[var(--text-h)] disabled:opacity-50 disabled:cursor-not-allowed" />
        <span>–</span>
        <input v-model="dateTo" type="date" :disabled="testsLoading || loadingBlockNav" data-testid="filter-date-to" class="border border-[var(--border)] bg-[var(--surface)] rounded px-1.5 py-1 text-[var(--text-h)] disabled:opacity-50 disabled:cursor-not-allowed" />
      </label>
      <button v-if="hasActiveFilter" data-testid="filter-tests-clear" :disabled="testsLoading || loadingBlockNav" @click="clearFilters" class="underline hover:no-underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed">
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
                  :disabled="loadingBlockNav || testsLoading"
                  @click="toggleSort('created')"
                  class="flex items-center gap-1 font-medium hover:text-[var(--text-h)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-inherit"
              >
                Utworzono
                <span v-if="sortField === 'created'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </button>
            </th>
            <th class="w-24 px-3 py-2 font-medium">
              <button
                  data-testid="sort-modified"
                  :disabled="loadingBlockNav || testsLoading"
                  @click="toggleSort('modified')"
                  class="flex items-center gap-1 font-medium hover:text-[var(--text-h)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-inherit"
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
              @click="!(testsLoading || loadingBlockNav) && emit('select', t.id)"
              class="transition-colors"
              :class="[
                (testsLoading || loadingBlockNav) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                { 'bg-emerald-500/10 font-medium': t.id === selectedTestId },
              ]"
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
                class="relative sticky right-0 z-10 text-center border-l border-[var(--border)]"
                :class="t.id === selectedTestId ? 'bg-emerald-500/10' : 'bg-[var(--surface)]'"
            >
              <div class="absolute inset-px flex items-center justify-center rounded text-xs font-medium" :class="statusInfo(t.status_id).class">
                {{ statusInfo(t.status_id).label }}
              </div>
            </td>
          </tr>
          <tr v-if="visibleTests.length === 0">
            <td colspan="5" class="px-3 py-3 text-sm text-[var(--text)]">
              <div
                  v-if="testsLoading"
                  data-testid="tests-loading-spinner"
                  class="flex items-center justify-center gap-2 min-h-[240px]"
              >
                <span class="inline-block w-4 h-4 shrink-0 rounded-full border-2 border-[var(--border)] border-t-emerald-500 animate-spin"></span>
                Ładowanie testów…
              </div>
              <template v-else>Brak testów pasujących do filtrów.</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="clientPaginate" class="flex flex-wrap items-center gap-1 mt-4 text-sm">
      <button
          data-testid="tests-prev"
          :disabled="loadingBlockNav || testsLoading || props.page === 1"
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
            :disabled="loadingBlockNav || testsLoading"
            @click="goToPage(p)"
            class="px-2.5 py-1 rounded-md border text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="p === props.page
                ? 'bg-emerald-500/15 border-emerald-500 text-[var(--text-h)] font-medium'
                : 'border-[var(--border)] text-[var(--text)] enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
        >
          {{ p }}
        </button>
      </template>
      <button
          data-testid="tests-next"
          :disabled="loadingBlockNav || testsLoading || props.page === totalPages"
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
          :disabled="loadingBlockNav || testsLoading || !hasPrev"
          @click="emit('prev-page')"
          class="px-3 py-1.5 rounded-md border border-[var(--border)] text-sm text-[var(--text-h)]
                 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
      >
        ← Wstecz
      </button>
      <button
          data-testid="tests-next"
          :disabled="loadingBlockNav || testsLoading || !hasNext"
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

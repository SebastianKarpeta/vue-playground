<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntitySelect from '../components/EntitySelect.vue'
import TestList from '../components/TestList.vue'
import TestDetailModal from '../components/TestDetailModal.vue'
import { useResizableWidth } from '../composables/useResizableWidth'
import { cachedFetch } from '../composables/apiCache'
import { formatRelativeTime } from '../composables/formatRelativeTime'

const STALE_AFTER_MS = 2 * 60 * 1000

const route = useRoute()
const router = useRouter()

const contentEl = ref(null)
const { startResize } = useResizableWidth('vue_playground_content_width', contentEl, 896)

const projects = ref([])
const milestones = ref([])
const milestonesLoaded = ref(false)
const runs = ref([])
const tests = ref([])
const testsHasNext = ref(false)
const testsHasPrev = ref(false)
let testsLoadGeneration = 0
const pageDetailsPending = ref(0)
const loading = ref(false)
const error = ref(null)
const selectedTest = ref(null)
const testResultCounts = ref({})
const testCaseDates = ref({})
const fullTests = ref(null) // null = nie wczytano całego runu; Array po wczytaniu
const hasCachedFullDataset = ref(false) // czy dla bieżącego runu jest już snapshot w sessionStorage
const fullDatasetLoading = ref(false)
const fullDatasetProgress = ref('')
const clientStatusFilter = ref(null) // filtr statusu używany tylko w trybie pełnym
const lastFetchedAt = ref(null)
const now = ref(Date.now())

const isStale = computed(() =>
    lastFetchedAt.value !== null && now.value - lastFetchedAt.value > STALE_AFTER_MS
)
const pageDetailsLoaded = computed(() => pageDetailsPending.value === 0)

const lastFetchedLabel = computed(() =>
    lastFetchedAt.value === null ? null : formatRelativeTime(now.value - lastFetchedAt.value)
)

let nowTimer = null
onMounted(() => {
  nowTimer = setInterval(() => { now.value = Date.now() }, 5000)
})
onUnmounted(() => clearInterval(nowTimer))

async function loadProjects(force = false) {
  const { data, timestamp } = await cachedFetch(`${import.meta.env.BASE_URL}api/projects.php`, { force })
  projects.value = data.projects
  lastFetchedAt.value = timestamp
}

onMounted(() => loadProjects())

const selectedProjectId = computed(() =>
    route.params.projectId ? Number(route.params.projectId) : null
)
const selectedMilestoneId = computed(() =>
    route.params.milestoneId ? Number(route.params.milestoneId) : null
)
const selectedRunId = computed(() =>
    route.params.runId ? Number(route.params.runId) : null
)

// W URL-u (query), nie w samej pamięci — żeby F5 zostawiało Cię na tej
// samej stronie/filtrze/rozmiarze strony, zamiast wracać na start.
const testsOffset = computed(() => route.query.offset ? Number(route.query.offset) : 0)
const testsLimit = computed(() => route.query.limit ? Number(route.query.limit) : 20)
const testsStatusFilter = computed(() => route.query.status ? Number(route.query.status) : null)
// Numer strony w trybie pełnym (clientPaginate) — osobny param, bo `offset`
// obsługuje paginację serwerową, a te dwa tryby się wzajemnie wykluczają.
const clientPage = computed(() => route.query.page ? Number(route.query.page) : 1)

function updateClientPage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : page } })
}

const selectedRun = computed(() =>
    runs.value.find((r) => r.id === selectedRunId.value) ?? null
)

const fullMode = computed(() => fullTests.value !== null)

const activeStatusFilter = computed(() => (fullMode.value ? clientStatusFilter.value : testsStatusFilter.value))

const effectiveTests = computed(() => {
  if (!fullMode.value) return tests.value
  if (!clientStatusFilter.value) return fullTests.value
  return fullTests.value.filter((t) => t.status_id === clientStatusFilter.value)
})

const milestonesEnabled = computed(() => milestonesLoaded.value && milestones.value.length > 0)
const runsEnabled = computed(() =>
    selectedMilestoneId.value !== null || (milestonesLoaded.value && milestones.value.length === 0)
)

function selectProject(projectId) {
  if (!projectId) {
    router.push({ name: 'dashboard' })
    return
  }
  router.push({ name: 'project', params: { projectId } })
}

function selectMilestone(milestoneId) {
  if (!milestoneId) {
    router.push({ name: 'project', params: { projectId: selectedProjectId.value } })
    return
  }
  router.push({ name: 'milestone', params: { projectId: selectedProjectId.value, milestoneId } })
}

function selectRun(runId) {
  if (!runId) {
    if (selectedMilestoneId.value) {
      router.push({ name: 'milestone', params: { projectId: selectedProjectId.value, milestoneId: selectedMilestoneId.value } })
    } else {
      router.push({ name: 'project', params: { projectId: selectedProjectId.value } })
    }
    return
  }
  if (selectedMilestoneId.value) {
    router.push({ name: 'run', params: { projectId: selectedProjectId.value, milestoneId: selectedMilestoneId.value, runId } })
  } else {
    router.push({ name: 'run-no-milestone', params: { projectId: selectedProjectId.value, runId } })
  }
}

async function loadMilestones(projectId, force = false) {
  milestones.value = []
  milestonesLoaded.value = false
  error.value = null

  loading.value = true
  try {
    const { data, timestamp } = await cachedFetch(
        `${import.meta.env.BASE_URL}api/milestones.php?project_id=${projectId}`, { force }
    )
    milestones.value = data.milestones
    lastFetchedAt.value = timestamp
  } catch (e) {
    error.value = e.message
  } finally {
    milestonesLoaded.value = true
    loading.value = false
  }
}

async function loadRuns(projectId, milestoneId, force = false) {
  runs.value = []
  error.value = null

  loading.value = true
  try {
    const url = milestoneId
        ? `${import.meta.env.BASE_URL}api/runs.php?project_id=${projectId}&milestone_id=${milestoneId}`
        : `${import.meta.env.BASE_URL}api/runs.php?project_id=${projectId}`
    const { data, timestamp } = await cachedFetch(url, { force })
    runs.value = data.runs
    lastFetchedAt.value = timestamp
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(selectedProjectId, async (projectId) => {
  runs.value = []
  tests.value = []
  error.value = null

  if (!projectId) {
    milestones.value = []
    milestonesLoaded.value = false
    return
  }

  await loadMilestones(projectId)

  if (milestones.value.length === 0) {
    await loadRuns(projectId, null)
  }
}, { immediate: true })

watch(selectedMilestoneId, (milestoneId) => {
  runs.value = []
  tests.value = []

  if (!milestoneId) return
  loadRuns(selectedProjectId.value, milestoneId)
}, { immediate: true })

async function loadResultCount(testId, force = false) {
  try {
    const { data } = await cachedFetch(`${import.meta.env.BASE_URL}api/results.php?test_id=${testId}`, { force })
    testResultCounts.value = { ...testResultCounts.value, [testId]: data.results?.length ?? 0 }
  } catch {
    // licznik po prostu się nie pojawi, nie blokujemy reszty listy
  }
}

async function loadCaseDates(testId, caseId, force = false) {
  try {
    const { data } = await cachedFetch(`${import.meta.env.BASE_URL}api/case.php?case_id=${caseId}`, { force })
    testCaseDates.value = {
      ...testCaseDates.value,
      [testId]: { created_on: data.created_on ?? null, updated_on: data.updated_on ?? null },
    }
  } catch {
    // daty po prostu się nie pojawią, nie blokujemy reszty listy
  }
}

async function loadTests(runId, offset, force = false) {
  const generation = ++testsLoadGeneration
  tests.value = []
  testResultCounts.value = {}
  testCaseDates.value = {}
  error.value = null
  pageDetailsPending.value = 0
  if (!runId) return

  loading.value = true
  try {
    let url = `${import.meta.env.BASE_URL}api/tests.php?run_id=${runId}&offset=${offset}&limit=${testsLimit.value}`
    if (testsStatusFilter.value) {
      url += `&status_id=${testsStatusFilter.value}`
    }
    const { data, timestamp } = await cachedFetch(url, { force })
    if (generation !== testsLoadGeneration) return // w międzyczasie ruszyło nowsze ładowanie strony
    tests.value = data.tests
    testsHasNext.value = !!data._links?.next
    testsHasPrev.value = !!data._links?.prev
    lastFetchedAt.value = timestamp
    // Zliczamy w toku będące doładowania (liczba wyników + daty) dla TEJ strony,
    // żeby zablokować Wstecz/Dalej dopóki się nie skończą — inaczej kliknięcie
    // "Dalej" trafia w kolejkę za dziesiątkami zapytań do jednowątkowego serwera
    // PHP i wygląda, jakby nic się nie działo.
    pageDetailsPending.value = tests.value.length * 2
    tests.value.forEach((t) => {
      loadResultCount(t.id, force).finally(() => {
        if (generation === testsLoadGeneration) pageDetailsPending.value--
      })
      loadCaseDates(t.id, t.case_id, force).finally(() => {
        if (generation === testsLoadGeneration) pageDetailsPending.value--
      })
    })
  } catch (e) {
    error.value = e.message
  } finally {
    if (generation === testsLoadGeneration) loading.value = false
  }
}

// Po wczytaniu całego runu zapisujemy OKROJONY snapshot (tylko pola
// potrzebne do wyświetlenia listy + daty) w sessionStorage, żeby F5
// odtwarzał go od razu, bez ponownego przeciągania ~66 stron z API.
// Nie korzystamy tu z generycznego apiCache — surowe odpowiedzi get_tests/
// get_cases (bogaty HTML w polach custom_*) dla 8000+ pozycji łatwo
// przekraczają limit sessionStorage (~5-10MB), więc cache po cichu
// przestawał się zapisywać w połowie i tak czy inaczej wracało do sieci.
function fullDatasetStorageKey(runId) {
  return `vue_playground_full_dataset:${runId}`
}

// Sprzątnij ewentualne stare, surowe wpisy cache po tests.php/cases.php —
// gdyby coś zdążyło się zapisać zanim skipPersist wszedł w życie, zwalnia
// to miejsce, żeby nie kolidowało z zapisem właściwego snapshotu poniżej.
function purgeRawPageCache() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('vue_playground_cache:') && (key.includes('/api/tests.php?') || key.includes('/api/cases.php?'))) {
        sessionStorage.removeItem(key)
      }
    }
  } catch {
    // nieistotne
  }
}

function saveFullDatasetSnapshot(runId, allTests, datesByTestId) {
  purgeRawPageCache()
  try {
    const slimTests = allTests.map((t) => ({ id: t.id, case_id: t.case_id, status_id: t.status_id, title: t.title }))
    sessionStorage.setItem(fullDatasetStorageKey(runId), JSON.stringify({ tests: slimTests, dates: datesByTestId }))
  } catch {
    // nadal za duże / brak miejsca — po prostu nie przetrwa F5, reszta apki działa dalej
  }
}

function loadFullDatasetSnapshot(runId) {
  try {
    const raw = sessionStorage.getItem(fullDatasetStorageKey(runId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Osobny watcher TYLKO na zmianę runu (nie na offset/limit/status) — inaczej
// zwykłe "Dalej"/"Wstecz" w trybie serwerowym (zmienia offset) na nowo
// odpytywałoby snapshot i wracało do trybu pełnego, mimo że użytkownik
// świadomie z niego wyszedł przez "Wróć do stronicowania serwerowego".
// Tu żyje restart stanu trybu pełnego: przy realnej zmianie runu (albo
// starcie/F5) sprawdzamy, czy jest zapisany snapshot i wracamy do niego.
watch(selectedRunId, (runId) => {
  fullTests.value = null
  clientStatusFilter.value = null
  hasCachedFullDataset.value = false

  if (runId) {
    const snapshot = loadFullDatasetSnapshot(runId)
    if (snapshot) {
      fullTests.value = snapshot.tests
      testCaseDates.value = { ...testCaseDates.value, ...snapshot.dates }
      hasCachedFullDataset.value = true
    }
  }
}, { immediate: true })

watch([selectedRunId, testsOffset, testsLimit, testsStatusFilter], ([runId, offset]) => {
  loadTests(runId, offset)
}, { immediate: true })

async function loadFullDataset(force = false) {
  if (!selectedRunId.value) return
  if (!force) {
    // Dane całego runu mogły już zostać wczytane wcześniej (np. użytkownik
    // wrócił do stronicowania serwerowego, a potem chce znów przejść do
    // trybu pełnego) — jeśli snapshot wciąż jest w sessionStorage, wracamy
    // do niego od razu zamiast odpytywać TestRail ponownie.
    const snapshot = loadFullDatasetSnapshot(selectedRunId.value)
    if (snapshot) {
      fullTests.value = snapshot.tests
      testCaseDates.value = { ...testCaseDates.value, ...snapshot.dates }
      return
    }
  }
  fullDatasetLoading.value = true
  error.value = null
  try {
    // 1) wszystkie testy w runie (nie tylko bieżąca strona)
    let offset = 0
    let all = []
    while (true) {
      const { data } = await cachedFetch(
          `${import.meta.env.BASE_URL}api/tests.php?run_id=${selectedRunId.value}&offset=${offset}&limit=250`,
          { force, skipPersist: true }
      )
      all = all.concat(data.tests)
      fullDatasetProgress.value = `Ładowanie testów… (${all.length})`
      if (!data._links?.next) break
      offset += 250
    }

    // 2) wszystkie case'y w suite (mają created_on/updated_on) — dużo taniej
    // niż pytanie o datę każdego z tych testów osobno (get_case per test)
    const suiteId = selectedRun.value?.suite_id
    let datesByTestId = {}
    if (suiteId && selectedProjectId.value) {
      offset = 0
      let count = 0
      const datesByCaseId = {}
      while (true) {
        const { data } = await cachedFetch(
            `${import.meta.env.BASE_URL}api/cases.php?project_id=${selectedProjectId.value}&suite_id=${suiteId}&offset=${offset}`,
            { force, skipPersist: true }
        )
        for (const c of data.cases) {
          datesByCaseId[c.id] = { created_on: c.created_on ?? null, updated_on: c.updated_on ?? null }
        }
        count += data.cases.length
        fullDatasetProgress.value = `Ładowanie dat… (${count})`
        if (!data._links?.next) break
        offset += 250
      }

      for (const t of all) {
        if (datesByCaseId[t.case_id]) datesByTestId[t.id] = datesByCaseId[t.case_id]
      }
      testCaseDates.value = { ...testCaseDates.value, ...datesByTestId }
    }

    fullTests.value = all
    saveFullDatasetSnapshot(selectedRunId.value, all, datesByTestId)
    hasCachedFullDataset.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    fullDatasetLoading.value = false
    fullDatasetProgress.value = ''
  }
}

function exitFullMode() {
  // Tylko przełączenie widoku z powrotem na stronicowanie serwerowe — snapshot
  // w sessionStorage zostaje, żeby "Załaduj cały run" mogło do niego wrócić
  // natychmiast, bez ponownego pobierania całego runu z TestRail.
  fullTests.value = null
  clientStatusFilter.value = null
  if (route.query.page) {
    router.push({ query: { ...route.query, page: undefined } })
  }
}

function onVisibleTestsChanged(visibleTests) {
  visibleTests.forEach((t) => {
    if (testResultCounts.value[t.id] === undefined) loadResultCount(t.id)
  })
}

function nextTestsPage() {
  router.push({ query: { ...route.query, offset: testsOffset.value + testsLimit.value } })
}

function prevTestsPage() {
  const newOffset = Math.max(0, testsOffset.value - testsLimit.value)
  router.push({ query: { ...route.query, offset: newOffset || undefined } })
}

function changeTestsPageSize(limit) {
  if (fullMode.value) return // TestList w trybie pełnym trzyma rozmiar strony lokalnie
  router.push({ query: { ...route.query, limit, offset: undefined } })
}

function filterByStatus(statusId) {
  if (fullMode.value) {
    clientStatusFilter.value = clientStatusFilter.value === statusId ? null : statusId
    return
  }
  const newStatus = testsStatusFilter.value === statusId ? undefined : statusId
  router.push({ query: { ...route.query, status: newStatus, offset: undefined } })
}

async function refreshAll() {
  await loadProjects(true)

  if (!selectedProjectId.value) return
  await loadMilestones(selectedProjectId.value, true)

  if (milestones.value.length === 0) {
    await loadRuns(selectedProjectId.value, null, true)
  } else if (selectedMilestoneId.value) {
    await loadRuns(selectedProjectId.value, selectedMilestoneId.value, true)
  }

  if (selectedRunId.value) {
    await loadTests(selectedRunId.value, testsOffset.value, true)
    // Celowo NIE odświeżamy tu całego wczytanego runu — dla dużych runów to
    // ~10 minut pobierania, a zwykłe "Odśwież" ma być szybkie. Jawne
    // odświeżenie pełnego zbioru robi osobny przycisk (refreshFullDataset).
  }
}

async function refreshFullDataset() {
  await loadFullDataset(true)
}

function openTest(testId) {
  selectedTest.value = effectiveTests.value.find((t) => t.id === testId) ?? null
}

function closeTestModal() {
  selectedTest.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)]">
    <div class="px-6 py-10">
      <div ref="contentEl" class="relative mx-auto min-w-[280px]">
        <header class="mb-8">
          <h1 class="text-2xl font-semibold text-[var(--text-h)]">TestRail Dashboard</h1>
          <p class="text-sm text-[var(--text)] mt-1">Przeglądaj projekty, milestone'y, runy i testy.</p>
        </header>

        <section class="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-5 mb-6">
          <div class="flex flex-wrap gap-4">
            <EntitySelect
                label="Projekt"
                :items="projects"
                :selected-id="selectedProjectId"
                :disabled="fullDatasetLoading || loading"
                @select="selectProject"
            />

            <EntitySelect
                label="Milestone"
                :items="milestones"
                :selected-id="selectedMilestoneId"
                :disabled="!milestonesEnabled || fullDatasetLoading || loading"
                @select="selectMilestone"
            />

            <EntitySelect
                label="Run"
                :items="runs"
                :selected-id="selectedRunId"
                :disabled="!runsEnabled || fullDatasetLoading || loading"
                @select="selectRun"
            />
          </div>

          <div
              class="hidden md:flex items-center justify-center absolute bottom-1 right-1 w-4 h-4 cursor-ew-resize text-[var(--text)]/40 hover:text-[var(--text)]"
              title="Przeciągnij, aby zmienić szerokość"
              @mousedown="startResize"
          >
            <svg viewBox="0 0 16 16" width="14" height="14">
              <line x1="15" y1="4" x2="4" y2="15" stroke="currentColor" stroke-width="1.5" />
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="1.5" />
              <line x1="15" y1="14" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
        </section>

        <div v-if="loading" class="text-sm text-[var(--text)] mb-4">Ładowanie…</div>
        <div v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</div>
        <div
            v-if="lastFetchedLabel && !loading"
            class="flex items-center gap-2 text-sm mb-6"
            :class="isStale ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text)]'"
        >
          <span>{{ isStale ? '⚠ Dane mogą być nieaktualne' : 'Zaktualizowano' }} ({{ lastFetchedLabel }}).</span>
          <button
              data-testid="refresh-data"
              :disabled="fullDatasetLoading"
              @click="refreshAll"
              class="underline hover:no-underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Odśwież
          </button>
        </div>

        <section
            v-if="selectedRunId"
            class="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-5"
        >
          <div v-if="selectedRun" class="flex items-center gap-2 text-sm mb-4">
          <button
              data-testid="filter-passed"
              :disabled="selectedRun.passed_count === 0 || loading || fullDatasetLoading"
              @click="filterByStatus(1)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="activeStatusFilter === 1 ? 'bg-emerald-500/15 ring-1 ring-emerald-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ✓ {{ selectedRun.passed_count }}
          </button>
          <button
              data-testid="filter-failed"
              :disabled="selectedRun.failed_count === 0 || loading || fullDatasetLoading"
              @click="filterByStatus(5)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-red-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="activeStatusFilter === 5 ? 'bg-red-500/15 ring-1 ring-red-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ✗ {{ selectedRun.failed_count }}
          </button>
          <button
              data-testid="filter-blocked"
              :disabled="selectedRun.blocked_count === 0 || loading || fullDatasetLoading"
              @click="filterByStatus(2)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-amber-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="activeStatusFilter === 2 ? 'bg-amber-500/15 ring-1 ring-amber-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ⏸ {{ selectedRun.blocked_count }}
          </button>
          <button
              data-testid="filter-retest"
              :disabled="selectedRun.retest_count === 0 || loading || fullDatasetLoading"
              @click="filterByStatus(4)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sky-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="activeStatusFilter === 4 ? 'bg-sky-500/15 ring-1 ring-sky-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ⟳ {{ selectedRun.retest_count }}
          </button>
          <button
              data-testid="filter-untested"
              :disabled="selectedRun.untested_count === 0 || loading || fullDatasetLoading"
              @click="filterByStatus(3)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text)] transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="activeStatusFilter === 3 ? 'bg-black/[0.06] dark:bg-white/[0.08] ring-1 ring-[var(--border)]' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ○ {{ selectedRun.untested_count }}
          </button>
          <button
              v-if="activeStatusFilter"
              data-testid="filter-clear"
              :disabled="loading || fullDatasetLoading"
              @click="filterByStatus(null)"
              class="text-xs text-[var(--text)] underline ml-1 disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Wyczyść filtr
          </button>
        </div>

        <div class="flex items-center gap-2 mb-4 text-xs text-[var(--text)]">
          <span
              v-if="fullDatasetLoading"
              data-testid="full-run-spinner"
              class="inline-block w-3.5 h-3.5 shrink-0 rounded-full border-2 border-[var(--border)] border-t-emerald-500 animate-spin"
          ></span>
          <button
              v-if="!fullMode"
              data-testid="load-full-run"
              :disabled="fullDatasetLoading || loading"
              @click="loadFullDataset()"
              class="underline hover:no-underline disabled:no-underline disabled:opacity-60"
          >
            {{ fullDatasetLoading
              ? fullDatasetProgress || 'Ładowanie…'
              : hasCachedFullDataset
                ? 'Wróć do trybu pełnego (bez ponownego pobierania)'
                : 'Załaduj cały run (sortowanie/filtrowanie po wszystkim)' }}
          </button>
          <template v-else>
            <span v-if="fullDatasetLoading" data-testid="full-run-progress">{{ fullDatasetProgress || 'Odświeżanie…' }}</span>
            <span v-else>Wczytano cały run ({{ fullTests.length }} testów).</span>
            <button
                data-testid="refresh-full-run"
                :disabled="fullDatasetLoading"
                @click="refreshFullDataset"
                class="underline hover:no-underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Odśwież cały zbiór
            </button>
            <button
                data-testid="exit-full-run"
                :disabled="fullDatasetLoading"
                @click="exitFullMode"
                class="underline hover:no-underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Wróć do stronicowania serwerowego
            </button>
          </template>
        </div>

        <TestList
            :tests="effectiveTests"
            :selected-test-id="selectedTest?.id ?? null"
            :page-size="testsLimit"
            :has-next="testsHasNext && pageDetailsLoaded"
            :has-prev="testsHasPrev && pageDetailsLoaded"
            :details-loading="!pageDetailsLoaded"
            :loading-block-nav="fullDatasetLoading"
            :tests-loading="loading"
            :result-counts="testResultCounts"
            :case-dates="testCaseDates"
            :client-paginate="fullMode"
            :page="clientPage"
            @update:page="updateClientPage"
            @select="openTest"
            @next-page="nextTestsPage"
            @prev-page="prevTestsPage"
            @change-page-size="changeTestsPageSize"
            @visible-tests-changed="onVisibleTestsChanged"
          />
        </section>

        <div
            class="hidden md:flex items-center justify-center absolute bottom-0 right-0 w-4 h-4 cursor-ew-resize text-[var(--text)]/40 hover:text-[var(--text)]"
            title="Przeciągnij, aby zmienić szerokość"
            @mousedown="startResize"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <line x1="15" y1="4" x2="4" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="14" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
      </div>
    </div>

    <TestDetailModal :test="selectedTest" @close="closeTestModal" />
  </div>
</template>

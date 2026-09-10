<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntitySelect from '../components/EntitySelect.vue'
import TestList from '../components/TestList.vue'
import TestDetailModal from '../components/TestDetailModal.vue'
import { useResizableWidth } from '../composables/useResizableWidth'

const route = useRoute()
const router = useRouter()

const filtersEl = ref(null)
const testsEl = ref(null)
const { startResize, resizingEl } = useResizableWidth('vue_playground_panels_width', [filtersEl, testsEl], 896)

const projects = ref([])
const milestones = ref([])
const milestonesLoaded = ref(false)
const runs = ref([])
const tests = ref([])
const testsOffset = ref(0)
const testsLimit = ref(20)
const testsStatusFilter = ref(null)
const testsHasNext = ref(false)
const testsHasPrev = ref(false)
const loading = ref(false)
const error = ref(null)
const selectedTest = ref(null)
const testResultCounts = ref({})

onMounted(async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}api/projects.php`)
  const data = await res.json()
  projects.value = data.projects
})

const selectedProjectId = computed(() =>
    route.params.projectId ? Number(route.params.projectId) : null
)
const selectedMilestoneId = computed(() =>
    route.params.milestoneId ? Number(route.params.milestoneId) : null
)
const selectedRunId = computed(() =>
    route.params.runId ? Number(route.params.runId) : null
)

const selectedRun = computed(() =>
    runs.value.find((r) => r.id === selectedRunId.value) ?? null
)

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

async function loadMilestones(projectId) {
  milestones.value = []
  milestonesLoaded.value = false
  error.value = null

  loading.value = true
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/milestones.php?project_id=${projectId}`)
    if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
    const data = await res.json()
    milestones.value = data.milestones
  } catch (e) {
    error.value = e.message
  } finally {
    milestonesLoaded.value = true
    loading.value = false
  }
}

async function loadRuns(projectId, milestoneId) {
  runs.value = []
  error.value = null

  loading.value = true
  try {
    const url = milestoneId
        ? `${import.meta.env.BASE_URL}api/runs.php?project_id=${projectId}&milestone_id=${milestoneId}`
        : `${import.meta.env.BASE_URL}api/runs.php?project_id=${projectId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
    const data = await res.json()
    runs.value = data.runs
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(selectedProjectId, async (projectId) => {
  runs.value = []
  tests.value = []
  testsOffset.value = 0
  testsStatusFilter.value = null
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
  testsOffset.value = 0
  testsStatusFilter.value = null

  if (!milestoneId) return
  loadRuns(selectedProjectId.value, milestoneId)
}, { immediate: true })

async function loadResultCount(testId) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/results.php?test_id=${testId}`)
    if (!res.ok) return
    const data = await res.json()
    testResultCounts.value = { ...testResultCounts.value, [testId]: data.results?.length ?? 0 }
  } catch {
    // licznik po prostu się nie pojawi, nie blokujemy reszty listy
  }
}

async function loadTests(runId, offset) {
  tests.value = []
  testResultCounts.value = {}
  error.value = null
  if (!runId) return

  loading.value = true
  try {
    let url = `${import.meta.env.BASE_URL}api/tests.php?run_id=${runId}&offset=${offset}&limit=${testsLimit.value}`
    if (testsStatusFilter.value) {
      url += `&status_id=${testsStatusFilter.value}`
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
    const data = await res.json()
    tests.value = data.tests
    testsHasNext.value = !!data._links?.next
    testsHasPrev.value = !!data._links?.prev
    tests.value.forEach((t) => loadResultCount(t.id))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(selectedRunId, (runId) => {
  testsOffset.value = 0
  testsStatusFilter.value = null
  loadTests(runId, 0)
}, { immediate: true })

function nextTestsPage() {
  testsOffset.value += testsLimit.value
  loadTests(selectedRunId.value, testsOffset.value)
}

function prevTestsPage() {
  testsOffset.value = Math.max(0, testsOffset.value - testsLimit.value)
  loadTests(selectedRunId.value, testsOffset.value)
}

function changeTestsPageSize(limit) {
  testsLimit.value = limit
  testsOffset.value = 0
  loadTests(selectedRunId.value, 0)
}

function filterByStatus(statusId) {
  testsStatusFilter.value = testsStatusFilter.value === statusId ? null : statusId
  testsOffset.value = 0
  loadTests(selectedRunId.value, 0)
}

function openTest(testId) {
  selectedTest.value = tests.value.find((t) => t.id === testId) ?? null
}

function closeTestModal() {
  selectedTest.value = null
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)]">
    <div class="max-w-[1600px] mx-auto px-6 py-10">
      <div class="max-w-4xl mx-auto">
        <header class="mb-8">
          <h1 class="text-2xl font-semibold text-[var(--text-h)]">TestRail Dashboard</h1>
          <p class="text-sm text-[var(--text)] mt-1">Przeglądaj projekty, milestone'y, runy i testy.</p>
        </header>
      </div>

      <section
          ref="filtersEl"
          class="relative mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-5 mb-6 min-w-[280px] transition-opacity duration-150"
          :class="{ 'opacity-40 pointer-events-none': resizingEl && resizingEl !== filtersEl }"
      >
        <div
            class="hidden md:flex items-center justify-center absolute bottom-1 right-1 w-4 h-4 cursor-ew-resize text-[var(--text)]/40 hover:text-[var(--text)]"
            title="Przeciągnij, aby zmienić szerokość"
            @mousedown="startResize($event, filtersEl)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <line x1="15" y1="4" x2="4" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="14" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>

        <div class="flex flex-wrap gap-4">
          <EntitySelect
              label="Projekt"
              :items="projects"
              :selected-id="selectedProjectId"
              @select="selectProject"
          />

          <EntitySelect
              label="Milestone"
              :items="milestones"
              :selected-id="selectedMilestoneId"
              :disabled="!milestonesEnabled"
              @select="selectMilestone"
          />

          <EntitySelect
              label="Run"
              :items="runs"
              :selected-id="selectedRunId"
              :disabled="!runsEnabled"
              @select="selectRun"
          />
        </div>
      </section>

      <div class="max-w-4xl mx-auto">
        <div v-if="loading" class="text-sm text-[var(--text)] mb-4">Ładowanie…</div>
        <div v-if="error" class="text-sm text-red-500 mb-4">{{ error }}</div>
      </div>

      <section
          v-if="selectedRunId"
          ref="testsEl"
          class="relative mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-5 min-w-[280px] transition-opacity duration-150"
          :class="{ 'opacity-40 pointer-events-none': resizingEl && resizingEl !== testsEl }"
      >
        <div
            class="hidden md:flex items-center justify-center absolute bottom-1 right-1 w-4 h-4 cursor-ew-resize text-[var(--text)]/40 hover:text-[var(--text)]"
            title="Przeciągnij, aby zmienić szerokość"
            @mousedown="startResize($event, testsEl)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <line x1="15" y1="4" x2="4" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="1.5" />
            <line x1="15" y1="14" x2="14" y2="15" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>

        <div v-if="selectedRun" class="flex items-center gap-2 text-sm mb-4">
          <button
              data-testid="filter-passed"
              :disabled="selectedRun.passed_count === 0"
              @click="filterByStatus(1)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="testsStatusFilter === 1 ? 'bg-emerald-500/15 ring-1 ring-emerald-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ✓ {{ selectedRun.passed_count }}
          </button>
          <button
              data-testid="filter-failed"
              :disabled="selectedRun.failed_count === 0"
              @click="filterByStatus(5)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-red-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="testsStatusFilter === 5 ? 'bg-red-500/15 ring-1 ring-red-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ✗ {{ selectedRun.failed_count }}
          </button>
          <button
              data-testid="filter-blocked"
              :disabled="selectedRun.blocked_count === 0"
              @click="filterByStatus(2)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-amber-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="testsStatusFilter === 2 ? 'bg-amber-500/15 ring-1 ring-amber-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ⏸ {{ selectedRun.blocked_count }}
          </button>
          <button
              data-testid="filter-retest"
              :disabled="selectedRun.retest_count === 0"
              @click="filterByStatus(4)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sky-500 transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="testsStatusFilter === 4 ? 'bg-sky-500/15 ring-1 ring-sky-500/50' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ⟳ {{ selectedRun.retest_count }}
          </button>
          <button
              data-testid="filter-untested"
              :disabled="selectedRun.untested_count === 0"
              @click="filterByStatus(3)"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text)] transition-colors disabled:opacity-40 disabled:cursor-default"
              :class="testsStatusFilter === 3 ? 'bg-black/[0.06] dark:bg-white/[0.08] ring-1 ring-[var(--border)]' : 'enabled:hover:bg-black/[0.03] enabled:dark:hover:bg-white/[0.04]'"
          >
            ○ {{ selectedRun.untested_count }}
          </button>
          <button
              v-if="testsStatusFilter"
              data-testid="filter-clear"
              @click="filterByStatus(null)"
              class="text-xs text-[var(--text)] underline ml-1"
          >
            Wyczyść filtr
          </button>
        </div>

        <TestList
            :tests="tests"
            :selected-test-id="selectedTest?.id ?? null"
            :page-size="testsLimit"
            :has-next="testsHasNext"
            :has-prev="testsHasPrev"
            :result-counts="testResultCounts"
            @select="openTest"
            @next-page="nextTestsPage"
            @prev-page="prevTestsPage"
            @change-page-size="changeTestsPageSize"
        />
      </section>
    </div>

    <TestDetailModal :test="selectedTest" @close="closeTestModal" />
  </div>
</template>

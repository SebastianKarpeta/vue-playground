<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectList from '../components/ProjectList.vue'
import MilestoneList from '../components/MilestoneList.vue'
import RunList from '../components/RunList.vue'

const route = useRoute()
const router = useRouter()

const projects = ref([])
const milestones = ref([])
const runs = ref([])
const loading = ref(false)
const error = ref(null)

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

function selectProject(projectId) {
  router.push({ name: 'project', params: { projectId } })
}

function selectMilestone(milestoneId) {
  router.push({ name: 'milestone', params: { projectId: selectedProjectId.value, milestoneId } })
}


watch(selectedProjectId, async (projectId) => {
  milestones.value = []
  runs.value = []
  error.value = null
  if (!projectId) return

  loading.value = true
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/milestones.php?project_id=${projectId}`)
    if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
    const data = await res.json()
    milestones.value = data.milestones
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}, { immediate: true })

watch(selectedMilestoneId, async (milestoneId) => {
  runs.value = []
  error.value = null
  if (!milestoneId) return

  loading.value = true
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/runs.php?project_id=${selectedProjectId.value}&milestone_id=${milestoneId}`)
    if (!res.ok) throw new Error(`TestRail zwrócił błąd: ${res.status}`)
    const data = await res.json()
    runs.value = data.runs
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <div class="p-8 flex gap-8">
    <ProjectList
        :projects="projects"
        :selected-project-id="selectedProjectId"
        @select="selectProject"
    />

    <MilestoneList
        v-if="selectedProjectId"
        :milestones="milestones"
        :selected-milestone-id="selectedMilestoneId"
        @select="selectMilestone"
    />

    <div v-if="loading" class="text-gray-500">Ładowanie...</div>
    <div v-if="error" class="text-red-600">{{ error }}</div>

    <RunList v-if="selectedMilestoneId && !loading" :runs="runs" />
  </div>
</template>
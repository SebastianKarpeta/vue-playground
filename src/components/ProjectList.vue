<script setup>
defineProps({
  projects: {type: Array, required: true},
  selectedProjectId: {type: Number, default: null},
})

const emit = defineEmits(['select'])
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Projekty</h1>
    <ul>
      <li
          v-for="p in projects"
          :key="p.id"
          data-testid="project-item"
          @click="emit('select', p.id)"
          class="cursor-pointer mb-1 hover:text-emerald-600"
          :class="{ 'font-bold text-emerald-600': p.id === selectedProjectId }"
      >
        <span v-if="![13,14].includes(p.id)">
          {{ p.name }}
        </span>
      </li>
    </ul>
  </div>
</template>
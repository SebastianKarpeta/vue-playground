<script setup>
defineProps({
  milestones: { type: Array, required: true },
  selectedMilestoneId: { type: Number, default: null },
})

const emit = defineEmits(['select'])
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-4">Milestone'y</h2>
    <ul>
      <li
          v-for="m in milestones"
          :key="m.id"
          data-testid="milestone-item"
          @click="emit('select', m.id)"
          class="cursor-pointer mb-1 hover:text-emerald-600"
          :class="{ 'font-bold text-emerald-600': m.id === selectedMilestoneId }"
      >
        {{ m.name }}
      </li>
    </ul>
  </div>
</template>
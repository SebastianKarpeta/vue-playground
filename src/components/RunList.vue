<script setup>
import { computed } from 'vue'

const props = defineProps({
  runs: { type: Array, required: true },
})

const totals = computed(() => {
  return props.runs.reduce((acc, r) => {
    acc.passed += r.passed_count
    acc.failed += r.failed_count
    acc.blocked += r.blocked_count
    return acc
  }, { passed: 0, failed: 0, blocked: 0 })
})
</script>

<template>
  <div>
    <h3 class="text-lg font-bold mb-2">Runy</h3>

    <div class="text-sm text-gray-600 mb-4">
      Razem: {{ totals.passed }} zaliczonych, {{ totals.failed }} oblanych, {{ totals.blocked }} zablokowanych
    </div>

    <ul>
      <li v-for="r in runs" :key="r.id" data-testid="run-item" class="mb-3">
        <div class="font-medium">{{ r.name }}</div>
        <div class="flex gap-2 text-sm mt-1">
          <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">✓ {{ r.passed_count }}</span>
          <span class="px-2 py-0.5 rounded bg-red-100 text-red-700">✗ {{ r.failed_count }}</span>
          <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-700">⏸ {{ r.blocked_count }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>
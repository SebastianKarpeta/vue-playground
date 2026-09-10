<script setup>
defineProps({
  label: { type: String, required: true },
  items: { type: Array, required: true },
  selectedId: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '— wybierz —' },
})

const emit = defineEmits(['select'])

function onChange(event) {
  const value = event.target.value
  emit('select', value ? Number(value) : null)
}
</script>

<template>
  <label class="flex flex-col gap-1.5 text-sm flex-1 min-w-[200px]">
    <span class="font-medium text-[var(--text-h)]">{{ label }}</span>
    <select
        :value="selectedId ?? ''"
        :disabled="disabled"
        @change="onChange"
        data-testid="entity-select"
        class="appearance-none border border-[var(--border)] bg-[var(--surface)] text-[var(--text-h)] rounded-lg px-3 py-2 pr-9
               bg-[image:var(--chevron)] bg-no-repeat bg-[right_0.75rem_center]
               focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500
               disabled:bg-[var(--bg)] disabled:text-[var(--text)]/50 disabled:cursor-not-allowed disabled:opacity-60
               transition-colors"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="item in items" :key="item.id" :value="item.id">{{ item.name }}</option>
    </select>
  </label>
</template>

<style scoped>
select {
  --chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
}
</style>

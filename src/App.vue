<script setup>
import { ref, onMounted } from 'vue'
import TestRailSetup from './components/TestRailSetup.vue'
import { isTauri, getStoredCredentials } from './composables/tauriApi'

// W wersji webowej dane logowania siedzą w api/config.php na serwerze —
// tam ten ekran nigdy się nie pojawia. W wersji Tauri każdy, kto dostanie
// exe, wpisuje własne dane logowania przy pierwszym uruchomieniu; trzymane
// są tylko lokalnie na jego komputerze (patrz src-tauri/src/testrail.rs).
const needsSetup = ref(false)
const checked = ref(false)

onMounted(async () => {
  if (isTauri()) {
    const creds = await getStoredCredentials()
    needsSetup.value = !creds
  }
  checked.value = true
})
</script>

<template>
  <TestRailSetup v-if="checked && needsSetup" @connected="needsSetup = false" />
  <RouterView v-else-if="checked" />
</template>

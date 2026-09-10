<script setup>
import { ref } from 'vue'
import { saveCredentials, testCredentials } from '../composables/tauriApi'

const emit = defineEmits(['connected'])

const url = ref('')
const user = ref('')
const key = ref('')
const checking = ref(false)
const error = ref(null)

async function connect() {
  error.value = null
  checking.value = true
  try {
    const trimmedUrl = url.value.trim()
    const trimmedUser = user.value.trim()
    const trimmedKey = key.value.trim()
    // Najpierw sprawdzamy dane na żywo, dopiero potem zapisujemy — inaczej
    // błędne dane trafiłyby na dysk jako "skonfigurowane" i ten ekran już
    // by się drugi raz nie pojawił, mimo że nic by nie działało.
    await testCredentials(trimmedUrl, trimmedUser, trimmedKey)
    await saveCredentials(trimmedUrl, trimmedUser, trimmedKey)
    emit('connected')
  } catch (e) {
    error.value = e.message
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
    <div class="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-6">
      <h1 class="text-xl font-semibold text-[var(--text-h)] mb-1">Połącz z TestRail</h1>
      <p class="text-sm text-[var(--text)] mb-5">
        Dane logowania zostają zapisane tylko lokalnie, na tym komputerze.
      </p>

      <form class="flex flex-col gap-3" @submit.prevent="connect">
        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-[var(--text-h)]">Adres TestRail</span>
          <input
              v-model="url"
              type="url"
              required
              placeholder="https://twojafirma.testrail.io"
              data-testid="setup-url"
              class="border border-[var(--border)] bg-[var(--bg)] rounded-lg px-3 py-2 text-[var(--text-h)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-[var(--text-h)]">E-mail</span>
          <input
              v-model="user"
              type="email"
              required
              placeholder="jan.kowalski@firma.pl"
              data-testid="setup-user"
              class="border border-[var(--border)] bg-[var(--bg)] rounded-lg px-3 py-2 text-[var(--text-h)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-[var(--text-h)]">Klucz API</span>
          <input
              v-model="key"
              type="password"
              required
              placeholder="Ustawienia konta → API Keys w TestRail"
              data-testid="setup-key"
              class="border border-[var(--border)] bg-[var(--bg)] rounded-lg px-3 py-2 text-[var(--text-h)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </label>

        <div v-if="error" class="text-sm text-red-500" data-testid="setup-error">{{ error }}</div>

        <button
            type="submit"
            data-testid="setup-connect"
            :disabled="checking"
            class="mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {{ checking ? 'Łączenie…' : 'Zapisz i połącz' }}
        </button>
      </form>
    </div>
  </div>
</template>

import { onMounted, onUnmounted, watch } from 'vue'

const MIN_WIDTH = 280
// Matches Tailwind's `md:` breakpoint — the resize grip is `hidden md:flex`,
// so the width it produces must only ever apply at that size too. Below it,
// a stale/desktop-sized cookie would force the whole page wider than the
// viewport and make it scroll horizontally.
const DESKTOP_BREAKPOINT = 768

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function isDesktop() {
  return window.innerWidth >= DESKTOP_BREAKPOINT
}

// Drag-to-resize for ONE shared content wrapper (header + both cards live
// inside it), so everything always shares the same left edge — centering
// two independently-resized boxes around one midpoint misaligns their left
// edges the moment they're different widths, which is exactly what
// happened when the header and the resizable cards were centered
// separately. Width is restored from / persisted to a cookie, and only
// ever applied on desktop-sized viewports (see DESKTOP_BREAKPOINT above).
export function useResizableWidth(cookieName, contentEl, defaultWidth) {
  let dragging = false
  let startX = 0
  let startWidth = 0

  function clampWidth(px) {
    const maxWidth = window.innerWidth - 48
    return Math.min(maxWidth, Math.max(MIN_WIDTH, Math.round(px)))
  }

  function applyStoredWidth(el) {
    if (!isDesktop()) {
      el.style.removeProperty('width')
      return
    }
    const saved = getCookie(cookieName)
    el.style.width = (saved ?? defaultWidth) + 'px'
  }

  function onMouseMove(event) {
    if (!dragging || !contentEl.value) return
    contentEl.value.style.width = clampWidth(startWidth + (event.clientX - startX)) + 'px'
  }

  function onMouseUp() {
    if (!dragging) return
    dragging = false
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    if (contentEl.value) {
      setCookie(cookieName, Math.round(contentEl.value.getBoundingClientRect().width))
    }
  }

  function startResize(event) {
    if (!contentEl.value || !isDesktop()) return
    dragging = true
    startX = event.clientX
    startWidth = contentEl.value.getBoundingClientRect().width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    event.preventDefault()
  }

  function onWindowResize() {
    if (contentEl.value) applyStoredWidth(contentEl.value)
  }

  watch(contentEl, (newEl) => {
    if (!newEl) return
    applyStoredWidth(newEl)
  }, { immediate: true, flush: 'sync' })

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('resize', onWindowResize)
  })
  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('resize', onWindowResize)
  })

  return { startResize }
}

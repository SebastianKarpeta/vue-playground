import { onMounted, onUnmounted, ref, watch } from 'vue'

const MIN_WIDTH = 280

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name, value) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

// Custom drag-to-resize (not the native CSS `resize` handle — its drag
// doesn't dispatch reliably observable events across browsers, so keeping
// two elements in sync off it isn't dependable).
// Only the element actually being dragged resizes live; the other one(s)
// dim out (`resizingEl` exposed for that) and snap to the final width on
// mouseup, which is also when the shared width is persisted to a cookie.
export function useResizableWidth(cookieName, elRefs, defaultWidth) {
  const resizingEl = ref(null)
  let startX = 0
  let startWidth = 0

  function applyWidthToAll(px) {
    const clamped = Math.max(MIN_WIDTH, Math.round(px))
    for (const elRef of elRefs) {
      if (elRef.value) elRef.value.style.width = clamped + 'px'
    }
  }

  function onMouseMove(event) {
    if (!resizingEl.value) return
    const newWidth = Math.max(MIN_WIDTH, Math.round(startWidth + (event.clientX - startX)))
    resizingEl.value.style.width = newWidth + 'px'
  }

  function onMouseUp() {
    if (!resizingEl.value) return
    const finalWidth = resizingEl.value.getBoundingClientRect().width
    applyWidthToAll(finalWidth)
    setCookie(cookieName, Math.round(finalWidth))
    resizingEl.value = null
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }

  function startResize(event, el) {
    resizingEl.value = el
    startX = event.clientX
    startWidth = el.getBoundingClientRect().width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    event.preventDefault()
  }

  elRefs.forEach((elRef) => {
    watch(elRef, (newEl) => {
      if (!newEl) return
      const saved = getCookie(cookieName)
      newEl.style.width = (saved ?? defaultWidth) + 'px'
    }, { immediate: true, flush: 'sync' })
  })

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  })
  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  })

  return { startResize, resizingEl }
}

export function formatRelativeTime(ageMs) {
  const seconds = Math.floor(ageMs / 1000)
  if (seconds < 10) return 'przed chwilą'
  if (seconds < 60) return `${seconds} s temu`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  return `${hours} godz. temu`
}

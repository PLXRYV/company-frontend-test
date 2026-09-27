const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

const startOfDay = (ts: number) => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const DAY = 24 * 60 * 60 * 1000

export function formatTime(ts: number): string {
  return timeFormatter.format(ts)
}

/** Время в списке чатов: сегодня — часы, на этой неделе — день недели, иначе дата. */
export function formatChatListTime(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  if (diffDays === 0) return formatTime(ts)
  if (diffDays < 7) return weekdayFormatter.format(ts)
  return shortDateFormatter.format(ts)
}

/** Разделитель дат в ленте сообщений. */
export function formatDayDivider(ts: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  return new Date(ts).getFullYear() === new Date(now).getFullYear()
    ? dayMonthFormatter.format(ts)
    : fullDateFormatter.format(ts)
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function initials(name: string): string {
  const letters = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
  return letters || '#'
}

const AVATAR_GRADIENTS = [
  ['#ff8a65', '#ff5277'],
  ['#4facfe', '#3d6bff'],
  ['#43e97b', '#1fb88a'],
  ['#a18cd1', '#7b5cff'],
  ['#f6d365', '#fda085'],
  ['#5ee7df', '#3aa0e8'],
  ['#f093fb', '#c34dd8'],
]

/** Стабильный цвет аватара по ключу чата. */
export function avatarGradient(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const [from, to] = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

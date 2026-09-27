import type { Credentials } from '../api/types'
import type { ChatState } from '../store/chatReducer'

const CREDENTIALS_KEY = 'max-chat:credentials'
const chatsKey = (idInstance: string) => `max-chat:chats:${idInstance}`

/** Хранилище может быть недоступно (приватный режим, запрет cookies) — не падаем. */
function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    /* хранилище недоступно или переполнено */
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function isCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.idInstance === 'string' &&
    typeof v.apiTokenInstance === 'string' &&
    typeof v.apiUrl === 'string'
  )
}

export function loadCredentials(): Credentials | null {
  const raw = safeGet(localStorage, CREDENTIALS_KEY) ?? safeGet(sessionStorage, CREDENTIALS_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isCredentials(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** remember=true — localStorage (переживает перезапуск браузера), иначе только текущая вкладка. */
export function saveCredentials(credentials: Credentials, remember: boolean): void {
  clearCredentials()
  safeSet(remember ? localStorage : sessionStorage, CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function clearCredentials(): void {
  safeRemove(localStorage, CREDENTIALS_KEY)
  safeRemove(sessionStorage, CREDENTIALS_KEY)
}

export function loadChats(idInstance: string): ChatState | null {
  const raw = safeGet(localStorage, chatsKey(idInstance))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ChatState
    if (!Array.isArray(parsed.chats)) return null
    // Сообщения, которые не успели уйти до перезагрузки, помечаем ошибкой, чтобы их можно было повторить.
    return {
      activeChatId: parsed.activeChatId ?? null,
      chats: parsed.chats.map((chat) => ({
        ...chat,
        messages: chat.messages.map((m) =>
          m.status === 'sending'
            ? { ...m, status: 'error' as const, error: 'Отправка прервана' }
            : m,
        ),
      })),
    }
  } catch {
    return null
  }
}

export function saveChats(idInstance: string, state: ChatState): void {
  safeSet(localStorage, chatsKey(idInstance), JSON.stringify(state))
}

import { useEffect, useRef, useState } from 'react'
import type { GreenApiClient } from '../api/greenApi'
import { GreenApiError } from '../api/greenApi'
import type { ChatEvent } from '../lib/notifications'
import { parseNotification } from '../lib/notifications'

/** Вход уже проверен через getStateInstance, поэтому стартуем в «online». */
export type ConnectionStatus = 'online' | 'reconnecting'

/** Сколько секунд сервер держит запрос открытым, если очередь пуста (5–60). */
const RECEIVE_TIMEOUT_SEC = 20
const MAX_BACKOFF_MS = 15_000

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

/**
 * Получение входящих уведомлений по технологии HTTP API:
 * ReceiveNotification (long polling) → обработка → DeleteNotification.
 * Уведомления из очереди отдаются строго по порядку (FIFO), поэтому цикл последовательный.
 */
export function useNotificationPolling(
  client: GreenApiClient,
  onEvent: (event: ChatEvent) => void,
): { status: ConnectionStatus; error: string | null } {
  const [status, setStatus] = useState<ConnectionStatus>('online')
  const [error, setError] = useState<string | null>(null)

  // Колбэк в ref, чтобы новый onEvent не перезапускал цикл опроса.
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let backoff = 1000

    async function loop() {
      while (!signal.aborted) {
        try {
          const notification = await client.receiveNotification(RECEIVE_TIMEOUT_SEC, signal)
          setStatus('online')
          setError(null)
          backoff = 1000

          if (!notification) continue

          const event = parseNotification(notification.body)
          if (event) onEventRef.current(event)

          // Удаляем даже неподдерживаемые уведомления, иначе очередь «застрянет» на них.
          await client.deleteNotification(notification.receiptId, signal)
        } catch (err) {
          if (signal.aborted) return
          setStatus('reconnecting')
          setError(err instanceof GreenApiError ? err.message : 'Ошибка получения сообщений')
          await sleep(backoff, signal)
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
        }
      }
    }

    void loop()
    return () => controller.abort()
  }, [client])

  return { status, error }
}

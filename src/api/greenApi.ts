import type {
  CheckAccountResponse,
  Credentials,
  ReceiveNotificationResponse,
  SendMessageResponse,
  StateInstanceResponse,
} from './types'

/** Ошибка запроса к GREEN-API с HTTP-статусом и понятным текстом. */
export class GreenApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

/**
 * Хост API по умолчанию.
 * GREEN-API распределяет инстансы по кластерам: первые 4 цифры idInstance
 * совпадают с поддоменом, например 3100123456 → https://3100.api.green-api.com
 */
export function defaultApiUrl(idInstance: string): string {
  const digits = idInstance.replace(/\D/g, '')
  if (digits.length < 4) return 'https://api.green-api.com'
  return `https://${digits.slice(0, 4)}.api.green-api.com`
}

export function buildUrl(credentials: Credentials, method: string, suffix = ''): string {
  const base = credentials.apiUrl.replace(/\/+$/, '')
  return `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${suffix}`
}

const HTTP_ERRORS: Record<number, string> = {
  400: 'Некорректный запрос',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Доступ запрещён: проверьте idInstance и apiTokenInstance',
  404: 'Инстанс не найден: проверьте idInstance',
  429: 'Слишком много запросов, попробуйте чуть позже',
  466: 'Достигнут лимит тарифа Developer',
  500: 'Внутренняя ошибка GREEN-API',
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new GreenApiError('Нет соединения с GREEN-API. Проверьте интернет', 0)
  }

  const text = await response.text()

  if (!response.ok) {
    let details = ''
    try {
      const parsed = JSON.parse(text) as { message?: string; reason?: string }
      details = parsed.message ?? parsed.reason ?? ''
    } catch {
      details = text
    }
    const base = HTTP_ERRORS[response.status] ?? `Ошибка ${response.status}`
    throw new GreenApiError(details ? `${base}: ${details}` : base, response.status)
  }

  // receiveNotification возвращает пустое тело или null, если очередь пуста
  if (!text || text === 'null') return null as T
  return JSON.parse(text) as T
}

/** Тонкий клиент над HTTP API GREEN-API. */
export function createGreenApiClient(credentials: Credentials) {
  return {
    getStateInstance(signal?: AbortSignal) {
      return request<StateInstanceResponse>(buildUrl(credentials, 'getStateInstance'), { signal })
    },

    sendMessage(chatId: string, message: string) {
      return request<SendMessageResponse>(buildUrl(credentials, 'sendMessage'), {
        method: 'POST',
        body: JSON.stringify({ chatId, message }),
      })
    },

    checkAccount(phoneNumber: string) {
      return request<CheckAccountResponse>(buildUrl(credentials, 'checkAccount'), {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
      })
    },

    receiveNotification(receiveTimeout: number, signal?: AbortSignal) {
      return request<ReceiveNotificationResponse | null>(
        buildUrl(credentials, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
        { signal },
      )
    },

    deleteNotification(receiptId: number, signal?: AbortSignal) {
      return request<{ result: boolean }>(
        buildUrl(credentials, 'deleteNotification', `/${receiptId}`),
        { method: 'DELETE', signal },
      )
    },
  }
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>

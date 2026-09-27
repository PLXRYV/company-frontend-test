import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildUrl, createGreenApiClient, defaultApiUrl, GreenApiError } from './greenApi'

const credentials = {
  idInstance: '3100123456',
  apiTokenInstance: 'token',
  apiUrl: 'https://3100.api.green-api.com',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(body === null ? '' : JSON.stringify(body), { status })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('greenApi', () => {
  it('определяет хост API по idInstance', () => {
    expect(defaultApiUrl('3100123456')).toBe('https://3100.api.green-api.com')
    expect(defaultApiUrl('7103000000')).toBe('https://7103.api.green-api.com')
  })

  it('собирает URL метода', () => {
    expect(buildUrl(credentials, 'sendMessage')).toBe(
      'https://3100.api.green-api.com/waInstance3100123456/sendMessage/token',
    )
    expect(buildUrl({ ...credentials, apiUrl: 'https://x.com/' }, 'deleteNotification', '/5')).toBe(
      'https://x.com/waInstance3100123456/deleteNotification/token/5',
    )
  })

  it('отправляет сообщение методом SendMessage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ idMessage: 'm1' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createGreenApiClient(credentials).sendMessage('10000000', 'Привет')

    expect(result).toEqual({ idMessage: 'm1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/sendMessage/token')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', message: 'Привет' })
  })

  it('возвращает null, когда очередь уведомлений пуста', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null)))
    await expect(createGreenApiClient(credentials).receiveNotification(5)).resolves.toBeNull()
  })

  it('удаляет уведомление методом DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: true }))
    vi.stubGlobal('fetch', fetchMock)
    await createGreenApiClient(credentials).deleteNotification(42)
    expect(fetchMock.mock.calls[0][0]).toMatch(/deleteNotification\/token\/42$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('превращает HTTP-ошибки в понятный текст', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
    const error = await createGreenApiClient(credentials).getStateInstance().catch((e) => e)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error.status).toBe(401)
    expect(error.message).toMatch(/Неверный idInstance/)
  })

  it('сообщает об отсутствии сети', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(createGreenApiClient(credentials).getStateInstance()).rejects.toMatchObject({
      status: 0,
    })
  })
})

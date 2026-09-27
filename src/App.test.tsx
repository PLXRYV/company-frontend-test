import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/**
 * Сценарий из ТЗ целиком, с подменённым GREEN-API:
 * вход → новый чат по номеру → отправка сообщения → ответ получателя появляется в чате.
 */
describe('App: сценарий из ТЗ', () => {
  let replyQueued = false
  let replyDelivered = false
  const deleted: number[] = []

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    replyQueued = false
    replyDelivered = false
    deleted.length = 0

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input)
        const json = (body: unknown) => new Response(body === null ? '' : JSON.stringify(body))

        if (url.includes('/getStateInstance/')) return json({ stateInstance: 'authorized' })
        if (url.includes('/checkAccount/')) return json({ exist: true, chatId: '10000000' })
        if (url.includes('/sendMessage/')) {
          expect(JSON.parse(String(init?.body))).toEqual({ chatId: '10000000', message: 'Привет!' })
          replyQueued = true
          return json({ idMessage: 'out-1' })
        }
        if (url.includes('/deleteNotification/')) {
          deleted.push(Number(url.split('/').pop()))
          return json({ result: true })
        }
        if (url.includes('/receiveNotification/')) {
          if (replyQueued && !replyDelivered) {
            replyDelivered = true
            return json({
              receiptId: 7,
              body: {
                typeWebhook: 'incomingMessageReceived',
                timestamp: Math.floor(Date.now() / 1000),
                idMessage: 'in-1',
                senderData: {
                  chatId: '10000000',
                  chatType: 'user',
                  senderName: 'Иван',
                  senderPhoneNumber: 79991234567,
                },
                messageData: {
                  typeMessage: 'textMessage',
                  textMessageData: { textMessage: 'И тебе привет!' },
                },
              },
            })
          }
          await new Promise((r) => setTimeout(r, 20))
          return json(null)
        }
        return new Response('', { status: 404 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('отправляет сообщение и показывает ответ', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), '3100123456')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    await user.click(await screen.findByRole('button', { name: /Новый чат/ }))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '+7 999 123-45-67')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    const input = await screen.findByLabelText('Текст сообщения')
    await user.type(input, 'Привет!{Enter}')

    const log = screen.getByRole('log')
    expect(await within(log).findByText('Привет!')).toBeInTheDocument()
    expect(await within(log).findByText('И тебе привет!')).toBeInTheDocument()
    await waitFor(() => expect(deleted).toContain(7))
  })

  it('показывает ошибку, если инстанс не авторизован', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ stateInstance: 'notAuthorized' })))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), '3100123456')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/не авторизован/)
  })
})

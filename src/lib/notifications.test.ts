import { describe, expect, it } from 'vitest'
import type { Webhook } from '../api/types'
import { parseNotification } from './notifications'

// Пример из документации GREEN-API (Входящее текстовое сообщение)
const incoming: Webhook = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет от Green-API!' },
  },
} as Webhook

describe('parseNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseNotification(incoming)).toEqual({
      type: 'message',
      chatId: '10000000',
      phone: '79876543210',
      contactName: 'Ходабрыш Пробешёлов',
      idMessage: '1763115112345',
      text: 'Привет от Green-API!',
      direction: 'in',
      timestamp: 1763115112000,
    })
  })

  it('разбирает текст со ссылкой (extendedTextMessage)', () => {
    const event = parseNotification({
      ...incoming,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com' },
      },
    } as Webhook)
    expect(event).toMatchObject({ type: 'message', text: 'https://green-api.com' })
  })

  it('помечает отправленные с телефона сообщения как исходящие', () => {
    const event = parseNotification({ ...incoming, typeWebhook: 'outgoingMessageReceived' } as Webhook)
    expect(event).toMatchObject({ direction: 'out', phone: undefined })
  })

  it('игнорирует нетекстовые сообщения и группы', () => {
    expect(
      parseNotification({ ...incoming, messageData: { typeMessage: 'imageMessage' } } as Webhook),
    ).toBeNull()
    expect(
      parseNotification({
        ...incoming,
        senderData: { chatId: '-100', chatType: 'group' },
      } as Webhook),
    ).toBeNull()
  })

  it('разбирает статус исходящего сообщения', () => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        timestamp: 1,
        chatId: '10000000',
        idMessage: 'abc',
        status: 'read',
      } as Webhook),
    ).toEqual({ type: 'status', chatId: '10000000', idMessage: 'abc', status: 'read' })
  })

  it('возвращает null для неизвестных уведомлений', () => {
    expect(parseNotification({ typeWebhook: 'deviceInfo', timestamp: 1 })).toBeNull()
    expect(parseNotification(null)).toBeNull()
  })
})

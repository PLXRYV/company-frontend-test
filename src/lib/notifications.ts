import type { InstanceState, MessageWebhook, OutgoingStatus, StatusWebhook, Webhook } from '../api/types'

export type Direction = 'in' | 'out'

/** Нормализованное событие, которое понимает стор приложения. */
export type ChatEvent =
  | {
      type: 'message'
      chatId: string
      /** Номер собеседника, если GREEN-API его прислал (для входящих). */
      phone?: string
      contactName?: string
      idMessage: string
      text: string
      direction: Direction
      timestamp: number
    }
  | { type: 'status'; chatId: string; idMessage: string; status: OutgoingStatus }
  | { type: 'state'; state: InstanceState }

const MESSAGE_WEBHOOKS = new Set([
  'incomingMessageReceived',
  'outgoingMessageReceived',
  'outgoingAPIMessageReceived',
])

const KNOWN_STATUSES = new Set<OutgoingStatus>([
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'noAccount',
])

function extractText(webhook: MessageWebhook): string | null {
  const { messageData } = webhook
  switch (messageData?.typeMessage) {
    case 'textMessage':
      return messageData.textMessageData?.textMessage ?? null
    case 'extendedTextMessage':
      return messageData.extendedTextMessageData?.text ?? null
    default:
      return null
  }
}

function isMessageWebhook(body: Webhook): body is MessageWebhook {
  return MESSAGE_WEBHOOKS.has(body.typeWebhook) && 'senderData' in body
}

/**
 * Превращает уведомление GREEN-API в событие приложения.
 * Возвращает null для всего, что не относится к текстовым сообщениям личных чатов:
 * по ТЗ поддерживаются только текстовые сообщения.
 */
export function parseNotification(body: Webhook | null | undefined): ChatEvent | null {
  if (!body) return null

  if (isMessageWebhook(body)) {
    const { senderData } = body
    if (senderData.chatType === 'group') return null

    const text = extractText(body)
    if (text === null) return null

    const incoming = body.typeWebhook === 'incomingMessageReceived'
    const phone =
      incoming && senderData.senderPhoneNumber ? String(senderData.senderPhoneNumber) : undefined

    return {
      type: 'message',
      chatId: senderData.chatId,
      phone,
      contactName: incoming
        ? senderData.senderContactName || senderData.senderName || undefined
        : senderData.chatName || undefined,
      idMessage: body.idMessage,
      text,
      direction: incoming ? 'in' : 'out',
      timestamp: body.timestamp * 1000,
    }
  }

  if (body.typeWebhook === 'outgoingMessageStatus') {
    const status = body as StatusWebhook
    if (!KNOWN_STATUSES.has(status.status as OutgoingStatus)) return null
    return {
      type: 'status',
      chatId: status.chatId,
      idMessage: status.idMessage,
      status: status.status as OutgoingStatus,
    }
  }

  if (body.typeWebhook === 'stateInstanceChanged' && 'stateInstance' in body) {
    return { type: 'state', state: body.stateInstance }
  }

  return null
}

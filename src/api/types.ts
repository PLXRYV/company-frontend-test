/**
 * Типы GREEN-API (MAX, v3), которые использует приложение.
 * Описаны только поля, нужные для отправки и получения текстовых сообщений.
 * Документация: https://green-api.com/v3/docs/api/
 */

export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  /** Хост API, например https://3100.api.green-api.com */
  apiUrl: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'starting'
  | 'blocked'
  | 'sleepMode'
  | 'yellowCard'
  | 'suspended'
  | (string & {})

export interface StateInstanceResponse {
  stateInstance: InstanceState
}

export interface SendMessageResponse {
  idMessage: string
}

export interface CheckAccountResponse {
  exist?: boolean
  chatId?: string
  /** Поле ответа для WhatsApp-инстансов */
  existsWhatsapp?: boolean
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: 'user' | 'group' | (string & {})
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

interface BaseWebhook {
  typeWebhook: string
  timestamp: number
  instanceData?: { idInstance: number; wid?: string; typeInstance?: string }
}

export interface MessageWebhook extends BaseWebhook {
  typeWebhook:
    | 'incomingMessageReceived'
    | 'outgoingMessageReceived'
    | 'outgoingAPIMessageReceived'
  idMessage: string
  senderData: SenderData
  messageData: MessageData
}

export type OutgoingStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'

export interface StatusWebhook extends BaseWebhook {
  typeWebhook: 'outgoingMessageStatus'
  chatId: string
  idMessage: string
  status: OutgoingStatus | (string & {})
}

export interface StateWebhook extends BaseWebhook {
  typeWebhook: 'stateInstanceChanged'
  stateInstance: InstanceState
}

export interface UnknownWebhook extends BaseWebhook {
  typeWebhook: string
}

export type Webhook = MessageWebhook | StatusWebhook | StateWebhook | UnknownWebhook

export interface ReceiveNotificationResponse {
  receiptId: number
  body: Webhook
}

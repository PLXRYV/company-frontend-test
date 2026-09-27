import type { OutgoingStatus } from '../api/types'
import type { ChatEvent, Direction } from '../lib/notifications'

export type MessageStatus = 'sending' | 'error' | OutgoingStatus

export interface Message {
  /** idMessage из GREEN-API или временный id, пока сообщение отправляется. */
  id: string
  direction: Direction
  text: string
  timestamp: number
  status?: MessageStatus
  error?: string
}

export interface Chat {
  /** Локальный ключ чата: номер телефона, если он известен, иначе chatId. */
  id: string
  /** Идентификатор для отправки: chatId MAX или 79991234567@c.us. */
  chatId: string
  phone?: string
  name?: string
  messages: Message[]
  unread: number
  updatedAt: number
}

export interface ChatState {
  chats: Chat[]
  activeChatId: string | null
}

export type ChatAction =
  | { type: 'chatOpened'; phone: string; chatId: string; name?: string }
  | { type: 'chatSelected'; id: string | null }
  | { type: 'chatRemoved'; id: string }
  | { type: 'messageQueued'; chatKey: string; tempId: string; text: string; timestamp: number }
  | { type: 'messageSent'; chatKey: string; tempId: string; idMessage: string }
  | { type: 'messageFailed'; chatKey: string; tempId: string; error: string }
  | { type: 'messageRemoved'; chatKey: string; id: string }
  | { type: 'eventReceived'; event: ChatEvent }
  | { type: 'reset'; state: ChatState }

export const initialChatState: ChatState = { chats: [], activeChatId: null }

const STATUS_RANK: Record<MessageStatus, number> = {
  error: -1,
  sending: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 5,
  noAccount: 5,
}

/** Статусы приходят асинхронно и не всегда по порядку: не даём «read» откатиться в «sent». */
function mergeStatus(current: MessageStatus | undefined, next: MessageStatus): MessageStatus {
  if (!current) return next
  return STATUS_RANK[next] >= STATUS_RANK[current] ? next : current
}

function findChat(chats: Chat[], chatId: string, phone?: string): Chat | undefined {
  return (
    chats.find((chat) => chat.chatId === chatId) ??
    (phone ? chats.find((chat) => chat.phone === phone) : undefined)
  )
}

function updateChat(state: ChatState, id: string, patch: (chat: Chat) => Chat): ChatState {
  return { ...state, chats: state.chats.map((chat) => (chat.id === id ? patch(chat) : chat)) }
}

function applyEvent(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'message': {
      // Своё сообщение, уже показанное в чате (outgoingAPIMessageReceived) — дубликат.
      const owner = state.chats.find((c) => c.messages.some((m) => m.id === event.idMessage))
      if (owner) {
        // Если чат был создан по номеру (…@c.us), запоминаем настоящий chatId MAX.
        return owner.chatId === event.chatId
          ? state
          : updateChat(state, owner.id, (chat) => ({ ...chat, chatId: event.chatId }))
      }

      const existing = findChat(state.chats, event.chatId, event.phone)

      const message: Message = {
        id: event.idMessage,
        direction: event.direction,
        text: event.text,
        timestamp: event.timestamp,
        status: event.direction === 'out' ? 'sent' : undefined,
      }

      if (!existing) {
        // Новый собеседник написал первым — заводим для него чат, как в настоящем мессенджере.
        const chat: Chat = {
          id: event.phone ?? event.chatId,
          chatId: event.chatId,
          phone: event.phone,
          name: event.contactName,
          messages: [message],
          unread: event.direction === 'in' ? 1 : 0,
          updatedAt: event.timestamp,
        }
        return { ...state, chats: [...state.chats, chat] }
      }

      const isActive = state.activeChatId === existing.id
      return updateChat(state, existing.id, (chat) => ({
        ...chat,
        // Отправляли по номеру, а ответ пришёл с числовым chatId MAX — запоминаем его.
        chatId: event.direction === 'in' ? event.chatId : chat.chatId,
        phone: chat.phone ?? event.phone,
        name: chat.name ?? event.contactName,
        messages: [...chat.messages, message].sort((a, b) => a.timestamp - b.timestamp),
        unread: event.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
        updatedAt: Math.max(chat.updatedAt, event.timestamp),
      }))
    }

    case 'status': {
      const chat = state.chats.find((c) => c.messages.some((m) => m.id === event.idMessage))
      if (!chat) return state
      return updateChat(state, chat.id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === event.idMessage ? { ...m, status: mergeStatus(m.status, event.status) } : m,
        ),
      }))
    }

    case 'state':
      return state
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const existing = findChat(state.chats, action.chatId, action.phone)
      if (existing) {
        return updateChat({ ...state, activeChatId: existing.id }, existing.id, (chat) => ({
          ...chat,
          name: action.name ?? chat.name,
          unread: 0,
        }))
      }
      const chat: Chat = {
        id: action.phone,
        chatId: action.chatId,
        phone: action.phone,
        name: action.name,
        messages: [],
        unread: 0,
        updatedAt: Date.now(),
      }
      return { chats: [...state.chats, chat], activeChatId: chat.id }
    }

    case 'chatSelected': {
      const next = { ...state, activeChatId: action.id }
      if (!action.id) return next
      return updateChat(next, action.id, (chat) => ({ ...chat, unread: 0 }))
    }

    case 'chatRemoved':
      return {
        chats: state.chats.filter((chat) => chat.id !== action.id),
        activeChatId: state.activeChatId === action.id ? null : state.activeChatId,
      }

    case 'messageQueued':
      return updateChat(state, action.chatKey, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            id: action.tempId,
            direction: 'out',
            text: action.text,
            timestamp: action.timestamp,
            status: 'sending',
          },
        ],
        updatedAt: action.timestamp,
      }))

    case 'messageSent':
      return updateChat(state, action.chatKey, (chat) => {
        // Уведомление outgoingAPIMessageReceived могло прийти раньше ответа sendMessage.
        const alreadyReceived = chat.messages.some((m) => m.id === action.idMessage)
        return {
          ...chat,
          messages: alreadyReceived
            ? chat.messages.filter((m) => m.id !== action.tempId)
            : chat.messages.map((m) =>
                m.id === action.tempId ? { ...m, id: action.idMessage, status: 'sent' } : m,
              ),
        }
      })

    case 'messageFailed':
      return updateChat(state, action.chatKey, (chat) => ({
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === action.tempId ? { ...m, status: 'error', error: action.error } : m,
        ),
      }))

    case 'messageRemoved':
      return updateChat(state, action.chatKey, (chat) => ({
        ...chat,
        messages: chat.messages.filter((m) => m.id !== action.id),
      }))

    case 'eventReceived':
      return applyEvent(state, action.event)

    case 'reset':
      return action.state
  }
}

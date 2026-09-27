import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { createGreenApiClient, GreenApiError } from '../api/greenApi'
import type { Credentials } from '../api/types'
import type { ChatEvent } from '../lib/notifications'
import { normalizePhone, phoneToChatId, validatePhone } from '../lib/phone'
import { loadChats, saveChats } from '../lib/storage'
import { chatReducer, initialChatState } from '../store/chatReducer'
import { useNotificationPolling } from './useNotificationPolling'

export const MAX_MESSAGE_LENGTH = 4000

let tempCounter = 0
const createTempId = () => `local-${Date.now()}-${++tempCounter}`

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof GreenApiError ? error.message : fallback

/**
 * Вся логика мессенджера: состояние чатов, сохранение истории,
 * получение уведомлений и отправка сообщений.
 */
export function useMessenger(credentials: Credentials) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials])

  const [state, dispatch] = useReducer(
    chatReducer,
    credentials.idInstance,
    (idInstance) => loadChats(idInstance) ?? initialChatState,
  )

  // История хранится в браузере отдельно для каждого инстанса.
  useEffect(() => {
    saveChats(credentials.idInstance, state)
  }, [credentials.idInstance, state])

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const handleEvent = useCallback((event: ChatEvent) => {
    dispatch({ type: 'eventReceived', event })
  }, [])

  const connection = useNotificationPolling(client, handleEvent)

  /**
   * Создаёт чат по номеру телефона. Номер сначала проверяется методом CheckAccount:
   * он возвращает chatId MAX, по которому потом приходят ответы собеседника.
   */
  const openChat = useCallback(
    async (rawPhone: string, name?: string): Promise<void> => {
      const validationError = validatePhone(rawPhone)
      if (validationError) throw new Error(validationError)

      const phone = normalizePhone(rawPhone)
      const known = stateRef.current.chats.find((chat) => chat.phone === phone)
      if (known) {
        dispatch({ type: 'chatOpened', phone, chatId: known.chatId, name })
        return
      }

      let chatId = phoneToChatId(phone)
      try {
        const account = await client.checkAccount(phone)
        if (account?.exist === false || account?.existsWhatsapp === false) {
          throw new Error('У этого номера нет аккаунта в мессенджере')
        }
        if (account?.chatId) chatId = account.chatId
      } catch (error) {
        if (!(error instanceof GreenApiError)) throw error
        // CheckAccount недоступен (лимит, таймаут) — отправляем по номеру, это тоже поддерживается.
        if (error.status === 0) throw error
      }

      dispatch({ type: 'chatOpened', phone, chatId, name: name?.trim() || undefined })
    },
    [client],
  )

  const deliver = useCallback(
    async (chatKey: string, chatId: string, text: string) => {
      const tempId = createTempId()
      dispatch({ type: 'messageQueued', chatKey, tempId, text, timestamp: Date.now() })
      try {
        const { idMessage } = await client.sendMessage(chatId, text)
        dispatch({ type: 'messageSent', chatKey, tempId, idMessage })
      } catch (error) {
        dispatch({
          type: 'messageFailed',
          chatKey,
          tempId,
          error: errorMessage(error, 'Не удалось отправить сообщение'),
        })
      }
    },
    [client],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const chat = stateRef.current.chats.find((c) => c.id === stateRef.current.activeChatId)
      const trimmed = text.trim()
      if (!chat || !trimmed) return
      await deliver(chat.id, chat.chatId, trimmed.slice(0, MAX_MESSAGE_LENGTH))
    },
    [deliver],
  )

  const retryMessage = useCallback(
    async (chatKey: string, messageId: string) => {
      const chat = stateRef.current.chats.find((c) => c.id === chatKey)
      const message = chat?.messages.find((m) => m.id === messageId)
      if (!chat || !message) return
      dispatch({ type: 'messageRemoved', chatKey, id: messageId })
      await deliver(chat.id, chat.chatId, message.text)
    },
    [deliver],
  )

  const selectChat = useCallback((id: string | null) => dispatch({ type: 'chatSelected', id }), [])
  const removeChat = useCallback((id: string) => dispatch({ type: 'chatRemoved', id }), [])

  const activeChat = state.chats.find((chat) => chat.id === state.activeChatId) ?? null

  return {
    chats: state.chats,
    activeChat,
    connection,
    openChat,
    selectChat,
    removeChat,
    sendMessage,
    retryMessage,
  }
}

export type Messenger = ReturnType<typeof useMessenger>

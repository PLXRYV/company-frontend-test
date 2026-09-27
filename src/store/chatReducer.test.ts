import { describe, expect, it } from 'vitest'
import type { ChatEvent } from '../lib/notifications'
import { chatReducer, initialChatState, type ChatState } from './chatReducer'

const opened = (phone = '79991234567', chatId = '10000000'): ChatState =>
  chatReducer(initialChatState, { type: 'chatOpened', phone, chatId })

const incoming = (overrides: Partial<Extract<ChatEvent, { type: 'message' }>> = {}): ChatEvent => ({
  type: 'message',
  chatId: '10000000',
  phone: '79991234567',
  idMessage: 'in-1',
  text: 'Привет!',
  direction: 'in',
  timestamp: 1000,
  ...overrides,
})

describe('chatReducer', () => {
  it('создаёт чат и делает его активным', () => {
    const state = opened()
    expect(state.chats).toHaveLength(1)
    expect(state.activeChatId).toBe('79991234567')
  })

  it('не дублирует чат при повторном открытии', () => {
    const state = chatReducer(opened(), { type: 'chatOpened', phone: '79991234567', chatId: '10000000' })
    expect(state.chats).toHaveLength(1)
  })

  it('проходит полный цикл отправки: sending → sent → read', () => {
    let state = opened()
    state = chatReducer(state, {
      type: 'messageQueued',
      chatKey: '79991234567',
      tempId: 'tmp',
      text: 'Hi',
      timestamp: 1,
    })
    expect(state.chats[0].messages[0].status).toBe('sending')

    state = chatReducer(state, { type: 'messageSent', chatKey: '79991234567', tempId: 'tmp', idMessage: 'm1' })
    expect(state.chats[0].messages[0]).toMatchObject({ id: 'm1', status: 'sent' })

    state = chatReducer(state, {
      type: 'eventReceived',
      event: { type: 'status', chatId: '10000000', idMessage: 'm1', status: 'read' },
    })
    expect(state.chats[0].messages[0].status).toBe('read')

    // Опоздавший статус «delivered» не откатывает «read»
    state = chatReducer(state, {
      type: 'eventReceived',
      event: { type: 'status', chatId: '10000000', idMessage: 'm1', status: 'delivered' },
    })
    expect(state.chats[0].messages[0].status).toBe('read')
  })

  it('помечает ошибку отправки', () => {
    let state = opened()
    state = chatReducer(state, { type: 'messageQueued', chatKey: '79991234567', tempId: 't', text: 'x', timestamp: 1 })
    state = chatReducer(state, { type: 'messageFailed', chatKey: '79991234567', tempId: 't', error: 'Нет сети' })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'error', error: 'Нет сети' })
  })

  it('добавляет ответ собеседника в активный чат без счётчика непрочитанных', () => {
    const state = chatReducer(opened(), { type: 'eventReceived', event: incoming() })
    expect(state.chats[0].messages).toHaveLength(1)
    expect(state.chats[0].unread).toBe(0)
  })

  it('считает непрочитанные в неактивном чате и сбрасывает при открытии', () => {
    let state = chatReducer(opened(), { type: 'chatSelected', id: null })
    state = chatReducer(state, { type: 'eventReceived', event: incoming() })
    expect(state.chats[0].unread).toBe(1)
    state = chatReducer(state, { type: 'chatSelected', id: '79991234567' })
    expect(state.chats[0].unread).toBe(0)
  })

  it('находит чат, созданный по номеру, когда ответ пришёл с chatId MAX', () => {
    let state = opened('79991234567', '79991234567@c.us')
    state = chatReducer(state, { type: 'eventReceived', event: incoming({ chatId: '10000000' }) })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].chatId).toBe('10000000')
  })

  it('игнорирует дубликаты уведомлений', () => {
    let state = chatReducer(opened(), { type: 'eventReceived', event: incoming() })
    state = chatReducer(state, { type: 'eventReceived', event: incoming() })
    expect(state.chats[0].messages).toHaveLength(1)
  })

  it('не дублирует своё сообщение, пришедшее уведомлением outgoingAPIMessageReceived', () => {
    let state = opened()
    state = chatReducer(state, { type: 'messageQueued', chatKey: '79991234567', tempId: 't', text: 'Hi', timestamp: 1 })
    state = chatReducer(state, { type: 'messageSent', chatKey: '79991234567', tempId: 't', idMessage: 'm1' })
    state = chatReducer(state, {
      type: 'eventReceived',
      event: incoming({ idMessage: 'm1', direction: 'out', phone: undefined, text: 'Hi' }),
    })
    expect(state.chats[0].messages).toHaveLength(1)
  })

  it('убирает временное сообщение, если уведомление пришло раньше ответа sendMessage', () => {
    let state = opened()
    state = chatReducer(state, { type: 'messageQueued', chatKey: '79991234567', tempId: 't', text: 'Hi', timestamp: 1 })
    state = chatReducer(state, {
      type: 'eventReceived',
      event: incoming({ idMessage: 'm1', direction: 'out', phone: undefined, text: 'Hi', timestamp: 2 }),
    })
    state = chatReducer(state, { type: 'messageSent', chatKey: '79991234567', tempId: 't', idMessage: 'm1' })
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['m1'])
  })

  it('заводит новый чат, если написал незнакомый контакт', () => {
    const state = chatReducer(initialChatState, {
      type: 'eventReceived',
      event: incoming({ phone: '79005554433', chatId: '555', contactName: 'Анна' }),
    })
    expect(state.chats[0]).toMatchObject({ id: '79005554433', name: 'Анна', unread: 1 })
  })

  it('удаляет чат и снимает выделение', () => {
    const state = chatReducer(opened(), { type: 'chatRemoved', id: '79991234567' })
    expect(state).toEqual({ chats: [], activeChatId: null })
  })
})

import type { Chat } from '../store/chatReducer'
import { formatPhone } from './phone'

/** Имя чата: имя контакта, иначе номер, иначе chatId. */
export const chatTitle = (chat: Chat): string =>
  chat.name || (chat.phone ? formatPhone(chat.phone) : `Чат ${chat.chatId}`)

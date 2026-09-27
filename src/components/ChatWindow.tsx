import { Fragment, useEffect, useRef } from 'react'
import { chatTitle } from '../lib/chatTitle'
import { formatDayDivider, isSameDay } from '../lib/format'
import { formatPhone } from '../lib/phone'
import type { Chat } from '../store/chatReducer'
import { Avatar } from './Avatar'
import styles from './ChatWindow.module.css'
import { Composer } from './Composer'
import { BackIcon, TrashIcon } from './icons'
import { MessageBubble } from './MessageBubble'

interface ChatWindowProps {
  chat: Chat
  onBack: () => void
  onSend: (text: string) => void
  onRetry: (messageId: string) => void
  onRemove: () => void
}

export function ChatWindow({ chat, onBack, onSend, onRetry, onRemove }: ChatWindowProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const title = chatTitle(chat)
  const subtitle = chat.name && chat.phone ? formatPhone(chat.phone) : 'MAX'

  // Прокручиваем к последнему сообщению при открытии чата и новых сообщениях
  const lastId = chat.messages[chat.messages.length - 1]?.id
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.id, lastId])

  function handleRemove() {
    if (window.confirm(`Удалить чат «${title}» вместе с историей на этом устройстве?`)) onRemove()
  }

  return (
    <section className={styles.window} aria-label={`Чат с ${title}`}>
      <header className={styles.header}>
        <button className={`${styles.iconButton} ${styles.back}`} onClick={onBack} aria-label="Назад к чатам">
          <BackIcon />
        </button>
        <Avatar name={title} seed={chat.id} size={40} />
        <div className={styles.info}>
          <h2 className={styles.name}>{title}</h2>
          <span className={styles.subtitle}>{subtitle}</span>
        </div>
        <button className={styles.iconButton} onClick={handleRemove} aria-label="Удалить чат" title="Удалить чат">
          <TrashIcon size={18} />
        </button>
      </header>

      <div className={styles.messages} ref={listRef} role="log" aria-live="polite">
        {chat.messages.length === 0 ? (
          <div className={styles.placeholder}>
            <p>Сообщений пока нет</p>
            <span>Напишите первое сообщение, и ответ появится здесь</span>
          </div>
        ) : (
          chat.messages.map((message, index) => {
            const prev = chat.messages[index - 1]
            const showDivider = !prev || !isSameDay(prev.timestamp, message.timestamp)
            return (
              <Fragment key={message.id}>
                {showDivider && (
                  <div className={styles.divider}>
                    <span>{formatDayDivider(message.timestamp)}</span>
                  </div>
                )}
                <MessageBubble message={message} onRetry={onRetry} />
              </Fragment>
            )
          })
        )}
      </div>

      <Composer key={chat.id} onSend={onSend} />
    </section>
  )
}

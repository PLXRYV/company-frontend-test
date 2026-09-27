import { useMemo, useState } from 'react'
import type { ConnectionStatus } from '../hooks/useNotificationPolling'
import { formatChatListTime } from '../lib/format'
import { chatTitle } from '../lib/chatTitle'
import type { Chat } from '../store/chatReducer'
import { Avatar } from './Avatar'
import { LogoutIcon, MoonIcon, PlusIcon, SunIcon } from './icons'
import { NewChatForm } from './NewChatForm'
import styles from './Sidebar.module.css'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  connection: { status: ConnectionStatus; error: string | null }
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onSelect: (id: string) => void
  onCreate: (phone: string, name: string) => Promise<void>
  onLogout: () => void
}

export function Sidebar({
  chats,
  activeChatId,
  connection,
  theme,
  onToggleTheme,
  onSelect,
  onCreate,
  onLogout,
}: SidebarProps) {
  const [creating, setCreating] = useState(false)

  const sorted = useMemo(() => [...chats].sort((a, b) => b.updatedAt - a.updatedAt), [chats])

  async function handleCreate(phone: string, name: string) {
    await onCreate(phone, name)
    setCreating(false)
  }

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Чаты</h1>
          <span
            className={`${styles.status} ${connection.status === 'online' ? styles.online : styles.offline}`}
            title={connection.error ?? 'Подключено к GREEN-API'}
          >
            {connection.status === 'online' ? 'в сети' : 'переподключение…'}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.iconButton}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className={styles.iconButton} onClick={onLogout} aria-label="Выйти" title="Выйти">
            <LogoutIcon />
          </button>
        </div>
      </header>

      {creating ? (
        <NewChatForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <button className={styles.newChat} onClick={() => setCreating(true)}>
          <PlusIcon size={18} />
          Новый чат
        </button>
      )}

      <nav className={styles.list} aria-label="Список чатов">
        {sorted.length === 0 && !creating && (
          <p className={styles.empty}>
            Здесь появятся ваши чаты.
            <br />
            Нажмите «Новый чат» и введите номер получателя.
          </p>
        )}
        {sorted.map((chat) => {
          const last = chat.messages[chat.messages.length - 1]
          const title = chatTitle(chat)
          return (
            <button
              key={chat.id}
              className={`${styles.item} ${chat.id === activeChatId ? styles.active : ''}`}
              onClick={() => onSelect(chat.id)}
              aria-current={chat.id === activeChatId ? 'true' : undefined}
            >
              <Avatar name={title} seed={chat.id} />
              <span className={styles.itemBody}>
                <span className={styles.itemTop}>
                  <span className={styles.itemName}>{title}</span>
                  {last && <span className={styles.itemTime}>{formatChatListTime(last.timestamp)}</span>}
                </span>
                <span className={styles.itemBottom}>
                  <span className={styles.itemPreview}>
                    {last ? (
                      <>
                        {last.direction === 'out' && <span className={styles.you}>Вы: </span>}
                        {last.text}
                      </>
                    ) : (
                      <span className={styles.draft}>Нет сообщений</span>
                    )}
                  </span>
                  {chat.unread > 0 && (
                    <span className={styles.badge} aria-label={`${chat.unread} непрочитанных`}>
                      {chat.unread > 99 ? '99+' : chat.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

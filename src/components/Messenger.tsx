import { useCallback } from 'react'
import type { Credentials } from '../api/types'
import { useMessenger } from '../hooks/useMessenger'
import type { Theme } from '../hooks/useTheme'
import { ChatWindow } from './ChatWindow'
import { ChatIcon } from './icons'
import styles from './Messenger.module.css'
import { Sidebar } from './Sidebar'

interface MessengerProps {
  credentials: Credentials
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => void
}

export function Messenger({ credentials, theme, onToggleTheme, onLogout }: MessengerProps) {
  const { chats, activeChat, connection, openChat, selectChat, removeChat, sendMessage, retryMessage } =
    useMessenger(credentials)

  const activeId = activeChat?.id
  const handleRetry = useCallback(
    (messageId: string) => {
      if (activeId) void retryMessage(activeId, messageId)
    },
    [activeId, retryMessage],
  )

  return (
    <div className={`${styles.layout} ${activeChat ? styles.chatOpen : ''}`}>
      <div className={styles.sidebar}>
        <Sidebar
          chats={chats}
          activeChatId={activeChat?.id ?? null}
          connection={connection}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSelect={selectChat}
          onCreate={openChat}
          onLogout={onLogout}
        />
      </div>

      <main className={styles.main}>
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            onBack={() => selectChat(null)}
            onSend={(text) => void sendMessage(text)}
            onRetry={handleRetry}
            onRemove={() => removeChat(activeChat.id)}
          />
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ChatIcon size={32} />
            </div>
            <p>Выберите чат или создайте новый</p>
            <span>Инстанс {credentials.idInstance}</span>
          </div>
        )}
      </main>
    </div>
  )
}

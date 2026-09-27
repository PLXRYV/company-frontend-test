import { memo } from 'react'
import { formatTime } from '../lib/format'
import type { Message, MessageStatus } from '../store/chatReducer'
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon, RetryIcon } from './icons'
import styles from './MessageBubble.module.css'

const STATUS_LABELS: Record<MessageStatus, string> = {
  sending: 'Отправляется',
  pending: 'В очереди',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не доставлено',
  noAccount: 'У получателя нет аккаунта MAX',
  error: 'Ошибка отправки',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'sending':
    case 'pending':
      return <ClockIcon size={14} />
    case 'sent':
      return <CheckIcon size={15} />
    case 'delivered':
      return <DoubleCheckIcon size={16} />
    case 'read':
      return <DoubleCheckIcon size={16} className={styles.read} />
    default:
      return <AlertIcon size={14} className={styles.alert} />
  }
}

interface MessageBubbleProps {
  message: Message
  onRetry?: (id: string) => void
}

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const outgoing = message.direction === 'out'
  const failed = message.status === 'error' || message.status === 'failed' || message.status === 'noAccount'

  return (
    <div className={`${styles.row} ${outgoing ? styles.out : styles.in}`}>
      <div className={`${styles.bubble} ${failed ? styles.failed : ''}`}>
        <span className={styles.text}>{message.text}</span>
        <span className={styles.meta}>
          {formatTime(message.timestamp)}
          {outgoing && message.status && (
            <span className={styles.status} title={message.error ?? STATUS_LABELS[message.status]}>
              <StatusIcon status={message.status} />
              <span className="visually-hidden">{STATUS_LABELS[message.status]}</span>
            </span>
          )}
        </span>
      </div>
      {message.status === 'error' && onRetry && (
        <button className={styles.retry} onClick={() => onRetry(message.id)} title={message.error}>
          <RetryIcon size={14} />
          Повторить
        </button>
      )}
    </div>
  )
})

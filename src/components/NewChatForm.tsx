import { useState, type FormEvent } from 'react'
import { validatePhone } from '../lib/phone'
import { CloseIcon } from './icons'
import styles from './NewChatForm.module.css'

interface NewChatFormProps {
  onSubmit: (phone: string, name: string) => Promise<void>
  onCancel: () => void
}

export function NewChatForm({ onSubmit, onCancel }: NewChatFormProps) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationError = validatePhone(phone)
    if (validationError) {
      setError(validationError)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSubmit(phone, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать чат')
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Новый чат</h2>
        <button type="button" className={styles.close} onClick={onCancel} aria-label="Закрыть">
          <CloseIcon size={18} />
        </button>
      </div>

      <input
        className={styles.input}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        type="tel"
        inputMode="tel"
        placeholder="Номер телефона, +7 999 123-45-67"
        aria-label="Номер телефона получателя"
        autoFocus
      />
      <input
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder="Имя (необязательно)"
        aria-label="Имя контакта"
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? 'Проверяем номер…' : 'Создать чат'}
      </button>
    </form>
  )
}

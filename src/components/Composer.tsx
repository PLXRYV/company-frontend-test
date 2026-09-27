import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MAX_MESSAGE_LENGTH } from '../hooks/useMessenger'
import { SendIcon } from './icons'
import styles from './Composer.module.css'

interface ComposerProps {
  onSend: (text: string) => void
}

const MAX_HEIGHT = 160

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Поле растёт вместе с текстом, но не выше MAX_HEIGHT
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  const canSend = text.trim().length > 0

  function submit() {
    if (!canSend) return
    onSend(text)
    setText('')
    textareaRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  // Enter — отправить, Shift+Enter — новая строка
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const nearLimit = text.length > MAX_MESSAGE_LENGTH - 200

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          autoFocus
        />
        {nearLimit && (
          <span className={styles.counter}>
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <button className={styles.send} type="submit" disabled={!canSend} aria-label="Отправить">
        <SendIcon size={20} />
      </button>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import { createGreenApiClient, defaultApiUrl, GreenApiError } from '../api/greenApi'
import type { Credentials, InstanceState } from '../api/types'
import { ChatIcon, EyeIcon, EyeOffIcon } from './icons'
import styles from './LoginScreen.module.css'

interface LoginScreenProps {
  onLogin: (credentials: Credentials, remember: boolean) => void
}

const STATE_ERRORS: Partial<Record<InstanceState, string>> = {
  notAuthorized: 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API',
  starting: 'Инстанс запускается. Подождите пару минут и попробуйте снова',
  blocked: 'Аккаунт MAX на этом инстансе заблокирован',
  sleepMode: 'Инстанс в спящем режиме: проверьте телефон и интернет',
  yellowCard: 'На аккаунте временные ограничения мессенджера',
  suspended: 'Работа инстанса приостановлена',
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [customApiUrl, setCustomApiUrl] = useState('')
  const [remember, setRemember] = useState(true)
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const id = idInstance.trim()
  const autoApiUrl = defaultApiUrl(id)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!/^\d+$/.test(id)) {
      setError('idInstance должен состоять только из цифр')
      return
    }
    if (!apiTokenInstance.trim()) {
      setError('Введите apiTokenInstance')
      return
    }

    const credentials: Credentials = {
      idInstance: id,
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: customApiUrl.trim() || autoApiUrl,
    }

    setLoading(true)
    setError(null)
    try {
      const { stateInstance } = await createGreenApiClient(credentials).getStateInstance()
      if (stateInstance !== 'authorized') {
        setError(STATE_ERRORS[stateInstance] ?? `Инстанс недоступен: ${stateInstance}`)
        return
      }
      onLogin(credentials, remember)
    } catch (err) {
      setError(err instanceof GreenApiError ? err.message : 'Не удалось проверить данные')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.logo}>
          <ChatIcon size={28} />
        </div>
        <h1 className={styles.title}>Вход в чат</h1>
        <p className={styles.subtitle}>
          Введите данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            className={styles.input}
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="3100123456"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <span className={styles.inputWrap}>
            <input
              className={styles.input}
              value={apiTokenInstance}
              onChange={(e) => setApiTokenInstance(e.target.value)}
              type={showToken ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd451234"
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            >
              {showToken ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </span>
        </label>

        <details className={styles.advanced}>
          <summary>Дополнительно</summary>
          <label className={styles.field}>
            <span className={styles.label}>apiUrl</span>
            <input
              className={styles.input}
              value={customApiUrl}
              onChange={(e) => setCustomApiUrl(e.target.value)}
              placeholder={autoApiUrl}
              inputMode="url"
            />
            <span className={styles.hint}>
              По умолчанию определяется по idInstance. Меняйте, только если в личном кабинете
              указан другой адрес
            </span>
          </label>
        </details>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Запомнить меня на этом устройстве
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}

import { useState } from 'react'
import type { Credentials } from './api/types'
import { LoginScreen } from './components/LoginScreen'
import { Messenger } from './components/Messenger'
import { useTheme } from './hooks/useTheme'
import { clearCredentials, loadCredentials, saveCredentials } from './lib/storage'

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)
  const { theme, toggleTheme } = useTheme()

  function handleLogin(next: Credentials, remember: boolean) {
    saveCredentials(next, remember)
    setCredentials(next)
  }

  function handleLogout() {
    clearCredentials()
    setCredentials(null)
  }

  if (!credentials) return <LoginScreen onLogin={handleLogin} />

  return (
    <Messenger
      // Смена инстанса — новый экземпляр мессенджера со своей историей
      key={credentials.idInstance}
      credentials={credentials}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    />
  )
}

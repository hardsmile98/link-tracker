import './App.css'
import { useEffect, useState } from 'react'

type LinkAttributionResponse = {
  success: boolean
  data?: {
    id: string
    redirect_url: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [message, setMessage] = useState('Привязываем пользователя...')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const webApp = window.Telegram?.WebApp
      const initData = webApp?.initData

      if (!webApp || !initData) {
        setMessage('Ошибка: откройте mini app внутри Telegram.')
        setIsLoading(false)
        return
      }

      webApp.ready()
      webApp.expand()

      const telegramUserId = webApp.initDataUnsafe?.user?.id
      const clickId = webApp.initDataUnsafe?.start_param ?? undefined

      if (!telegramUserId) {
        setMessage('Ошибка: не удалось получить Telegram user id.')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/attribution/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            click_id: clickId,
            telegram_user_id: telegramUserId,
            init_data: initData,
          }),
        })

        if (!response.ok) {
          setMessage('Ошибка: не удалось связать пользователя.')
          setIsLoading(false)
          return
        }

        const payload = (await response.json()) as LinkAttributionResponse
        const redirectUrl = payload.data?.redirect_url

        if (!redirectUrl) {
          setMessage('Ошибка: backend не вернул ссылку для редиректа.')
          setIsLoading(false)
          return
        }

        webApp.openTelegramLink(redirectUrl)
        webApp.close()
      } catch {
        setMessage('Ошибка сети при обращении к backend.')
        setIsLoading(false)
      }
    }

    void run()
  }, [])

  return (
    <main className="container">
      {isLoading 
      ? <div className="loader" aria-label="Загрузка" />
      : <p className="message">{message}</p>}

    </main>
  )
}

export default App

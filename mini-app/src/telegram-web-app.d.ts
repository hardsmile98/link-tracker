interface TelegramWebAppUser {
  id: number
}

interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser
  start_param?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: TelegramWebAppInitDataUnsafe
  ready: () => void
  expand: () => void
  openTelegramLink: (url: string) => void
  close: () => void
}

interface TelegramGlobal {
  WebApp?: TelegramWebApp
}

declare global {
  interface Window {
    Telegram?: TelegramGlobal
  }
}

export {}

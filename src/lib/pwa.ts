import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaState {
  canInstall: boolean
  promptInstall: () => Promise<boolean>
}

export function usePwaInstall(): PwaState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShown(true)
    }
    const onInstalled = () => {
      setShown(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false
    await deferred.prompt()
    const choice = await deferred.userChoice
    return choice.outcome === 'accepted'
  }

  // shown di-set true saat event muncul; hanya tampilkan sekali per kunjungan
  return { canInstall: shown, promptInstall }
}
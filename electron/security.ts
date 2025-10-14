import { shell } from 'electron'

export async function openExternalSafe(rawUrl: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(rawUrl)

    if (parsedUrl.protocol !== 'https:') {
      console.warn('[security] Bloqueando abertura de URL não segura:', rawUrl)
      return false
    }

    await shell.openExternal(parsedUrl.toString())
    return true
  } catch (error) {
    console.error('[security] Falha ao processar URL externa:', rawUrl, error)
    return false
  }
}

/**
 * Entrega um ficheiro gerado na app. Em ecrãs táteis abre a partilha do telemóvel (guardar, imprimir, enviar),
 * porque a app instalada não lida bem com transferências; no computador transfere o ficheiro.
 */
export async function saveFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled'
      // a partilha falhou por outra razão: transfere-se o ficheiro
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  // O navegador precisa do endereço ainda válido quando começa a transferência
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}

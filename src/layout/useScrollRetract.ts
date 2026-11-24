import { useEffect, useRef, useState } from 'react'

/**
 * `true` enquanto o utilizador desce a página; volta a `false` ao subir ou perto do topo (`y <= minY`).
 * `minY` deve ser pelo menos a altura do que se recolhe, para nunca ficar um buraco por cima do conteúdo.
 */
export const useScrollingDown = (enabled: boolean, minY: number): boolean => {
  const [down, setDown] = useState(false)

  useEffect(() => {
    if (!enabled) return
    // Limitado ao intervalo real: o "elástico" do iOS no topo e no fundo não conta como mudança de direção
    const read = () => Math.min(Math.max(0, window.scrollY), Math.max(0, document.documentElement.scrollHeight - window.innerHeight))
    let isDown = false
    let anchor = read() // ponto mais extremo na direção atual
    const onScroll = () => {
      const y = read()
      let next = isDown
      if (y <= minY) next = false
      else if (!isDown && y - anchor > 12) next = true
      else if (isDown && anchor - y > 8) next = false
      if (next !== isDown) {
        isDown = next
        anchor = y
        setDown(next)
      } else {
        anchor = isDown ? Math.max(anchor, y) : Math.min(anchor, y)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      setDown(false)
    }
  }, [enabled, minY])

  return enabled && down
}

/**
 * Recolhe um bloco fixo quando `wanted`. Nunca esconde um elemento com foco de teclado (e volta a mostrá-lo se o
 * foco lá entrar); um foco que ficou de um toque é largado, para não haver foco num elemento escondido.
 */
export const useRetract = (wanted: boolean) => {
  const ref = useRef<HTMLDivElement>(null)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const hidden = wanted && !keyboardFocus

  useEffect(() => {
    const el = document.activeElement
    if (!hidden || !(el instanceof HTMLElement) || !ref.current?.contains(el)) return
    if (el.matches(':focus-visible')) setKeyboardFocus(true)
    else el.blur()
  }, [hidden])

  return {
    hidden,
    props: {
      ref,
      onFocus: (e: React.FocusEvent) => setKeyboardFocus(e.target.matches(':focus-visible')),
      onBlur: (e: React.FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false)
      },
    },
  }
}

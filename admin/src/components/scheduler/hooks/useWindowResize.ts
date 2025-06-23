import { useState, useEffect } from 'react'

export function useWindowResize() {
  const [state, setState] = useState({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const handler = () => {
      setState((_state) => {
        const { innerWidth, innerHeight } = window
        // Check state for change, return same state if no change happened to prevent rerender
        return _state.width !== innerWidth || _state.height !== innerHeight
          ? {
            width: innerWidth,
            height: innerHeight,
          }
          : _state
      })
    }

    if (typeof window !== 'undefined') {
      handler()
      window.addEventListener('resize', handler, {
        capture: false,
        passive: true,
      })
    }

    return () => {
      window.removeEventListener('resize', handler)
    }
  }, [])

  return state
}

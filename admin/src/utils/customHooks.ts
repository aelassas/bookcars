import { useState, useEffect } from 'react'

/**
 * Custom initialization hook.
 *
 * @param {*} callback
 * @param {...*} args
 * @returns {{}}
 */
export const useInit = (callback: any, ...args: any) => {
  const [mounted, setMounted] = useState(false)

  const resetInit = () => setMounted(false)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      callback(...args)
    }
  }, [mounted, callback, args])

  return [resetInit]
}

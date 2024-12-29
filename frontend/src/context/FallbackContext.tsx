import React from 'react'

export type FallbackType = NonNullable<React.ReactNode> | null

export interface FallbackContextType {
  updateFallback: (fallback: FallbackType) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const FallbackContext = React.createContext<FallbackContextType>({
  updateFallback: () => { },
})

interface FabllbackProviderProps {
  children: React.ReactNode
}

export const FabllbackProvider: React.FC<FabllbackProviderProps> = ({
  children,
}) => {
  const [fallback, setFallback] = React.useState<FallbackType>(null)

  const updateFallback = React.useCallback((_fallback: FallbackType) => {
    setFallback(() => _fallback)
  }, [])

  const renderChildren = React.useMemo(() => children, [children])

  const value = React.useMemo(() => ({ updateFallback }), [updateFallback])

  return (
    <FallbackContext.Provider value={value}>
      <React.Suspense fallback={fallback}>{renderChildren}</React.Suspense>
    </FallbackContext.Provider>
  )
}

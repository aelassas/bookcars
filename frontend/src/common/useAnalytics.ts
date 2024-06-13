import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import * as analytics from './ga4'

export const useAnalytics = () => {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname + location.search
    analytics.sendPageview(path)
  }, [location])
}

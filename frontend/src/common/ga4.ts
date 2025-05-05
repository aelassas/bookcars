import ga4 from 'react-ga4'
import env from '@/config/env.config'

const TRACKING_ID = env.GOOGLE_ANALYTICS_ID
const { isProduction } = env

export const init = () => {
  if (typeof window === 'undefined') {
    return
  }
  let fired = false
  const loadAnalyticsScript = () => {
    if (!fired) {
      ga4.initialize(TRACKING_ID, { testMode: !isProduction })
      fired = true
    }
  }

  window.addEventListener('mousemove', loadAnalyticsScript, { once: true })
  window.addEventListener('touchstart', loadAnalyticsScript, { once: true })
}

export const sendEvent = (name: string) => ga4.event('screen_view', {
  app_name: 'bookcars',
  screen_name: name,
})

export const sendPageview = (path: string) => ga4.send({
  hitType: 'pageview',
  page: path
})

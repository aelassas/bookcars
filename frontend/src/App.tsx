import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import env from '@/config/env.config'
import { NotificationProvider } from '@/context/NotificationContext'
import { UserProvider } from '@/context/UserContext'
import { RecaptchaProvider } from '@/context/RecaptchaContext'
import { PayPalProvider } from '@/context/PayPalContext'
import { SettingProvider } from '@/context/SettingContext'
import { init as initGA } from '@/utils/ga4'
import ScrollToTop from '@/components/ScrollToTop'
import NProgressIndicator from '@/components/NProgressIndicator'
import ErrorBoundary from '@/components/ErrorBoundary'
import SafarRentLogo from '@/components/SafarRentLogo'
import { Button } from '@mui/material'
import onboardingHero from '@/assets/img/safarrent_hero.jpg'
import '@/assets/css/onboarding.css'

const onboardingSlides = [
  { eyebrow: 'YOUR JOURNEY, YOUR WAY', title: 'Pakistan is closer than you think.', text: 'Find a car for the city, the long road, or the airport run — all in one place.' },
  { eyebrow: 'BUILT AROUND YOUR PLANS', title: 'The right ride for every route.', text: 'Compare real vehicles, clear rental details, and pickup options before you book.' },
  { eyebrow: 'ACROSS PAKISTAN', title: 'One booking. Every kind of journey.', text: 'Explore available pickup points and vehicles in cities across Pakistan.' },
]

const FirstRunOnboarding = ({ onFinish }: { onFinish: () => void }) => {
  const [splash, setSplash] = useState(true)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1100)
    return () => window.clearTimeout(timer)
  }, [])

  const finish = () => {
    window.localStorage.setItem('safarrent-onboarding-complete', 'true')
    onFinish()
  }

  return (
    <div className={`sr-onboarding ${splash ? 'is-splash' : ''}`} role="dialog" aria-modal="true" aria-label="Welcome to SafarRent">
      <div className="sr-onboarding-art" style={{ backgroundImage: `url("${onboardingHero}")` }} />
      <div className="sr-onboarding-shade" />
      <div className="sr-onboarding-top"><SafarRentLogo variant="light" size="medium" showBadge={false} /><button type="button" onClick={finish} aria-label="Skip onboarding">Skip</button></div>
      <div className="sr-onboarding-copy" aria-live="polite">
        {splash ? <><span className="sr-onboarding-kicker">PAKISTAN, IN MOTION</span><h1>Every road<br/>starts here.</h1></> : <><span className="sr-onboarding-kicker">{onboardingSlides[slide].eyebrow}</span><h1>{onboardingSlides[slide].title}</h1><p>{onboardingSlides[slide].text}</p></>}
      </div>
      {!splash && <div className="sr-onboarding-controls"><div className="sr-onboarding-dots" aria-label={`Slide ${slide + 1} of ${onboardingSlides.length}`}>{onboardingSlides.map((item, index) => <span key={item.eyebrow} className={index === slide ? 'active' : ''} />)}</div><Button onClick={() => slide < onboardingSlides.length - 1 ? setSlide(slide + 1) : finish()} variant="contained">{slide < onboardingSlides.length - 1 ? 'Continue' : 'Explore SafarRent'}<span aria-hidden="true">→</span></Button></div>}
      <span className="sr-onboarding-location">PAKISTAN · NATIONWIDE RENTALS</span>
    </div>
  )
}

if (env.GOOGLE_ANALYTICS_ENABLED) {
  initGA()
}

const Header = lazy(() => import('@/components/Header'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const Activate = lazy(() => import('@/pages/Activate'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Home = lazy(() => import('@/pages/Home'))
const Search = lazy(() => import('@/pages/Search'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const CheckoutSession = lazy(() => import('@/pages/CheckoutSession'))
const Bookings = lazy(() => import('@/pages/Bookings'))
const Booking = lazy(() => import('@/pages/Booking'))
const Settings = lazy(() => import('@/pages/Settings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const ToS = lazy(() => import('@/pages/ToS'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const About = lazy(() => import('@/pages/About'))
const ChangePassword = lazy(() => import('@/pages/ChangePassword'))
const Contact = lazy(() => import('@/pages/Contact'))
const NoMatch = lazy(() => import('@/pages/NoMatch'))
const Locations = lazy(() => import('@/pages/Locations'))
const Suppliers = lazy(() => import('@/pages/Suppliers'))
const Faq = lazy(() => import('@/pages/Faq'))
const CookiePolicy = lazy(() => import('@/pages/CookiePolicy'))
const Kyc = lazy(() => import('@/pages/Kyc'))
const Handover = lazy(() => import('@/pages/Handover'))

const AppLayout = () => {
  const location = useLocation()
  const [refreshKey, setRefreshKey] = useState(0) // refreshKey to check user and notifications when navigating between routes
  const [showOnboarding, setShowOnboarding] = useState(() => !window.localStorage.getItem('safarrent-onboarding-complete'))

  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
  }, [location.pathname])

  return (
    <ErrorBoundary resetKey={location.pathname}>
      {showOnboarding && <FirstRunOnboarding onFinish={() => setShowOnboarding(false)} />}
      <SettingProvider>
        <UserProvider refreshKey={refreshKey}>
          <NotificationProvider refreshKey={refreshKey}>
            <RecaptchaProvider>
              <PayPalProvider>
                <ScrollToTop />
                <div className="app">
                  <Suspense fallback={<NProgressIndicator />}>
                    <Header />
                    <Outlet />
                  </Suspense>
                </div>
              </PayPalProvider>
            </RecaptchaProvider>
          </NotificationProvider>
        </UserProvider>
      </SettingProvider>
    </ErrorBoundary>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sign-in', element: <SignIn /> },
      { path: 'sign-up', element: <SignUp /> },
      { path: 'activate', element: <Activate /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'search', element: <Search /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'checkout-session/:sessionId', element: <CheckoutSession /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'booking', element: <Booking /> },
      { path: 'settings', element: <Settings /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'change-password', element: <ChangePassword /> },
      { path: 'about', element: <About /> },
      { path: 'tos', element: <ToS /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'contact', element: <Contact /> },
      { path: 'locations', element: <Locations /> },
      { path: 'faq', element: <Faq /> },
      { path: 'cookie-policy', element: <CookiePolicy /> },
      { path: 'kyc', element: <Kyc /> },
      { path: 'handover', element: <Handover /> },
      ...(env.HIDE_SUPPLIERS ? [] : [{ path: 'suppliers', element: <Suppliers /> }]),
      { path: '*', element: <NoMatch /> }
    ]
  }
])

const App = () => <RouterProvider router={router} />

export default App

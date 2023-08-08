import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Activate = lazy(() => import('./pages/Activate'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Home = lazy(() => import('./pages/Home'))
const Cars = lazy(() => import('./pages/Cars'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Bookings = lazy(() => import('./pages/Bookings'))
const Booking = lazy(() => import('./pages/Booking'))
const Settings = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const ToS = lazy(() => import('./pages/ToS'))
const About = lazy(() => import('./pages/About'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const Contact = lazy(() => import('./pages/Contact'))
const NoMatch = lazy(() => import('./pages/NoMatch'))

const App = () => (
  <Router>
    <div className="App">
      <Suspense fallback={<></>}>
        <Routes>
          <Route exact path="/sign-in" element={<SignIn />} />
          <Route exact path="/sign-up" element={<SignUp />} />
          <Route exact path="/activate" element={<Activate />} />
          <Route exact path="/forgot-password" element={<ForgotPassword />} />
          <Route exact path="/reset-password" element={<ResetPassword />} />
          <Route exact path="/" element={<Home />} />
          <Route exact path="/cars" element={<Cars />} />
          <Route exact path="/checkout" element={<Checkout />} />
          <Route exact path="/bookings" element={<Bookings />} />
          <Route exact path="/booking" element={<Booking />} />
          <Route exact path="/settings" element={<Settings />} />
          <Route exact path="/notifications" element={<Notifications />} />
          <Route exact path="/change-password" element={<ChangePassword />} />
          <Route exact path="/about" element={<About />} />
          <Route exact path="/tos" element={<ToS />} />
          <Route exact path="/contact" element={<Contact />} />

          <Route path="*" element={<NoMatch />} />
        </Routes>
      </Suspense>
    </div>
  </Router>
)

export default App

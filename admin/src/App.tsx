import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import { NotificationProvider } from '@/context/NotificationContext'
import { UserProvider } from '@/context/UserContext'
import { RecaptchaProvider } from '@/context/RecaptchaContext'
import ScrollToTop from '@/components/ScrollToTop'
import NProgressIndicator from '@/components/NProgressIndicator'

const Header = lazy(() => import('@/components/Header'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const Activate = lazy(() => import('@/pages/Activate'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const Suppliers = lazy(() => import('@/pages/Suppliers'))
const Supplier = lazy(() => import('@/pages/Supplier'))
const CreateSupplier = lazy(() => import('@/pages/CreateSupplier'))
const UpdateSupplier = lazy(() => import('@/pages/UpdateSupplier'))
const Locations = lazy(() => import('@/pages/Locations'))
const CreateLocation = lazy(() => import('@/pages/CreateLocation'))
const UpdateLocation = lazy(() => import('@/pages/UpdateLocation'))
const Cars = lazy(() => import('@/pages/Cars'))
const Car = lazy(() => import('@/pages/Car'))
const CreateCar = lazy(() => import('@/pages/CreateCar'))
const UpdateCar = lazy(() => import('@/pages/UpdateCar'))
const Bookings = lazy(() => import('@/pages/Bookings'))
const UpdateBooking = lazy(() => import('@/pages/UpdateBooking'))
const CreateBooking = lazy(() => import('@/pages/CreateBooking'))
const Users = lazy(() => import('@/pages/Users'))
const User = lazy(() => import('@/pages/User'))
const CreateUser = lazy(() => import('@/pages/CreateUser'))
const UpdateUser = lazy(() => import('@/pages/UpdateUser'))
const Settings = lazy(() => import('@/pages/Settings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const ToS = lazy(() => import('@/pages/ToS'))
const About = lazy(() => import('@/pages/About'))
const ChangePassword = lazy(() => import('@/pages/ChangePassword'))
const Contact = lazy(() => import('@/pages/Contact'))
const NoMatch = lazy(() => import('@/pages/NoMatch'))
const Countries = lazy(() => import('@/pages/Countries'))
const CreateCountry = lazy(() => import('@/pages/CreateCountry'))
const UpdateCountry = lazy(() => import('@/pages/UpdateCountry'))
const Scheduler = lazy(() => import('@/pages/Scheduler'))
const BankDetails = lazy(() => import('@/pages/BankDetails'))
const Pricing = lazy(() => import('@/pages/Pricing'))

const AppLayout = () => {
  const location = useLocation()
  const [refreshKey, setRefreshKey] = useState(0) // refreshKey to check user and notifications when navigating between routes

  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
  }, [location.pathname])

  return (
    <UserProvider refreshKey={refreshKey}>
      <NotificationProvider refreshKey={refreshKey}>
        <RecaptchaProvider>
          <ScrollToTop />
          <div className="app">
            <Suspense fallback={<NProgressIndicator />}>
              <Header />
              <Outlet />
            </Suspense>
          </div>
        </RecaptchaProvider>
      </NotificationProvider>
    </UserProvider>
  )
}


const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Bookings /> },
      { path: 'sign-in', element: <SignIn /> },
      { path: 'activate', element: <Activate /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      // { path: 'sign-up', element: <SignUp /> },
      { path: 'suppliers', element: <Suppliers /> },
      { path: 'supplier', element: <Supplier /> },
      // { path: 'create-supplier', element: <CreateSupplier /> },
      // { path: 'update-supplier', element: <UpdateSupplier /> },
      { path: 'locations', element: <Locations /> },
      // { path: 'create-location', element: <CreateLocation /> },
      // { path: 'update-location', element: <UpdateLocation /> },
      { path: 'cars', element: <Cars /> },
      { path: 'car', element: <Car /> },
      // { path: 'create-car', element: <CreateCar /> },
      // { path: 'update-car', element: <UpdateCar /> },
      { path: 'update-booking', element: <UpdateBooking /> },
      { path: 'create-booking', element: <CreateBooking /> },
      // { path: 'users', element: <Users /> },
      // { path: 'user', element: <User /> },
      // { path: 'create-user', element: <CreateUser /> },
      // { path: 'update-user', element: <UpdateUser /> },
      { path: 'settings', element: <Settings /> },
      { path: 'notifications', element: <Notifications /> },
      // { path: 'change-password', element: <ChangePassword /> },
      { path: 'about', element: <About /> },
      { path: 'tos', element: <ToS /> },
      { path: 'contact', element: <Contact /> },
      { path: 'countries', element: <Countries /> },
      // { path: 'create-country', element: <CreateCountry /> },
      // { path: 'update-country', element: <UpdateCountry /> },
      { path: 'scheduler', element: <Scheduler /> },
      { path: 'bank-details', element: <BankDetails /> },
      { path: 'pricing', element: <Pricing /> },
      { path: '*', element: <NoMatch /> }
    ]
  }
])

const App = () => <RouterProvider router={router} />

export default App

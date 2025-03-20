import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GlobalProvider } from '@/context/GlobalContext'
import { UserProvider } from '@/context/UserContext'
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

const App = () => (
  <BrowserRouter>
    <GlobalProvider>
      <UserProvider>
        <ScrollToTop />

        <div className="app">
          <Suspense fallback={<NProgressIndicator />}>
            <Header />

            <Routes>
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/activate" element={<Activate />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* <Route path="/sign-up" element={<SignUp />} /> */}
              <Route path="/" element={<Bookings />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/supplier" element={<Supplier />} />
              {/* <Route path="/create-supplier" element={<CreateSupplier />} /> */}
              {/* <Route path="/update-supplier" element={<UpdateSupplier />} /> */}
              <Route path="/locations" element={<Locations />} />
              {/* <Route path="/create-location" element={<CreateLocation />} /> */}
              {/* <Route path="/update-location" element={<UpdateLocation />} /> */}
              <Route path="/cars" element={<Cars />} />
              <Route path="/car" element={<Car />} />
              {/* <Route path="/create-car" element={<CreateCar />} /> */}
              {/* <Route path="/update-car" element={<UpdateCar />} /> */}
              <Route path="/update-booking" element={<UpdateBooking />} />
              <Route path="/create-booking" element={<CreateBooking />} />
              <Route path="/users" element={<Users />} />
              <Route path="/user" element={<User />} />
              {/* <Route path="/create-user" element={<CreateUser />} /> */}
              {/* <Route path="/update-user" element={<UpdateUser />} /> */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              {/* <Route path="/change-password" element={<ChangePassword />} /> */}
              <Route path="/about" element={<About />} />
              <Route path="/tos" element={<ToS />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/countries" element={<Countries />} />
              {/* <Route path="/create-country" element={<CreateCountry />} /> */}
              {/* <Route path="/update-country" element={<UpdateCountry />} /> */}
              <Route path="/scheduler" element={<Scheduler />} />
              <Route path="/bank-details" element={<BankDetails />} />
              <Route path="/pricing" element={<Pricing />} />

              <Route path="*" element={<NoMatch />} />
            </Routes>
          </Suspense>
        </div>
      </UserProvider>
    </GlobalProvider>
  </BrowserRouter>
)

export default App

import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

const SignIn = lazy(() => import('./pages/SignIn'))
const Activate = lazy(() => import('./pages/Activate'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Companies = lazy(() => import('./pages/Companies'))
const Company = lazy(() => import('./pages/Company'))
const CreateCompany = lazy(() => import('./pages/CreateCompany'))
const UpdateCompany = lazy(() => import('./pages/UpdateCompany'))
const Locations = lazy(() => import('./pages/Locations'))
const CreateLocation = lazy(() => import('./pages/CreateLocation'))
const UpdateLocation = lazy(() => import('./pages/UpdateLocation'))
const Cars = lazy(() => import('./pages/Cars'))
const Car = lazy(() => import('./pages/Car'))
const CreateCar = lazy(() => import('./pages/CreateCar'))
const UpdateCar = lazy(() => import('./pages/UpdateCar'))
const Bookings = lazy(() => import('./pages/Bookings'))
const UpdateBooking = lazy(() => import('./pages/UpdateBooking'))
const CreateBooking = lazy(() => import('./pages/CreateBooking'))
const Users = lazy(() => import('./pages/Users'))
const User = lazy(() => import('./pages/User'))
const CreateUser = lazy(() => import('./pages/CreateUser'))
const UpdateUser = lazy(() => import('./pages/UpdateUser'))
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
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/" element={<Bookings />} />
          <Route path="/suppliers" element={<Companies />} />
          <Route path="/supplier" element={<Company />} />
          <Route path="/create-supplier" element={<CreateCompany />} />
          <Route path="/update-supplier" element={<UpdateCompany />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/create-location" element={<CreateLocation />} />
          <Route path="/update-location" element={<UpdateLocation />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/car" element={<Car />} />
          <Route path="/create-car" element={<CreateCar />} />
          <Route path="/update-car" element={<UpdateCar />} />
          <Route path="/update-booking" element={<UpdateBooking />} />
          <Route path="/create-booking" element={<CreateBooking />} />
          <Route path="/users" element={<Users />} />
          <Route path="/user" element={<User />} />
          <Route path="/create-user" element={<CreateUser />} />
          <Route path="/update-user" element={<UpdateUser />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/tos" element={<ToS />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="*" element={<NoMatch />} />
        </Routes>
      </Suspense>
    </div>
  </Router>
  )

export default App

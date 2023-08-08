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
          <Route exact path="/sign-in" element={<SignIn />} />
          <Route exact path="/activate" element={<Activate />} />
          <Route exact path="/forgot-password" element={<ForgotPassword />} />
          <Route exact path="/reset-password" element={<ResetPassword />} />
          <Route exact path="/sign-up" element={<SignUp />} />
          <Route exact path="/" element={<Bookings />} />
          <Route exact path="/suppliers" element={<Companies />} />
          <Route exact path="/supplier" element={<Company />} />
          <Route exact path="/create-supplier" element={<CreateCompany />} />
          <Route exact path="/update-supplier" element={<UpdateCompany />} />
          <Route exact path="/locations" element={<Locations />} />
          <Route exact path="/create-location" element={<CreateLocation />} />
          <Route exact path="/update-location" element={<UpdateLocation />} />
          <Route exact path="/cars" element={<Cars />} />
          <Route exact path="/car" element={<Car />} />
          <Route exact path="/create-car" element={<CreateCar />} />
          <Route exact path="/update-car" element={<UpdateCar />} />
          <Route exact path="/update-booking" element={<UpdateBooking />} />
          <Route exact path="/create-booking" element={<CreateBooking />} />
          <Route exact path="/users" element={<Users />} />
          <Route exact path="/user" element={<User />} />
          <Route exact path="/create-user" element={<CreateUser />} />
          <Route exact path="/update-user" element={<UpdateUser />} />
          <Route exact path="/settings" element={<Settings />} />
          <Route exact path="/notifications" element={<Notifications />} />
          <Route exact path="/change-password" element={<ChangePassword />} />
          <Route exact path="/about" element={<About />} />
          <Route exact path="/tos" element={<ToS />} />
          <Route exact path="/contact" element={<Contact />} />

          <Route path="*" element={<NoMatch header />} />
        </Routes>
      </Suspense>
    </div>
  </Router>
)

export default App

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

const SignIn = lazy(() => import('./components/SignIn'));
const Activate = lazy(() => import('./components/Activate'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const SignUp = lazy(() => import('./components/SignUp'));
const Companies = lazy(() => import('./components/Companies'));
const Company = lazy(() => import('./components/Company'));
const CreateCompany = lazy(() => import('./components/CreateCompany'));
const UpdateCompany = lazy(() => import('./components/UpdateCompany'));
const Locations = lazy(() => import('./components/Locations'));
const CreateLocation = lazy(() => import('./components/CreateLocation'));
const UpdateLocation = lazy(() => import('./components/UpdateLocation'));
const Cars = lazy(() => import('./components/Cars'));
const Car = lazy(() => import('./components/Car'));
const CreateCar = lazy(() => import('./components/CreateCar'));
const UpdateCar = lazy(() => import('./components/UpdateCar'));
const Bookings = lazy(() => import('./components/Bookings'));
const Booking = lazy(() => import('./components/Booking'));
const CreateBooking = lazy(() => import('./components/CreateBooking'));
const Users = lazy(() => import('./components/Users'));
const User = lazy(() => import('./components/User'));
const CreateUser = lazy(() => import('./components/CreateUser'));
const UpdateUser = lazy(() => import('./components/UpdateUser'));
const Settings = lazy(() => import('./components/Settings'));
const Notifications = lazy(() => import('./components/Notifications'));
const ToS = lazy(() => import('./components/ToS'));
const About = lazy(() => import('./components/About'));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const Contact = lazy(() => import('./components/Contact'));
const NoMatch = lazy(() => import('./components/NoMatch'));

const App = () => (
	<Router>
		<div className='App'>
			<Suspense fallback={<></>}>
				<Routes>
					<Route exact path='/sign-in' element={<SignIn />} />
					<Route exact path='/activate' element={<Activate />} />
					<Route exact path='/forgot-password' element={<ForgotPassword />} />
					<Route exact path='/reset-password' element={<ResetPassword />} />
					<Route exact path='/sign-up' element={<SignUp />} />
					<Route exact path='/' element={<Bookings />} />
					<Route exact path='/suppliers' element={<Companies />} />
					<Route exact path='/supplier' element={<Company />} />
					<Route exact path='/create-supplier' element={<CreateCompany />} />
					<Route exact path='/update-supplier' element={<UpdateCompany />} />
					<Route exact path='/locations' element={<Locations />} />
					<Route exact path='/create-location' element={<CreateLocation />} />
					<Route exact path='/update-location' element={<UpdateLocation />} />
					<Route exact path='/cars' element={<Cars />} />
					<Route exact path="/car" element={<Car />} />
					<Route exact path='/create-car' element={<CreateCar />} />
					<Route exact path='/update-car' element={<UpdateCar />} />
					<Route exact path='/booking' element={<Booking />} />
					<Route exact path='/create-booking' element={<CreateBooking />} />
					<Route exact path='/users' element={<Users />} />
					<Route exact path='/user' element={<User />} />
					<Route exact path='/create-user' element={<CreateUser />} />
					<Route exact path='/update-user' element={<UpdateUser />} />
					<Route exact path='/settings' element={<Settings />} />
					<Route exact path='/notifications' element={<Notifications />} />
					<Route exact path='/change-password' element={<ChangePassword />} />
					<Route exact path='/about' element={<About />} />
					<Route exact path='/tos' element={<ToS />} />
					<Route exact path='/contact' element={<Contact />} />

					<Route path='*' element={<NoMatch header />} />
				</Routes>
			</Suspense>
		</div>
	</Router>
);

export default App;

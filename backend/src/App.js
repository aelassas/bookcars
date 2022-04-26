import React from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import Signin from './components/Signin';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Companies from './components/Companies';
import Company from './components/Company';
import CreateCompany from './components/CreateCompany';
import Cars from './components/Cars';
import Car from './components/Car';
import CreateCar from './components/CreateCar';
import Reservations from './components/Reservations';
import Reservation from './components/Reservation';
import CreateReservation from './components/CreateReservation';
import Users from './components/Users';
import User from './components/User';
import CreateUser from './components/CreateUser';
import Settings from './components/Settings';
import Notifications from "./components/Notifications";
import Messages from "./components/Messages";
import ToS from './components/ToS';
import About from './components/About';
import ResetPassword from './components/ResetPassword';
import Contact from './components/Contact';

import './assets/css/common.css';
import './assets/css/index.css';
import 'react-toastify/dist/ReactToastify.min.css';

const App = () => {
	return (
		<Router>
			<div className="App">
				<Routes>
					<Route exact path="/sign-in" element={<Signin />} />
					<Route exact path="/sign-up" element={<Signup />} />
					<Route exact path="/dashboard" element={<Dashboard />} />
					<Route exact path="/companies" element={<Companies />} />
					<Route exact path="/company" element={<Company />} />
					<Route exact path="/create-company" element={<CreateCompany />} />
					<Route exact path="/cars" element={<Cars />} />
					<Route exact path="/car" element={<Car />} />
					<Route exact path="/create-car" element={<CreateCar />} />
					<Route exact path="/reservations" element={<Reservations />} />
					<Route exact path="/reservation" element={<Reservation />} />
					<Route exact path="/create-reservation" element={<CreateReservation />} />
					<Route exact path="/users" element={<Users />} />
					<Route exact path="/user" element={<User />} />
					<Route exact path="/create-user" element={<CreateUser />} />
					<Route exact path="/settings" element={<Settings />} />
					<Route exact path="/notifications" element={<Notifications />} />
					<Route exact path="/messages" element={<Messages />} />
					<Route exact path="/reset-password" element={<ResetPassword />} />
					<Route exact path="/tos" element={<ToS />} />
					<Route exact path="/about" element={<About />} />
					<Route exact path="/contact" element={<Contact />} />
					<Route path="*" element={<Navigate to="/sign-in" />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;

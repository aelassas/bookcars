import React from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import Signin from './components/Signin';
import Signup from './components/Signup';
import Home from './components/Home';
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
					<Route exact path="/" element={<Home />} />
					<Route exact path="/settings" element={<Settings />} />
					<Route exact path="/notifications" element={<Notifications />} />
					<Route exact path="/messages" element={<Messages />} />
					<Route exact path="/reset-password" element={<ResetPassword />} />
					<Route exact path="/tos" element={<ToS />} />
					<Route exact path="/about" element={<About />} />
					<Route exact path="/contact" element={<Contact />} />
					<Route path="*" element={<Navigate to="/" />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;

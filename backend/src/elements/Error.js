import React from 'react';
import { strings } from '../config/app.config';
import { Link } from '@mui/material';

import '../assets/css/error.css';

const Error = ({ message, style, homeLink }) => (
	<div style={style}>
		<div className="error">
			<span className="message">{message}</span>
		</div>
		{homeLink && <p><Link href='/'>{strings.GO_TO_HOME}</Link></p>}
	</div>
);

export default Error;

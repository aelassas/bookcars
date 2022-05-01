import React from 'react';
import '../assets/css/error.css';

const Error = ({ message, style }) => (
	<div style={style}>
		<div className="errorContainer alert alert-danger" role="alert">
			<span className="glyphicon glyphicon-thumbs-down"></span>
			<span className="message">{message}</span>
		</div>
	</div>
);

export default Error;

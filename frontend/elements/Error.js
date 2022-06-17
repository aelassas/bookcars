import React, { useEffect } from 'react';
import { strings as commonStrings } from '../lang/common';
import { Link } from '@mui/material';
import Helper from '../common/Helper';

import styles from '../styles/error.module.css';

export default function Error({ message, style, homeLink }) {

	useEffect(() => {
		Helper.setLanguage(commonStrings);
	}, []);

	return (
		<div style={style}>
			<div className={styles.error}>
				<span className={styles.message}>{message ?? commonStrings.GENERIC_ERROR}</span>
			</div>
			{homeLink && <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>}
		</div>
	);
}

import React from 'react';
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/info-box.css';

const InfoBox = ({ className, value }) => (
    <div className={`info-box${className ? ' ' : ''}${className || ''}`}>
        <InfoIcon className='info-box-icon' />
        <label className='info-box-text'>{value}</label>
    </div>
);

export default InfoBox;
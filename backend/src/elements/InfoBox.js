import React, { Component } from 'react';
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/info-box.css';

class InfoBox extends Component {
    render() {
        return (
            <div className={`info-box${this.props.className ? ' ' : ''}${this.props.className || ''}`}>
                <InfoIcon className='info-box-icon' />
                <label className='info-box-text'>{this.props.value}</label>
            </div>
        );
    }
}

export default InfoBox;
import React, { Component } from 'react';

import '../assets/css/info-box.css';

class InfoBox extends Component {
    render() {
        return (
            <div className={`info-box${this.props.className ? ' ' : ''}${this.props.className || ''}`}>
                <h2>{this.props.value}</h2>
            </div>
        );
    }
}

export default InfoBox;
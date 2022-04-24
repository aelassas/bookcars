import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/notifications.css';

export default class Notifications extends Component {

    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {
    }

    render() {
        return (
            <div>
                <Header />
                <div className='content'>Notifications!</div>
            </div>
        );
    }
}
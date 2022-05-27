import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/reservation.css';

export default class Booking extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null
        };
    }

    onLoad = (user) => {
        this.setState({ user });
    }

    componentDidMount() {
    }

    render() {

        return (
            <Master onLoad={this.onLoad} strict={false}>
                Booking!
            </Master>
        );
    }
}
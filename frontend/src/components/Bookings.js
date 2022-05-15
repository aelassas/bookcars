import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/reservations.css';

export default class Bookings extends Component {

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
            <Master onLoad={this.onLoad} strict={true}>
                Bookings!
            </Master>
        );
    }
}
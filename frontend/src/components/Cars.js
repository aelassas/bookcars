import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/cars.css';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null
        };
    }

    onLoad = (user) => {
        this.setState({ user });
        // TODO noMatch async/await
        // TODO col-1 (companies-filter)
        // TODO col-2 (cars-list)
        // TODO col-1 (pickup, drop-off, from, to filter)

        // TODO: gearbox filter (add electric/Électrique)
        // TODO: mileage filter (unlimited checkbox)
    }

    componentDidMount() {
    }

    render() {

        return (
            <Master onLoad={this.onLoad} strict={false}>
                Cars!
            </Master>
        );
    }
}
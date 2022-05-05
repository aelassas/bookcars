import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/update-car.css';

export default class UpdateCar extends Component {

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
                Update Car!
            </Master>
        );
    }
}
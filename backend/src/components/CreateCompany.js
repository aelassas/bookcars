import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/create-company.css';

export default class CreateCompany extends Component {

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
                Create Company!
            </Master>
        );
    }
}
import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/reset-password.css';

export default class ResetPassword extends Component {

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
            <Master onLoad={this.onLoad}>
                ResetPassword!
            </Master>
        );
    }
}
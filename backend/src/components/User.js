import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/user.css';

export default class User extends Component {

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
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                User!
            </Master>
        );
    }
}
import React, { Component } from 'react';
import Master from '../elements/Master';

import styles from '../styles/notifications.module.css';

export default class Notifications extends Component {

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
                Notifications!
            </Master>
        );
    }
}
import React, { Component } from 'react';
import Master from '../elements/Master';

import styles from '../styles/about.module.css';

export default class About extends Component {

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
                About!
            </Master>
        );
    }
}
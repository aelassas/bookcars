import React, { Component } from 'react';
import Master from '../elements/Master';

import '../assets/css/about.css';

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
            <Master onLoad={this.onLoad}>
                About!
            </Master>
        );
    }
}
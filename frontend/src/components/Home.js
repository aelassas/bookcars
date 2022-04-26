import React, { Component } from 'react';
import Master from '../elements/Master';
import '../assets/css/home.css';

export default class Home extends Component {

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
                Home!
            </Master>
        );
    }
}
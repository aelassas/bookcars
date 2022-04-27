import React, { Component } from 'react';
import Master from '../elements/Master';
import '../assets/css/companies.css';

export default class Companies extends Component {

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
                Companies!
            </Master>
        );
    }
}
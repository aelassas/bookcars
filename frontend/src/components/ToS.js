import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/resetPassword.css';

export default class ToS extends Component {

    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {
    }

    render() {
        return (
            <div>
                <Header />
                <div className='content'>ToS!</div>
            </div>
        );
    }
}
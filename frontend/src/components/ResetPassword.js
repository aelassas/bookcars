import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/resetPassword.css';

export default class ResetPassword extends Component {

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
                <div className='content'>ResetPassword!</div>
            </div>
        );
    }
}
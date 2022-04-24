import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/contact.css';

export default class Contact extends Component {

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
                <div className='content'>Contact!</div>
            </div>
        );
    }
}
import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/messages.css';

export default class Messages extends Component {

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
                <div className='content'>Messages!</div>
            </div>
        );
    }
}
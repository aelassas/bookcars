import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/about.css';

export default class About extends Component {

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
                <div className='content'>About!</div>
            </div>
        );
    }
}
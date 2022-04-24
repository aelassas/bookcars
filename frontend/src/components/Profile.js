import React, { Component } from 'react';
import Header from '../elements/Header';
import '../assets/css/profile.css';

export default class Profile extends Component {

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
                <div className='content'>Profile!</div>
            </div>
        );
    }
}
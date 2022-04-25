import React, { Component } from 'react';
import Header from '../elements/Header';
import {
    getCurrentUser,
    validateAccessToken,
    getUser,
    signout
} from '../services/user-service';
import '../assets/css/about.css';

export default class About extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null
        };
    }

    componentDidMount() {
        const currentUser = getCurrentUser();
        if (currentUser) {
            validateAccessToken().then(status => {
                if (status === 200) {
                    getUser(currentUser.id).then(user => {
                        if (user) {

                            if (user.isBlacklisted) {
                                signout();
                                return;
                            }

                            this.setState({ user });
                        }
                    });
                }
            });
        }
    }

    render() {
        const { user } = this.state;

        return (
            <div>
                <Header user={user} />
                <div className='content'>About!</div>
            </div>
        );
    }
}
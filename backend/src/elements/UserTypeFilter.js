import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';

import '../assets/css/user-type-filter.css';

class UserTypeFilter extends Component {

    constructor(props) {
        super(props);
        this.state = {
            userTypes: [],
            checkedUserTypes: [],
            allUserTypesChecked: true
        }
    }

    handleUserTypeClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleUserTypeChange(event);
    };

    handleUserTypeChange = (e) => {
        const { checkedUserTypes } = this.state;
        const user = e.currentTarget.getAttribute('data-value');

        if (e.currentTarget.checked) {
            checkedUserTypes.push(user);
        } else {
            const index = checkedUserTypes.findIndex(s => s === user);
            checkedUserTypes.splice(index, 1);
        }

        this.setState({ checkedUserTypes }, () => {
            if (this.props.onChange) {
                this.props.onChange(checkedUserTypes);
            }
        });
    };

    handleUncheckAllChange = (e) => {
        const { allUserTypesChecked } = this.state;
        const checkboxes = document.querySelectorAll('.user-type-checkbox');

        if (allUserTypesChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allUserTypesChecked: false, checkedUserTypes: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const userTypes = this.state.userTypes.map(user => user.value);
            this.setState({ allUserTypesChecked: true, checkedUserTypes: userTypes }, () => {
                if (this.props.onChange) {
                    this.props.onChange(userTypes);
                }
            });
        }
    };

    componentDidMount() {
        const userTypes = Helper.getUserTypes();

        this.setState({ userTypes, checkedUserTypes: Helper.clone(userTypes.map(user => user.value)) }, () => {
            const checkboxes = document.querySelectorAll('.user-type-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            if (this.props.onLoad) {
                this.props.onLoad(this.state.checkedUserTypes);
            }
        });
    }

    render() {
        const { userTypes, allUserTypesChecked } = this.state;

        return (
            userTypes.length > 0 ? (
                <div className={`${this.props.className ? `${this.props.className} ` : ''}user-type-filter`}>
                    <ul className='user-type-list'>
                        {
                            userTypes.map(user => (
                                <li key={user.value}>
                                    <input type='checkbox' data-value={user.value} className='user-type-checkbox' onChange={this.handleUserTypeChange} />
                                    <label onClick={this.handleUserTypeClick} className={`bs bs-${user.value}`}>{Helper.getUserType(user.value)}</label>
                                </li>
                            ))
                        }
                    </ul>
                    <div className='filter-actions'>
                        <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                            {allUserTypesChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </div>
            )
                :
                <></>
        );
    }
}

export default UserTypeFilter;
import React, { Component } from 'react';
import { strings } from "../lang/cars";

import '../assets/css/mileage-filter.css'

class MileageFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            unlimited: true
        }
    }

    handleCheckMileageChange = (e) => {
        const unlimited = e.currentTarget.checked;

        this.setState({ unlimited }, () => {
            if (this.props.onChange) {
                this.props.onChange(unlimited);
            }
        });
    };

    handleMileageClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckMileageChange(event);
    };

    componentDidMount() {
        document.querySelector('.mileage-checkbox').checked = true;
    }

    render() {
        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}mileage-filter`}>
                <label className='title'>{strings.MILEAGE}</label>
                <div className='filter-elements'>
                    <div className='filter-element'>
                        <input type='checkbox' className='mileage-checkbox' onChange={this.handleCheckMileageChange} />
                        <label onClick={this.handleMileageClick}>{strings.UNLIMITED}</label>
                    </div>
                </div>
            </div>
        );
    }
}

export default MileageFilter;
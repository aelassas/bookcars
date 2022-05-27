import React, { Component } from 'react';

import '../assets/css/accordion.css'

class Accordion extends Component {


    handleAccordionClick = (e) => {
        e.currentTarget.classList.toggle('accordion-active');
        const panel = e.currentTarget.nextElementSibling;

        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }
    };

    render() {
        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}accordion-container`}>
                <label className='accordion' onClick={this.handleAccordionClick}>{this.props.title}</label>
                <div className='panel'>{this.props.children}</div>
            </div>
        );
    }
}

export default Accordion;
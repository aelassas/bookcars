import React, { Component } from 'react';

import '../assets/css/accordion.css'

class Accordion extends Component {

    handleAccordionClick = (e) => {
        e.currentTarget.classList.toggle('accordion-active');
        const panel = e.currentTarget.nextElementSibling;
        const collapse = panel.classList.contains('panel-collapse');

        if (panel.style.maxHeight || collapse) {

            if (collapse) {
                panel.classList.remove('panel-collapse');
                panel.classList.add('panel');
            }

            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }
    };

    componentDidMount() {
        if (this.props.collapse) {
            const accordion = document.querySelector('.accordion');
            const panel = accordion.nextElementSibling;
            accordion.classList.toggle('accordion-active');
            panel.style.maxHeight = (panel.scrollHeight + this.props.offsetHeight) + 'px';
        }
    }

    render() {
        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}accordion-container`}>
                <label className='accordion' onClick={this.handleAccordionClick}>{this.props.title}</label>
                <div className={this.props.collapse ? 'panel-collapse' : 'panel'}>{this.props.children}</div>
            </div>
        );
    }
}

export default Accordion;
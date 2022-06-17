import React, { Component } from 'react';

import styles from '../styles/accordion.module.css';

class Accordion extends Component {

    handleAccordionClick = (e) => {
        e.currentTarget.classList.toggle(styles.accordionActive);
        const panel = e.currentTarget.nextElementSibling;
        const collapse = panel.classList.contains(styles.panelCollapse);

        if (panel.style.maxHeight || collapse) {

            if (collapse) {
                panel.classList.remove(styles.panelCollapse);
                panel.classList.add(styles.panel);
            }

            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }
    };

    componentDidMount() {
        if (this.props.collapse) {
            const accordion = document.querySelector(`.${styles.accordion}`);
            const panel = accordion.nextElementSibling;
            accordion.classList.toggle(styles.accordionActive);
            panel.style.maxHeight = (panel.scrollHeight + this.props.offsetHeight) + 'px';
        }
    }

    render() {
        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}${styles.accordionContainer}`}>
                <label className={styles.accordion} onClick={this.handleAccordionClick}>{this.props.title}</label>
                <div className={this.props.collapse ? styles.panelCollapse : styles.panel}>{this.props.children}</div>
            </div>
        );
    }
}

export default Accordion;
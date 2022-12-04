import React, { useEffect, useRef } from 'react';

import '../assets/css/accordion.css';

const Accordion = (props) => {

    const accordionRef = useRef();

    const handleAccordionClick = (e) => {
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

    useEffect(() => {
        if (props.collapse) {
            const panel = accordionRef.current.nextElementSibling;
            accordionRef.current.classList.toggle('accordion-active');
            panel.style.maxHeight = (panel.scrollHeight + props.offsetHeight) + 'px';
        }
    }, [props.collapse, props.offsetHeight]);

    return (
        <div className={`${props.className ? `${props.className} ` : ''}accordion-container`}>
            <label ref={accordionRef} className='accordion' onClick={handleAccordionClick}>{props.title}</label>
            <div className={props.collapse ? 'panel-collapse' : 'panel'}>{props.children}</div>
        </div>
    );
};

export default Accordion;
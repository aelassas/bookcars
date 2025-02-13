import React, { ReactNode, useEffect, useRef } from 'react'

import '@/assets/css/accordion.css'

interface AccordionProps {
  title?: string
  className?: string
  collapse?: boolean
  offsetHeight?: number
  children: ReactNode
}

const Accordion = ({
  title,
  className,
  collapse,
  offsetHeight = 0,
  children
}: AccordionProps) => {
  const accordionRef = useRef<HTMLLabelElement>(null)

  const handleAccordionClick = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.classList.toggle('accordion-active')
    const panel = e.currentTarget.nextElementSibling as HTMLDivElement
    const _collapse = panel.classList.contains('panel-collapse')

    if (panel.style.minHeight || _collapse) {
      if (_collapse) {
        panel.classList.remove('panel-collapse')
        panel.classList.add('panel')
        panel.style.minHeight = ''
        panel.style.maxHeight = '0'
      }
    } else {
      panel.style.minHeight = `${panel.scrollHeight}px`
      panel.style.maxHeight = ''
      panel.classList.remove('panel')
      panel.classList.add('panel-collapse')
    }
  }

  useEffect(() => {
    if (collapse && accordionRef.current) {
      accordionRef.current.classList.add('accordion-active')
    }
  }, [collapse])

  useEffect(() => {
    if (collapse && accordionRef.current) {
      const panel = accordionRef.current.nextElementSibling as HTMLDivElement
      panel.style.minHeight = `${panel.scrollHeight + offsetHeight}px`
      panel.style.maxHeight = ''
    }
  }, [offsetHeight]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${className ? `${className} ` : ''}accordion-container`}>
      <span
        ref={accordionRef}
        className="accordion"
        onClick={handleAccordionClick}
        role="button"
        tabIndex={0}
      >
        {title}
      </span>
      <div className={collapse ? 'panel-collapse' : 'panel'}>{children}</div>
    </div>
  )
}

export default Accordion

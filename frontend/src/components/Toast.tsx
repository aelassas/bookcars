import React, { useState } from 'react'
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material'

import '@/assets/css/toast.css'

interface ToastProps {
  title?: string,
  text: string
  status: 'success' | 'error'
}

const Toast = ({ title, text, status }: ToastProps) => {
  const [close, setClose] = useState(false)
  return (
    !close && (
      <div className={`toast toast-${status}`}>
        {status === 'success' ? <CheckIcon className="icon" /> : <ErrorIcon className="icon" />}
        <div className="toast-content">
          {title && <span className="title">{title}</span>}
          <span className="text">{text}</span>
        </div>
        <div onClick={() => setClose(true)} role="presentation" className="close">
          <CloseIcon className="icon" />
        </div>
      </div>
    )
  )
}

export default Toast

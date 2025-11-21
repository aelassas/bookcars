import React, { useState, useEffect, useRef } from 'react'
import {
  Paper,
  FormControl,
  InputLabel,
  Input,
  Button,
  FormHelperText,
  Typography,
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import Error from './Error'
import * as helper from '@/utils/helper'

import '@/assets/css/signin.css'

interface OTPVerificationProps {
  identifier: string // email or phone
  type: 'email' | 'sms'
  purpose: 'signup' | 'signin' | 'password-reset' | 'phone-verification'
  onVerified: () => void
  onCancel?: () => void
  onError?: (error: string) => void
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  identifier,
  type,
  purpose,
  onVerified,
  onCancel,
  onError,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Auto-send OTP on mount
    sendOTP()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendOTP = async () => {
    try {
      setSending(true)
      setError('')
      const result = await UserService.sendOTP({
        identifier,
        type,
        purpose,
      })
      if (result.status === 200) {
        setCountdown(60) // 60 second cooldown
        helper.info(commonStrings.OTP_SENT || 'OTP sent successfully')
      } else {
        setError(result.message || 'Failed to send OTP')
        if (onError) onError(result.message || 'Failed to send OTP')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send OTP'
      setError(errorMessage)
      if (onError) onError(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d{1,6}$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
      setOtp(newOtp)
      const nextIndex = Math.min(pastedData.length, 5)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    try {
      setLoading(true)
      setError('')
      const result = await UserService.verifyOTP({
        identifier,
        otp: otpString,
        type,
        purpose,
      })

      if (result.status === 200 && result.verified) {
        helper.info(commonStrings.OTP_VERIFIED || 'OTP verified successfully')
        onVerified()
      } else {
        setError(result.message || 'Invalid OTP')
        // Clear OTP on error
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify OTP'
      setError(errorMessage)
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper className="signin-form" elevation={10} style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <Typography variant="h6" style={{ marginBottom: '20px', textAlign: 'center' }}>
        {commonStrings.VERIFY_OTP || 'Verify OTP'}
      </Typography>
      <Typography variant="body2" style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
        {type === 'email'
          ? `We've sent a 6-digit code to ${identifier}`
          : `We've sent a 6-digit code to ${identifier}`}
      </Typography>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
        {otp.map((digit, index) => (
          <FormControl key={index} style={{ width: '50px' }}>
            <Input
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              inputProps={{
                maxLength: 1,
                style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' },
              }}
              autoFocus={index === 0}
            />
          </FormControl>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: '15px' }}>
          <Error message={error} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
        <Button
          type="button"
          variant="contained"
          className="btn-primary"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          fullWidth
        >
          {loading ? (commonStrings.LOADING || 'Verifying...') : (commonStrings.VERIFY || 'Verify')}
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        {countdown > 0 ? (
          <Typography variant="body2" color="textSecondary">
            {commonStrings.RESEND_OTP_IN || 'Resend OTP in'} {countdown}s
          </Typography>
        ) : (
          <Button
            variant="text"
            onClick={sendOTP}
            disabled={sending}
            className="btn-lnk"
          >
            {sending ? (commonStrings.SENDING || 'Sending...') : (commonStrings.RESEND_OTP || 'Resend OTP')}
          </Button>
        )}
      </div>

      {onCancel && (
        <div style={{ textAlign: 'center' }}>
          <Button variant="text" onClick={onCancel} className="btn-lnk">
            {commonStrings.CANCEL || 'Cancel'}
          </Button>
        </div>
      )}
    </Paper>
  )
}

export default OTPVerification



import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Box,
  Typography,
  Alert
} from '@mui/material'
import {
  VpnKey as KeyIcon,
  CheckCircle as SuccessIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/reset-password'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import SafarRentLogo from '@/components/SafarRentLogo'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ForgotPasswordForm'

import '@/assets/css/forgot-password.css'

const ForgotPassword = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  const onSubmit = async ({ email }: FormFields) => {
    try {
      const status = await UserService.resend(email, true)
      if (status === 200) {
        setSent(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <Box
        className="forgot-password"
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 2,
          background: 'linear-gradient(180deg, rgba(11, 17, 32, 0.03) 0%, transparent 100%)'
        }}
      >
        <Paper
          elevation={12}
          sx={{
            width: '100%',
            maxWidth: 460,
            borderRadius: '20px',
            p: { xs: 3, sm: 4.5 },
            border: '1px solid var(--sr-border, #E2E8F0)',
            background: 'var(--sr-surface, #FFFFFF)',
            boxShadow: '0 20px 40px rgba(11, 17, 32, 0.08)',
            display: visible ? 'block' : 'none'
          }}
        >
          {/* Header Icon & Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                bgcolor: 'rgba(5, 150, 105, 0.1)',
                color: 'var(--sr-emerald)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <KeyIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 0.5 }}>
              {strings.RESET_PASSWORD_HEADING}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your registered email address and we will send you a secure link to reset your password.
            </Typography>
          </Box>

          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  onChange={() => {
                    if (errors.email) {
                      clearErrors('email')
                    }
                  }}
                  type="email"
                  error={!!errors.email}
                  autoComplete="off"
                  required
                />
                <FormHelperText error={!!errors.email}>
                  {errors.email?.message || ''}
                </FormHelperText>
              </FormControl>

              <SocialLogin redirectToHomepage />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
                <Button
                  type="submit"
                  className="btn-primary"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#107487',
                    '&:hover': { bgcolor: '#047857' },
                    fontWeight: 700,
                    py: 1.2,
                    textTransform: 'none',
                    borderRadius: '10px'
                  }}
                >
                  {strings.RESET}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/sign-in')}
                  startIcon={<BackIcon />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '10px',
                    borderColor: 'var(--sr-border, #CBD5E1)',
                    color: 'var(--sr-text, #334155)'
                  }}
                >
                  Return to Sign In
                </Button>
              </Box>
            </form>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Alert severity="success" icon={<SuccessIcon sx={{ color: 'var(--sr-emerald)' }} />} sx={{ mb: 3, borderRadius: '12px' }}>
                {strings.EMAIL_SENT}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Check your spam or junk folder if you don&apos;t see the email within 2 minutes.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                sx={{
                  bgcolor: '#107487',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  py: 1.2
                }}
              >
                {commonStrings.GO_TO_HOME}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      <Footer />
    </Layout>
  )
}

export default ForgotPassword

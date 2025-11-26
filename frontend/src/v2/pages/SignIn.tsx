import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as suStrings } from '@/lang/sign-up'
import { strings } from '@/lang/sign-in'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import SocialLogin from '@/components/SocialLogin'
import { schema, FormFields } from '@/models/SignInForm'
import PasswordInput from '@/components/PasswordInput'
import '@/v2/assets/css/signin.css'
import '@/assets/css/social-login.css'

const SignIn = () => {
  const navigate = useNavigate()
  const { setUser, setUserLoaded } = useUserContext() as UserContextType

  const [visible, setVisible] = useState(false)
  const [stayConnected, setStayConnected] = useState(false)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  useEffect(() => {
    UserService.setStayConnected(false)
    setStayConnected(false)

    const currentUser = UserService.getCurrentUser()
    if (currentUser) {
      // User is already logged in, redirect
      const params = new URLSearchParams(window.location.search)

      if (params.has('from')) {
        const from = params.get('from')
        if (from === 'checkout') {
          navigate('/checkout', {
            state: {
              carId: params.get('c'),
              pickupLocationId: params.get('p'),
              dropOffLocationId: params.get('d'),
              from: new Date(Number(params.get('f'))),
              to: new Date(Number(params.get('t'))),
            }
          })
        } else {
          navigate('/')
        }
      } else {
        navigate('/')
      }
    } else {
      setVisible(true)
    }
  }, [navigate])

  const signinError = () => {
    setError('root', { message: strings.ERROR_IN_SIGN_IN })
  }

  const onSubmit = async ({ email, password }: FormFields) => {
    try {
      const data: bookcarsTypes.SignInPayload = {
        email,
        password,
        stayConnected: UserService.getStayConnected()
      }

      const res = await UserService.signin(data)

      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout(false)
          setError('root', { message: strings.IS_BLACKLISTED })
        } else {
          const user = await UserService.getUser(res.data._id)
          setUser(user)
          setUserLoaded(true)

          // Handle navigation after successful login
          const params = new URLSearchParams(window.location.search)
          if (params.has('from')) {
            const from = params.get('from')
            if (from === 'checkout') {
              navigate('/checkout', {
                state: {
                  carId: params.get('c'),
                  pickupLocationId: params.get('p'),
                  dropOffLocationId: params.get('d'),
                  from: new Date(Number(params.get('f'))),
                  to: new Date(Number(params.get('t'))),
                }
              })
            } else {
              navigate('/')
            }
          } else {
            navigate('/')
          }
        }
      } else {
        signinError()
      }
    } catch {
      signinError()
    }
  }

  const handleStayConnectedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setStayConnected(checked)
    UserService.setStayConnected(checked)
  }

  if (!visible) {
    return null
  }

  return (
    <main className="signin-page">
      <div className="signin-page-container">
        <div className="signin-page-card">
          <h1 className="signin-page-title">{strings.SIGN_IN_HEADING}</h1>
          <p className="signin-page-subtitle">Sign in to your Tokyo Drive account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="signin-page-form">
            {/* Social Login */}
            <div className="signin-page-social">
              <SocialLogin />
            </div>

            {/* Divider */}
            <div className="signin-page-divider">
              <hr />
              <span>or</span>
              <hr />
            </div>

            {/* Email */}
            <div className="signin-page-field">
              <label className="signin-page-label">
                {commonStrings.EMAIL} <span className="signin-page-required">*</span>
              </label>
              <input
                type="email"
                {...register('email', {
                  onChange: (e) => {
                    if (errors.email) {
                      clearErrors('email')
                    }
                    setValue('email', e.target.value)
                  }
                })}
                className={`signin-page-input ${errors.email ? 'signin-page-input-error' : ''}`}
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
              {errors.email && (
                <span className="signin-page-error">{errors.email.message}</span>
              )}
            </div>

            {/* Password */}
            <div className="signin-page-field">
              <div className="signin-page-password-wrapper">
                <PasswordInput
                  label={commonStrings.PASSWORD}
                  variant="outlined"
                  {...register('password')}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  onChange={(e) => {
                    if (errors.password) {
                      clearErrors('password')
                    }
                    setValue('password', e.target.value)
                  }}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="signin-page-options">
              <label className="signin-page-checkbox-label">
                <input
                  type="checkbox"
                  checked={stayConnected}
                  onChange={handleStayConnectedChange}
                  className="signin-page-checkbox"
                />
                <span className="signin-page-checkbox-text">{strings.STAY_CONNECTED}</span>
              </label>
              <Link to="/forgot-password" className="signin-page-forgot-link">
                {strings.RESET_PASSWORD}
              </Link>
            </div>

            {/* Form Errors */}
            <div className="signin-page-form-errors">
              {errors.root && <Error message={errors.root.message!} />}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="signin-page-button signin-page-button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? commonStrings.PLEASE_WAIT : strings.SIGN_IN}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="signin-page-footer">
            <p className="signin-page-footer-text">Don't have an account?</p>
            <Link to="/sign-up" className="signin-page-footer-link">
              Create account
            </Link>
          </div>
        </div>
      </div>

      {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </main>
  )
}

export default SignIn


import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import DatePicker from '@/components/DatePicker'
import SocialLogin from '@/components/SocialLogin'
import { schema, FormFields } from '@/models/SignUpForm'
import PasswordInput from '@/components/PasswordInput'
import '@/v2/assets/css/signup.css'
import '@/assets/css/social-login.css'

const SignUp = () => {
    const navigate = useNavigate()

    const { setUser, setUserLoaded } = useUserContext() as UserContextType
    const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

    const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
    const [recaptchaError, setRecaptchaError] = useState(false)
    const [visible, setVisible] = useState(false)

    const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, setValue, watch } = useForm<FormFields>({
        resolver: zodResolver(schema),
        mode: 'onSubmit'
    })

    const password = watch('password')

    const onSubmit = async (data: FormFields) => {
        try {
            const emailStatus = await UserService.validateEmail({ email: data.email })
            if (emailStatus !== 200) {
                setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
                return
            }

            let recaptchaToken = ''
            if (reCaptchaLoaded) {
                recaptchaToken = await generateReCaptchaToken()
                if (!(await helper.verifyReCaptcha(recaptchaToken))) {
                    recaptchaToken = ''
                }
            }

            if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
                setRecaptchaError(true)
                return
            }

            const payload: bookcarsTypes.SignUpPayload = {
                email: data.email,
                phone: data.phone,
                password: data.password,
                fullName: data.fullName,
                birthDate: data.birthDate,
                language: UserService.getLanguage()
            }

            const status = await UserService.signup(payload)

            if (status === 200) {
                const signInResult = await UserService.signin({
                    email: data.email,
                    password: data.password,
                })

                if (signInResult.status === 200) {
                    const user = await UserService.getUser(signInResult.data._id)
                    setUser(user)
                    setUserLoaded(true)
                    navigate(`/${window.location.search}`)
                }
            }
        } catch (err) {
            console.error(err)
            setError('root', { message: strings.SIGN_UP_ERROR })
        }
    }

    // Auto-load when component mounts
    React.useEffect(() => {
        const currentUser = UserService.getCurrentUser()
        if (currentUser) {
            navigate('/')
        } else {
            setLanguage(UserService.getLanguage())
            setVisible(true)
        }
    }, [navigate])

    if (!visible) {
        return null
    }

    return (
        <main className="signup-page">
            <div className="signup-page-container">
                <div className="signup-page-card">
                    <h1 className="signup-page-title">{strings.SIGN_UP_HEADING}</h1>
                    <p className="signup-page-subtitle">Join Tokyo Drive and start your premium rental experience</p>

                    <form onSubmit={handleSubmit(onSubmit)} className="signup-page-form">
                        {/* Social Login */}
                        <div className="signup-page-social">
                            <SocialLogin redirectToHomepage />
                        </div>

                        {/* Divider */}
                        <div className="signup-page-divider">
                            <hr />
                            <span>or</span>
                            <hr />
                        </div>

                        {/* Full Name */}
                        <div className="signup-page-field">
                            <label className="signup-page-label">
                                {commonStrings.FULL_NAME} <span className="signup-page-required">*</span>
                            </label>
                            <input
                                type="text"
                                {...register('fullName')}
                                className={`signup-page-input ${errors.fullName ? 'signup-page-input-error' : ''}`}
                                placeholder="John Doe"
                                autoComplete="off"
                                required
                            />
                            {errors.fullName && (
                                <span className="signup-page-error">{errors.fullName.message}</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="signup-page-field">
                            <label className="signup-page-label">
                                {commonStrings.EMAIL} <span className="signup-page-required">*</span>
                            </label>
                            <input
                                type="email"
                                {...register('email', {
                                    onChange: () => {
                                        if (errors.email) {
                                            clearErrors('email')
                                        }
                                    }
                                })}
                                className={`signup-page-input ${errors.email ? 'signup-page-input-error' : ''}`}
                                placeholder="your@email.com"
                                autoComplete="off"
                                required
                            />
                            {errors.email && (
                                <span className="signup-page-error">{errors.email.message}</span>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="signup-page-field">
                            <label className="signup-page-label">
                                {commonStrings.PHONE} <span className="signup-page-required">*</span>
                            </label>
                            <input
                                type="tel"
                                {...register('phone', {
                                    onChange: () => {
                                        if (errors.phone) {
                                            clearErrors('phone')
                                        }
                                    }
                                })}
                                className={`signup-page-input ${errors.phone ? 'signup-page-input-error' : ''}`}
                                placeholder="+1234567890"
                                autoComplete="off"
                                required
                            />
                            {errors.phone && (
                                <span className="signup-page-error">{errors.phone.message}</span>
                            )}
                        </div>

                        {/* Birth Date */}
                        <div className="signup-page-field">
                            <label className="signup-page-label">
                                {commonStrings.BIRTH_DATE} <span className="signup-page-required">*</span>
                            </label>
                            <div className="signup-page-datepicker-wrapper">
                                <DatePicker
                                    label=""
                                    variant="outlined"
                                    required
                                    onChange={(birthDate) => {
                                        if (birthDate) {
                                            if (errors.birthDate) {
                                                clearErrors('birthDate')
                                            }
                                            setValue('birthDate', birthDate, { shouldValidate: true })
                                        }
                                    }}
                                    language={language}
                                />
                            </div>
                            {errors.birthDate && (
                                <span className="signup-page-error">{errors.birthDate.message}</span>
                            )}
                        </div>

                        {/* Password */}
                        <div className="signup-page-field">
                            <div className="signup-page-password-wrapper">
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
                                    inputProps={{
                                        autoComplete: 'new-password',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="signup-page-field">
                            <div className="signup-page-password-wrapper">
                                <PasswordInput
                                    label={commonStrings.CONFIRM_PASSWORD}
                                    variant="outlined"
                                    {...register('confirmPassword')}
                                    error={!!errors.confirmPassword}
                                    helperText={errors.confirmPassword?.message}
                                    onChange={(e) => {
                                        if (errors.confirmPassword) {
                                            clearErrors('confirmPassword')
                                        }
                                        setValue('confirmPassword', e.target.value)
                                    }}
                                    required
                                    inputProps={{
                                        autoComplete: 'new-password',
                                        form: {
                                            autoComplete: 'off',
                                        },
                                    }}
                                />
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="signup-page-field">
                            <label className="signup-page-checkbox-label">
                                <input
                                    type="checkbox"
                                    {...register('tos')}
                                    className="signup-page-checkbox"
                                    onChange={() => {
                                        if (errors.tos) {
                                            clearErrors('tos')
                                        }
                                    }}
                                    required
                                />
                                <span className="signup-page-checkbox-text">
                                    I agree to the{' '}
                                    <Link to="/tos" className="signup-page-link">
                                        Terms & Conditions
                                    </Link>{' '}
                                    and{' '}
                                    <Link to="/privacy" className="signup-page-link">
                                        Privacy Policy
                                    </Link>
                                </span>
                            </label>
                            {errors.tos && (
                                <span className="signup-page-error">{errors.tos.message}</span>
                            )}
                        </div>

                        {/* Form Errors */}
                        <div className="signup-page-form-errors">
                            {errors.root && <Error message={errors.root.message!} />}
                            {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
                        </div>

                        {/* Submit Button */}
                        <div className="signup-page-buttons">
                            <button
                                type="submit"
                                className="signup-page-button signup-page-button-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? commonStrings.PLEASE_WAIT : strings.SIGN_UP}
                            </button>
                            <button
                                type="button"
                                className="signup-page-button signup-page-button-secondary"
                                onClick={() => navigate('/')}
                            >
                                {commonStrings.CANCEL}
                            </button>
                        </div>
                    </form>

                    {/* Sign In Link */}
                    <div className="signup-page-footer">
                        <p className="signup-page-footer-text">Already have an account?</p>
                        <Link to="/sign-in" className="signup-page-footer-link">
                            Sign in here
                        </Link>
                    </div>
                </div>
            </div>

            {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
        </main>
    )
}

export default SignUp


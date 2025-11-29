import React, { useState, useEffect, useCallback } from 'react'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/contact-form'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ContactForm'
import Backdrop from '@/components/SimpleBackdrop'
import '@/v2/assets/css/contact.css'

const Contact = () => {
    const { user } = useUserContext() as UserContextType
    const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const {
        register,
        setValue,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
        clearErrors,
    } = useForm<FormFields>({
        resolver: zodResolver(schema),
        mode: 'onSubmit',
    })

    const initForm = useCallback((currentUser?: bookcarsTypes.User) => {
        if (currentUser) {
            setIsAuthenticated(true)
            setValue('email', currentUser.email!)
        }
    }, [setValue])

    useEffect(() => {
        initForm(user || undefined)
    }, [initForm, user])

    const onSubmit = async (data: FormFields) => {
        try {
            let recaptchaToken = ''
            if (reCaptchaLoaded) {
                recaptchaToken = await generateReCaptchaToken()
                if (!(await helper.verifyReCaptcha(recaptchaToken))) {
                    recaptchaToken = ''
                }
            }

            if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
                helper.error('reCAPTCHA error')
                return
            }

            const payload: bookcarsTypes.SendEmailPayload = {
                from: data.email,
                to: env.CONTACT_EMAIL,
                subject: data.subject,
                message: data.message,
                isContactForm: true,
            }
            const status = await UserService.sendEmail(payload)

            if (status === 200) {
                reset()
                initForm(user || undefined)
                helper.info(strings.MESSAGE_SENT)
            } else {
                helper.error()
            }
        } catch (err) {
            helper.error(err)
        }
    }

    return (
        <main className="contact-page">
            <div className="contact-page-container">
                {/* Header */}
                <div className="contact-page-header">
                    <h1 className="contact-page-title">{strings.CONTACT_HEADING}</h1>
                    <p className="contact-page-subtitle">We&apos;d love to hear from you. Get in touch with our team.</p>
                </div>

                {/* Contact Grid */}
                <div className="contact-page-grid">
                    <div className="contact-page-card">
                        <Phone className="contact-page-icon" size={32} />
                        <h3 className="contact-page-card-title">Phone</h3>
                        <p className="contact-page-card-text">
                            <a href="tel:+81312345678" className="contact-page-link">
                                +81 (0)3-1234-5678
                            </a>
                        </p>
                        <p className="contact-page-card-subtext">Available 7 days a week</p>
                    </div>

                    <div className="contact-page-card">
                        <Mail className="contact-page-icon" size={32} />
                        <h3 className="contact-page-card-title">Email</h3>
                        <p className="contact-page-card-text">
                            <a href={`mailto:${env.CONTACT_EMAIL}`} className="contact-page-link">
                                {env.CONTACT_EMAIL}
                            </a>
                        </p>
                        <p className="contact-page-card-subtext">Response within 24 hours</p>
                    </div>

                    <div className="contact-page-card">
                        <MapPin className="contact-page-icon" size={32} />
                        <h3 className="contact-page-card-title">Office</h3>
                        <p className="contact-page-card-text">Shibuya-ku, Tokyo</p>
                        <p className="contact-page-card-subtext">Japan</p>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="contact-page-form-grid">
                    <div>
                        <h2 className="contact-page-form-title">Send us a Message</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="contact-page-form">
                            {!isAuthenticated && (
                                <div className="contact-page-field">
                                    <label className="contact-page-label">
                                        {commonStrings.EMAIL}
                                        <span className="contact-page-required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        {...register('email')}
                                        className={`contact-page-input ${errors.email ? 'contact-page-input-error' : ''}`}
                                        placeholder="your@email.com"
                                        required
                                        autoComplete="off"
                                        onChange={() => {
                                            if (errors.email) {
                                                clearErrors('email')
                                            }
                                        }}
                                    />
                                    {errors.email && (
                                        <span className="contact-page-error">{errors.email.message}</span>
                                    )}
                                </div>
                            )}

                            <div className="contact-page-field">
                                <label className="contact-page-label">
                                    {strings.SUBJECT}
                                    <span className="contact-page-required">*</span>
                                </label>
                                <input
                                    type="text"
                                    {...register('subject')}
                                    className="contact-page-input"
                                    placeholder="How can we help?"
                                    required
                                    autoComplete="off"
                                />
                            </div>

                            <div className="contact-page-field">
                                <label className="contact-page-label">
                                    {strings.MESSAGE}
                                    <span className="contact-page-required">*</span>
                                </label>
                                <textarea
                                    {...register('message')}
                                    rows={5}
                                    className="contact-page-textarea"
                                    placeholder="Your message"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="contact-page-submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? commonStrings.PLEASE_WAIT : strings.SEND}
                            </button>
                        </form>
                    </div>

                    <div>
                        <h2 className="contact-page-form-title">Business Hours</h2>
                        <div className="contact-page-hours-card">
                            <div className="contact-page-hours-item">
                                <Clock className="contact-page-hours-icon" size={24} />
                                <div>
                                    <p className="contact-page-hours-day">Monday - Friday</p>
                                    <p className="contact-page-hours-time">8:00 AM - 8:00 PM</p>
                                </div>
                            </div>
                            <div className="contact-page-hours-divider">
                                <p className="contact-page-hours-day">Saturday - Sunday</p>
                                <p className="contact-page-hours-time">9:00 AM - 7:00 PM</p>
                            </div>
                        </div>

                        <div className="contact-page-emergency-card">
                            <h3 className="contact-page-emergency-title">Need immediate assistance?</h3>
                            <p className="contact-page-emergency-text">
                                Our 24/7 roadside assistance team is always ready to help. Call our emergency hotline.
                            </p>
                            <a href="tel:+81312345678" className="contact-page-emergency-button">
                                Emergency Support
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
        </main>
    )
}

export default Contact


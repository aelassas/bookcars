import React, { useState } from 'react'
import * as UserService from '../services/UserService'
import Master from '../components/Master'
import { strings as commonStrings } from '../lang/common'
import { strings as cpStrings } from '../lang/change-password'
import { strings as rpStrings } from '../lang/reset-password'
import Error from './Error'
import NoMatch from './NoMatch'
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material'
import * as Helper from '../common/Helper'
import { useNavigate } from 'react-router-dom'

import '../assets/css/reset-password.css'

const ResetPassword = () => {
    const navigate = useNavigate()
    const [userId, setUserId] = useState()
    const [email, setEmail] = useState()
    const [token, setToken] = useState()
    const [visible, setVisible] = useState(false)
    const [error, setError] = useState(false)
    const [noMatch, setNoMatch] = useState(false)
    const [password, setPassword] = useState('')
    const [passwordError, setPasswordError] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState('')
    const [confirmPasswordError, setConfirmPasswordError] = useState(false)
    const [passwordLengthError, setPasswordLengthError] = useState(false)

    const handleNewPasswordChange = (e) => {
        setPassword(e.target.value)
    }

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value)
    }

    const handleOnConfirmPasswordKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e)
        }
    }

    const handleSubmit = async (e) => {
        try {
            e.preventDefault()

            if (password.length < 6) {
                setPasswordLengthError(true)
                setConfirmPasswordError(false)
                setPasswordError(false)
                return
            } else {
                setPasswordLengthError(false)
                setPasswordError(false)
            }

            if (password !== confirmPassword) {
                setConfirmPasswordError(true)
                setPasswordError(false)
                return
            } else {
                setConfirmPasswordError(false)
                setPasswordError(false)
            }

            const data = { userId, token, password }

            const status = await UserService.activate(data)

            if (status === 200) {
                const signInResult = await UserService.signin({ email, password })

                if (signInResult.status === 200) {
                    const status = await UserService.deleteTokens(userId)

                    if (status === 200) {
                        navigate('/')
                    } else {
                        Helper.error()
                    }
                } else {
                    Helper.error()
                }
            } else {
                Helper.error()
            }
        } catch (err) {
            Helper.error(err)
        }
    }

    const onLoad = async (user) => {
        if (user) {
            setNoMatch(true)
        } else {
            const params = new URLSearchParams(window.location.search)
            if (params.has('u') && params.has('e') && params.has('t')) {
                const userId = params.get('u')
                const email = params.get('e')
                const token = params.get('t')
                if (userId && email && token) {
                    try {
                        const status = await UserService.checkToken(userId, email, token)

                        if (status === 200) {
                            setUserId(userId)
                            setEmail(email)
                            setToken(token)
                            setVisible(true)
                        } else {
                            setNoMatch(true)
                        }
                    } catch {
                        setError(true)
                    }
                } else {
                    setNoMatch(true)
                }
            } else {
                setNoMatch(true)
            }
        }
    }

    return (
        <Master onLoad={onLoad} strict={false}>
            {visible &&
                <div className="reset-password">
                    <Paper className="reset-password-form" elevation={10}>
                        <h1>{rpStrings.RESET_PASSWORD_HEADING}</h1>
                        <form onSubmit={handleSubmit}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required' error={passwordError}>
                                    {cpStrings.NEW_PASSWORD}
                                </InputLabel>
                                <Input
                                    id="password-new"
                                    onChange={handleNewPasswordChange}
                                    type='password'
                                    value={password}
                                    error={passwordError}
                                    required
                                />
                                <FormHelperText
                                    error={passwordError}
                                >
                                    {(passwordError && cpStrings.NEW_PASSWORD_ERROR) || ''}
                                </FormHelperText>
                            </FormControl>
                            <FormControl fullWidth margin="dense" error={confirmPasswordError}>
                                <InputLabel error={confirmPasswordError} className='required'>
                                    {commonStrings.CONFIRM_PASSWORD}
                                </InputLabel>
                                <Input
                                    id="password-confirm"
                                    onChange={handleConfirmPasswordChange}
                                    onKeyDown={handleOnConfirmPasswordKeyDown}
                                    error={confirmPasswordError || passwordLengthError}
                                    type='password'
                                    value={confirmPassword}
                                    required
                                />
                                <FormHelperText
                                    error={confirmPasswordError || passwordLengthError}
                                >
                                    {confirmPasswordError
                                        ? commonStrings.PASSWORDS_DONT_MATCH
                                        : (passwordLengthError ? commonStrings.PASSWORD_ERROR : '')}
                                </FormHelperText>
                            </FormControl>
                            <div className='buttons'>
                                <Button
                                    type="submit"
                                    className='btn-primary btn-margin btn-margin-bottom'
                                    size="small"
                                    variant='contained'
                                >
                                    {commonStrings.UPDATE}
                                </Button>
                                <Button
                                    className='btn-secondary btn-margin-bottom'
                                    size="small"
                                    variant='contained'
                                    href="/"
                                >
                                    {commonStrings.CANCEL}
                                </Button>
                            </div>
                        </form>
                    </Paper>
                </div>
            }
            {error && <Error />}
            {noMatch && <NoMatch hideHeader />}
        </Master>
    )
}

export default ResetPassword
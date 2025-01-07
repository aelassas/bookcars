import React, { useState } from 'react'
import {
  Paper,
  FormControl,
  InputLabel,
  Input,
  Button,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as suStrings } from '@/lang/sign-up'
import { strings } from '@/lang/sign-in'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import Error from '@/components/Error'
import Layout from '@/components/Layout'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'

import '@/assets/css/signin.css'

const SignIn = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [blacklisted, setBlacklisted] = useState(false)

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLElement>) => {
    try {
      e.preventDefault()

      const data: bookcarsTypes.SignInPayload = {
        email,
        password,
        stayConnected: UserService.getStayConnected()
      }

      const res = await UserService.signin(data)

      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout(false)
          setError(false)
          setBlacklisted(true)
        } else {
          setError(false)

          const user = await UserService.getUser(res.data._id)
          setUser(user)
          setUserLoaded(true)
        }
      } else {
        setError(true)
        setBlacklisted(false)
      }
    } catch {
      setError(true)
      setBlacklisted(false)
    }
  }

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    UserService.setStayConnected(false)

    if (user) {
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
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      {visible && (
        <>
          <div className="signin">
            <Paper className="signin-form" elevation={10}>
              <form onSubmit={handleSubmit}>
                <h1 className="signin-form-title">{strings.SIGN_IN_HEADING}</h1>
                <FormControl fullWidth margin="dense">
                  <InputLabel>{commonStrings.EMAIL}</InputLabel>
                  <Input type="text" onChange={handleEmailChange} autoComplete="email" required />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel>{commonStrings.PASSWORD}</InputLabel>
                  <Input onChange={handlePasswordChange} onKeyDown={handlePasswordKeyDown} autoComplete="password" type="password" required />
                </FormControl>

                <div className="stay-connected">
                  <input
                    id="stay-connected"
                    type="checkbox"
                    onChange={(e) => {
                      UserService.setStayConnected(e.currentTarget.checked)
                    }}
                  />
                  <label
                    htmlFor="stay-connected"
                  >
                    {strings.STAY_CONNECTED}
                  </label>
                </div>

                <div className="forgot-password-wrapper">
                  <Button variant="text" onClick={() => navigate('/forgot-password')} className="btn-lnk">{strings.RESET_PASSWORD}</Button>
                </div>

                <SocialLogin redirectToHomepage />

                <div className="signin-buttons">
                  <Button variant="outlined" color="primary" onClick={() => navigate('/sign-up')} className="btn-margin btn-margin-bottom">
                    {suStrings.SIGN_UP}
                  </Button>
                  <Button type="submit" variant="contained" className="btn-primary btn-margin btn-margin-bottom" disableElevation>
                    {strings.SIGN_IN}
                  </Button>
                </div>
                <div className="form-error">
                  {error && <Error message={strings.ERROR_IN_SIGN_IN} />}
                  {blacklisted && <Error message={strings.IS_BLACKLISTED} />}
                </div>
              </form>
            </Paper>
          </div>

          <Footer />
        </>
      )}
    </Layout>
  )
}

export default SignIn

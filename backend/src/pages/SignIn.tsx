import React, { useState, useEffect } from 'react'
import {
  Paper,
  FormControl,
  InputLabel,
  Input,
  Button,
  Link
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-in'
import * as UserService from '@/services/UserService'
import Header from '@/components/Header'
import Error from '@/components/Error'
import * as langHelper from '@/common/langHelper'
import { useUserContext, UserContextType } from '@/context/UserContext'

import '@/assets/css/signin.css'

const SignIn = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [blacklisted, setBlacklisted] = useState(false)
  const [stayConnected, setStayConnected] = useState(false)

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
        stayConnected,
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

          const params = new URLSearchParams(window.location.search)

          if (params.has('u')) {
            navigate(`/user${window.location.search}`)
          } else if (params.has('c')) {
            navigate(`/supplier${window.location.search}`)
          } else if (params.has('cr')) {
            navigate(`/car${window.location.search}`)
          } else if (params.has('b')) {
            navigate(`/update-booking${window.location.search}`)
          } else {
            navigate('/')
          }
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

  useEffect(() => {
    const init = async () => {
      try {
        langHelper.setLanguage(strings)

        const currentUser = UserService.getCurrentUser()

        if (currentUser) {
          const status = await UserService.validateAccessToken()

          if (status === 200) {
            const user = await UserService.getUser(currentUser._id)

            if (user) {
              navigate(`/${window.location.search}`)
            } else {
              await UserService.signout()
            }
          }
        } else {
          setVisible(true)
        }
      } catch {
        await UserService.signout()
      }
    }

    init()
  }, [navigate])

  return (
    <div>
      <Header />
      {visible && (
        <div className="signin">
          <Paper className="signin-form" elevation={10}>
            <form onSubmit={handleSubmit}>
              <h1 className="signin-form-title">{strings.SIGN_IN_HEADING}</h1>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                <Input id="email" type="text" name="Email" onChange={handleEmailChange} autoComplete="email" required />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="password">{commonStrings.PASSWORD}</InputLabel>
                <Input id="password" name="Password" onChange={handlePasswordChange} onKeyDown={handlePasswordKeyDown} autoComplete="password" type="password" required />
              </FormControl>

              <div className="stay-connected">
                <input
                  id="stay-connected"
                  type="checkbox"
                  onChange={(e) => {
                    setStayConnected(e.currentTarget.checked)
                  }}
                />
                <label
                  htmlFor="stay-connected"
                >
                  {strings.STAY_CONNECTED}
                </label>
              </div>

              <div className="forgot-password">
                <Link href="/forgot-password">{strings.RESET_PASSWORD}</Link>
              </div>

              <div className="signin-buttons">
                <Button type="submit" variant="contained" size="small" className="btn-primary">
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
      )}
    </div>
  )
}

export default SignIn

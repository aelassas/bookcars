import React, { useEffect, useState } from 'react'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/sign-in'
import * as UserService from '../services/UserService'
import Header from '../components/Header'
import Error from '../components/Error'
import { Paper, FormControl, InputLabel, Input, Button, Link } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import * as LangHelper from '../common/LangHelper'

import '../assets/css/signin.css'

const SignIn = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [blacklisted, setBlacklisted] = useState(false)
  const [stayConnected, setStayConnected] = useState(false)

  const handleOnChangeEmail = (e) => {
    setEmail(e.target.value)
  }

  const handleOnChangePassword = (e) => {
    setPassword(e.target.value)
  }

  const handleOnPasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e) => {
    try {
      e.preventDefault()

      const data = { email, password, stayConnected }

      const res = await UserService.signin(data)
      if (res.status === 200) {
        if (res.data.blacklisted) {
          UserService.signout(false)
          setError(false)
          setBlacklisted(true)
        } else {
          setError(false)

          const params = new URLSearchParams(window.location.search)
          if (params.has('from')) {
            const from = params.get('from')
            if (from === 'checkout') {
              navigate(`/checkout${window.location.search}`)
            } else {
              navigate('/')
            }
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

  useEffect(() => {
    ;(async function () {
      try {
        LangHelper.setLanguage(strings)

        const currentUser = UserService.getCurrentUser()

        if (currentUser) {
          const status = await UserService.validateAccessToken()

          if (status === 200) {
            const user = await UserService.getUser(currentUser.id)

            if (user) {
              const params = new URLSearchParams(window.location.search)
              if (params.has('from')) {
                const from = params.get('from')
                if (from === 'checkout') {
                  navigate(`/checkout${window.location.search}`)
                } else {
                  navigate(`/${window.location.search}`)
                }
              } else {
                navigate(`/${window.location.search}`)
              }
            } else {
              UserService.signout()
            }
          }
        } else {
          setVisible(true)
        }
      } catch {
        UserService.signout()
      }
    })()
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
                <InputLabel>{commonStrings.EMAIL}</InputLabel>
                <Input type="text" onChange={handleOnChangeEmail} autoComplete="email" required />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PASSWORD}</InputLabel>
                <Input onChange={handleOnChangePassword} onKeyDown={handleOnPasswordKeyDown} autoComplete="password" type="password" required />
              </FormControl>

              <div className="stay-connected">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    setStayConnected(e.currentTarget.checked)
                  }}
                />
                <label
                  onClick={(e) => {
                    const checkbox = e.currentTarget.previousSibling
                    const checked = !checkbox.checked
                    checkbox.checked = checked
                    setStayConnected(checked)
                  }}
                >
                  {strings.STAY_CONNECTED}
                </label>
              </div>

              <div className="forgot-password">
                <Link href="/forgot-password">{strings.RESET_PASSWORD}</Link>
              </div>

              <div className="signin-buttons">
                <Button variant="contained" size="small" href="/sign-up" className="btn-secondary btn-margin btn-margin-bottom">
                  {strings.SIGN_UP}
                </Button>
                <Button type="submit" variant="contained" size="small" className="btn-primary btn-margin btn-margin-bottom">
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

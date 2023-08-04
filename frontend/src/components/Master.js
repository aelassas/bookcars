import React, { useState, useEffect } from 'react'
import { strings } from '../lang/master'
import Header from '../components/Header'
import * as UserService from '../services/UserService'
import { Button } from '@mui/material'
import * as Helper from '../common/Helper'
import { useInit } from '../common/customHooks'

const Master = (props) => {
  const [user, setUser] = useState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (props.user && user && user.avatar !== props.user.avatar) {
      setUser(props.user)
    }
  }, [props.user, user])

  useInit(async () => {
    const exit = () => {
      if (props.strict) {
        UserService.signout(false, true)
      } else {
        setLoading(false)

        UserService.signout(false, false)

        if (props.onLoad) {
          props.onLoad()
        }
      }
    }

    const currentUser = UserService.getCurrentUser()

    if (currentUser) {
      try {
        const status = await UserService.validateAccessToken()

        if (status === 200) {
          const user = await UserService.getUser(currentUser.id)

          if (user) {
            if (user.blacklisted) {
              exit()
              return
            }

            setUser(user)
            setLoading(false)

            if (props.onLoad) {
              props.onLoad(user)
            }
          } else {
            exit()
          }
        } else {
          exit()
        }
      } catch {
        exit()
      }
    } else {
      exit()
    }
  }, [])

  const handleResend = async (e) => {
    e.preventDefault()

    try {
      const data = { email: user.email }

      const status = await UserService.resendLink(data)
      if (status === 200) {
        Helper.info(strings.VALIDATION_EMAIL_SENT)
      } else {
        Helper.error(null, strings.VALIDATION_EMAIL_ERROR)
      }
    } catch (err) {
      Helper.error(err, strings.VALIDATION_EMAIL_ERROR)
    }
  }

  return (
    <>
      <Header user={user} hidden={loading} hideSignin={props.hideSignin} notificationCount={props.notificationCount} />
      {(!user && !loading) || (user && user.verified) ? (
        <div className="content">{props.children}</div>
      ) : (
        !loading && (
          <div className="validate-email">
            <span>{strings.VALIDATE_EMAIL}</span>
            <Button type="button" variant="contained" size="small" className="btn-primary btn-resend" onClick={handleResend}>
              {strings.RESEND}
            </Button>
          </div>
        )
      )}
    </>
  )
}

export default Master

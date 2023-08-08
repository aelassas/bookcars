import React, { useState, useEffect } from 'react'
import { strings } from '../lang/master'
import Header from './Header'
import * as UserService from '../services/UserService'
import Unauthorized from '../components/Unauthorized'
import { Button } from '@mui/material'
import Env from '../config/env.config'
import * as Helper from '../common/Helper'
import { useInit } from '../common/customHooks'

const Master = (props) => {
  const [user, setUser] = useState()
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    if (props.user && user && user.avatar !== props.user.avatar) {
      setUser(props.user)
    }
  }, [props.user, user])

  useInit(async () => {
    const exit = () => {
      if (props.strict) {
        UserService.signout()
      } else {
        UserService.signout(false)
        setLoading(false)

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
              setUser(user)
              setUnauthorized(true)
              setLoading(false)
              return
            }

            if (props.admin && user.type !== Env.RECORD_TYPE.ADMIN) {
              setUser(user)
              setUnauthorized(true)
              setLoading(false)
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
  })

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
      <Header user={user} hidden={props.hideHeader || loading} notificationCount={props.notificationCount} />
      {((!user && !loading) || (user && user.verified) || !props.strict) && !unauthorized ? (
        <div className="content" style={props.style}>
          {props.children}
        </div>
      ) : (
        !loading &&
        !unauthorized && (
          <div className="validate-email">
            <span>{strings.VALIDATE_EMAIL}</span>
            <Button type="button" variant="contained" size="small" className="btn-primary btn-resend" onClick={handleResend}>
              {strings.RESEND}
            </Button>
          </div>
        )
      )}
      {unauthorized && <Unauthorized style={{ marginTop: '75px' }} />}
    </>
  )
}

export default Master

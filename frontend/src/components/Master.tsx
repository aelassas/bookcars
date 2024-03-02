import React, { useState, useEffect, ReactNode } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'
import { strings } from '../lang/master'
import Header from '../components/Header'
import * as UserService from '../services/UserService'
import * as helper from '../common/helper'
import { useInit } from '../common/customHooks'

interface MasterProps {
  user?: bookcarsTypes.User
  strict?: boolean
  hideSignin?: boolean
  notificationCount?: number
  children: ReactNode
  onLoad?: (user?: bookcarsTypes.User) => void
}

const Master = ({
  user: masterUser,
  strict,
  hideSignin,
  notificationCount,
  children,
  onLoad
}: MasterProps) => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (masterUser && user && user.avatar !== masterUser.avatar) {
      setUser(masterUser)
    }
  }, [masterUser, user])

  useInit(async () => {
    const exit = async () => {
      if (strict) {
        await UserService.signout(false, true)
      } else {
        setLoading(false)

        await UserService.signout(false, false)

        if (onLoad) {
          onLoad()
        }
      }
    }

    const currentUser = UserService.getCurrentUser()

    if (currentUser) {
      try {
        const status = await UserService.validateAccessToken()

        if (status === 200) {
          const _user = await UserService.getUser(currentUser._id)

          if (_user) {
            if (_user.blacklisted) {
              await exit()
              return
            }

            setUser(_user)
            setLoading(false)

            if (onLoad) {
              onLoad(_user)
            }
          } else {
            await exit()
          }
        } else {
          await exit()
        }
      } catch {
        await exit()
      }
    } else {
      await exit()
    }
  }, [])

  const handleResend = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()

    try {
      if (user) {
        const data = { email: user.email }

        const status = await UserService.resendLink(data)
        if (status === 200) {
          helper.info(strings.VALIDATION_EMAIL_SENT)
        } else {
          helper.error(null, strings.VALIDATION_EMAIL_ERROR)
        }
      }
    } catch (err) {
      helper.error(err, strings.VALIDATION_EMAIL_ERROR)
    }
  }

  return (
    <>
      <Header user={user} hidden={loading} hideSignin={hideSignin} notificationCount={notificationCount} />
      {(!user && !loading) || (user && user.verified) ? (
        <div className="content">{children}</div>
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

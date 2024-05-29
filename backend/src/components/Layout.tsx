import React, { useState, useEffect, CSSProperties, ReactNode } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '../lang/master'
import Header from './Header'
import * as UserService from '../services/UserService'
import Unauthorized from './Unauthorized'
import * as helper from '../common/helper'
import { useInit } from '../common/customHooks'

interface LayoutProps {
  user?: bookcarsTypes.User
  strict?: boolean
  admin?: boolean
  hideHeader?: boolean
  style?: CSSProperties
  children: ReactNode
  onLoad?: (user?: bookcarsTypes.User) => void
}

const Layout = ({
  user: masterUser,
  strict,
  admin,
  hideHeader,
  style,
  children,
  onLoad
}: LayoutProps) => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    if (masterUser && user && user.avatar !== masterUser.avatar) {
      setUser(masterUser)
    }
  }, [masterUser, user])

  useInit(async () => {
    const exit = async () => {
      if (strict) {
        await UserService.signout()
      } else {
        await UserService.signout(false)
        setLoading(false)

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
              setUser(_user)
              setUnauthorized(true)
              setLoading(false)
              return
            }

            if (admin && _user.type !== bookcarsTypes.RecordType.Admin) {
              setUser(_user)
              setUnauthorized(true)
              setLoading(false)
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
  })

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
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err, strings.VALIDATION_EMAIL_ERROR)
    }
  }

  return (
    <>
      <Header user={user} hidden={hideHeader || loading} />
      {((!user && !loading) || (user && user.verified) || !strict) && !unauthorized ? (
        <div className="content" style={style || {}}>
          {children}
        </div>
      ) : (
        !loading && !unauthorized && (
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

export default Layout

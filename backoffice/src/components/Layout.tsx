import React, { useState, useEffect, CSSProperties, ReactNode } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/master'
import * as UserService from '@/services/UserService'
import Unauthorized from './Unauthorized'
import * as helper from '@/common/helper'
import { useUserContext, UserContextType } from '@/context/UserContext'

interface LayoutProps {
  strict?: boolean
  admin?: boolean
  style?: CSSProperties
  children: ReactNode
  onLoad?: (user?: bookcarsTypes.User) => void
}

const Layout = ({
  strict,
  admin,
  style,
  children,
  onLoad
}: LayoutProps) => {
  const { user, userLoaded, setUnauthorized, unauthorized } = useUserContext() as UserContextType
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoaded) {
      if (!user && strict) {
        UserService.signout(true)
      } else {
        setLoading(false)

        if (onLoad) {
          onLoad(user || undefined)
        }
      }
    }
  }, [user, userLoaded, strict]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (admin && user && user.type !== bookcarsTypes.RecordType.Admin) {
      setUnauthorized(true)
      setLoading(false)
    }
  }, [user, admin]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {unauthorized && <Unauthorized />}
    </>
  )
}

export default Layout

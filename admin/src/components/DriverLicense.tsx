import React, { useState } from 'react'
import { IconButton, Input, OutlinedInput } from '@mui/material'
import { Upload as UploadIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'

import '@/assets/css/driver-license.css'

interface DriverLicenseProps {
  user?: bookcarsTypes.User
  variant?: 'standard' | 'outlined'
  className?: string
  onUpload?: (filename: string) => void
  onDelete?: () => void
}

const DriverLicense = ({
  user,
  variant = 'standard',
  className,
  onUpload,
  onDelete,
}: DriverLicenseProps) => {
  const [license, setLicense] = useState(user?.license || null)

  const handleClick = async () => {
    const upload = document.getElementById('upload-license') as HTMLInputElement
    upload.value = ''
    setTimeout(() => {
      upload.click()
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      helper.error()
      return
    }

    const reader = new FileReader()
    const file = e.target.files[0]

    reader.onloadend = async () => {
      try {
        let filename: string | null = null
        if (user) {
          // upload new file
          const res = await UserService.updateLicense(user._id!, file)
          if (res.status === 200) {
            filename = res.data
          } else {
            helper.error()
          }
        } else {
          // Remove previous temp file
          if (license) {
            await UserService.deleteTempLicense(license)
          }
          // upload new file
          filename = await UserService.createLicense(file)
        }

        if (filename) {
          if (onUpload) {
            onUpload(filename)
          }
        }

        setLicense(filename)
      } catch (err) {
        helper.error(err)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className={`driver-license ${className || ''}`}>
      {variant === 'standard' ? (
        <Input
          value={license || commonStrings.UPLOAD_DRIVER_LICENSE}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      ) : (
        <OutlinedInput
          value={license || commonStrings.UPLOAD_DRIVER_LICENSE}
          readOnly
          onClick={handleClick}
          className="filename"
        />
      )}
      <div className="actions">
        <IconButton
          size="small"
          onClick={handleClick}
        >
          <UploadIcon className="icon" />
        </IconButton>

        {license && (
          <>
            <IconButton
              size="small"
              onClick={() => {
                const url = `${bookcarsHelper.trimEnd(user ? env.CDN_LICENSES : env.CDN_TEMP_LICENSES, '/')}/${license}`
                helper.downloadURI(url)
              }}
            >
              <ViewIcon className="icon" />
            </IconButton>
            <IconButton
              size="small"
              onClick={async () => {
                try {
                  let status = 0
                  if (user) {
                    status = await UserService.deleteLicense(user._id!)
                  } else {
                    status = await UserService.deleteTempLicense(license!)
                  }

                  if (status === 200) {
                    setLicense(null)

                    if (onDelete) {
                      onDelete()
                    }
                  } else {
                    helper.error()
                  }
                } catch (err) {
                  helper.error(err)
                }
              }}
            >
              <DeleteIcon className="icon" />
            </IconButton>
          </>
        )}
      </div>
      <input id="upload-license" type="file" hidden onChange={handleChange} />
    </div>
  )
}

export default DriverLicense

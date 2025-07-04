import React, { useEffect, useState } from 'react'
import { IconButton } from '@mui/material'
import { Upload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings } from '@/lang/contract-list'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/contract-list.css'

interface ContractListProps {
  supplier?: bookcarsTypes.User
  onUpload?: (language: string, filename: string) => void
  onDelete?: (language: string) => void
}

interface Language {
  code: string
  label: string
  filename: string | null
}

const ContractList: React.FC<ContractListProps> = ({ supplier, onUpload, onDelete }) => {
  const [languages, setLanguages] = useState<Language[]>([])
  const [language, setLanguage] = useState('')

  useEffect(() => {
    const _languages = []

    for (const lang of env._LANGUAGES) {
      const _lang: Language = {
        code: lang.code,
        label: lang.label,
        filename: supplier?.contracts?.find((c) => c.language === lang.code)?.file || null
      }
      _languages.push(_lang)
    }

    setLanguages(_languages)
  }, [supplier])

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
        if (supplier) {
          // upload new file
          const res = await SupplierService.updateContract(supplier._id!, language, file)
          if (res.status === 200) {
            filename = res.data
          } else {
            helper.error()
          }
        } else {
          // Remove previous temp file
          const previousFilename = languages!.find((l) => l.code === language)!.filename
          if (previousFilename) {
            await SupplierService.deleteTempContract(previousFilename)
          }
          // upload new file
          filename = await SupplierService.createContract(language, file)
        }

        if (filename) {
          const _languages = bookcarsHelper.cloneArray(languages) as Language[]
          _languages!.find((l) => l.code === language)!.filename = filename
          setLanguages(_languages)

          if (onUpload) {
            onUpload(language, filename)
          }
        }
      } catch (err) {
        helper.error(err)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="contracts">
      <div className="title">{strings.TITLE}</div>
      {languages.map((lang) => (
        <div key={lang.code} className="contract">
          <span className="label">{lang.label}</span>
          <span className="filename">
            {lang.filename ? <a href={`${bookcarsHelper.trimEnd(supplier ? env.CDN_CONTRACTS : env.CDN_TEMP_CONTRACTS, '/')}/${lang.filename}`}>{lang.filename}</a> : '-'}
          </span>
          <div className="actions">
            <IconButton
              size="small"
              onClick={async () => {
                setLanguage(lang.code)
                const upload = document.getElementById('upload-contract') as HTMLInputElement
                upload.value = ''
                setTimeout(() => {
                  upload.click()
                }, 0)
              }}
            >
              <UploadIcon className="upload-icon" />
            </IconButton>

            {lang.filename && (
              <IconButton
                size="small"
                onClick={async () => {
                  try {
                    let status = 0
                    if (supplier) {
                      status = await SupplierService.deleteContract(supplier._id!, lang.code)
                    } else {
                      status = await SupplierService.deleteTempContract(lang.filename!)
                    }

                    if (status === 200) {
                      const _languages = bookcarsHelper.cloneArray(languages) as Language[]
                      _languages!.find((l) => l.code === lang.code)!.filename = null
                      setLanguages(_languages)

                      if (onDelete) {
                        onDelete(lang.code)
                      }
                    } else {
                      helper.error()
                    }
                  } catch (err) {
                    helper.error(err)
                  }
                }}
              >
                <DeleteIcon className="delete-icon" />
              </IconButton>
            )}
          </div>
        </div>
      ))}
      <input id="upload-contract" type="file" hidden onChange={handleChange} />
    </div>
  )
}

export default ContractList

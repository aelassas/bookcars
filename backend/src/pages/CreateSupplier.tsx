import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  FormControlLabel,
  Switch
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import validator from 'validator'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-supplier'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import * as helper from '@/common/helper'
import ContractList from '@/components/ContractList'
import { UserContextType, useUserContext } from '@/context/UserContext'

import '@/assets/css/create-supplier.css'

const CreateSupplier = () => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullNameError, setFullNameError] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [phoneValid, setPhoneValid] = useState(true)
  const [payLater, setPayLater] = useState(false)
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [contracts, setContracts] = useState<bookcarsTypes.Contract[]>([])
  const [minimumRentalDays, setMinimumRentalDays] = useState('')
  const [priceChangeRate, setPriceChangeRate] = useState('')
  const [supplierCarLimit, setSupplierCarLimit] = useState('')
  const [notifyAdminOnNewCar, setNotifyAdminOnNewCar] = useState(false)

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)

    if (!e.target.value) {
      setFullNameError(false)
    }
  }

  const validateFullName = async (_fullName: string) => {
    if (_fullName) {
      try {
        const status = await SupplierService.validate({ fullName: _fullName })

        if (status === 200) {
          setFullNameError(false)
          return true
        }
        setFullNameError(true)
        return false
      } catch (err) {
        helper.error(err)
        return true
      }
    } else {
      setFullNameError(false)
      return false
    }
  }

  const handleFullNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateFullName(e.target.value)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    if (!e.target.value) {
      setEmailError(false)
      setEmailValid(true)
    }
  }

  const validateEmail = async (_email?: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        try {
          const status = await UserService.validateEmail({ email: _email })

          if (status === 200) {
            setEmailError(false)
            setEmailValid(true)
            return true
          }
          setEmailError(true)
          setEmailValid(true)
          return false
        } catch (err) {
          helper.error(err)
          return true
        }
      } else {
        setEmailError(false)
        setEmailValid(false)
        return false
      }
    } else {
      setEmailError(false)
      setEmailValid(true)
      return false
    }
  }

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateEmail(e.target.value)
  }

  const handleSupplierCarLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSupplierCarLimit(e.target.value)
  }

  const handleMinimumRentalDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinimumRentalDays(e.target.value)
  }

  const handlePriceChangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceChangeRate(e.target.value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)

    if (!e.target.value) {
      setPhoneValid(true)
    }
  }

  const validatePhone = (_phone?: string) => {
    if (_phone) {
      const _phoneValid = validator.isMobilePhone(_phone)
      setPhoneValid(_phoneValid)

      return _phoneValid
    }
    setPhoneValid(true)

    return true
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validatePhone(e.target.value)
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value)
  }

  const handleBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value)
  }

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (_avatar: string) => {
    setLoading(false)
    setAvatar(_avatar)

    if (_avatar !== null) {
      setAvatarError(false)
    }
  }

  const handleCancel = async () => {
    try {
      if (avatar) {
        await UserService.deleteTempAvatar(avatar)
      }

      for (const contract of contracts) {
        if (contract.file) {
          await SupplierService.deleteTempContract(contract.file)
        }
      }

      navigate('/suppliers')
    } catch {
      navigate('/suppliers')
    }
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setVisible(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      const _emailValid = await validateEmail(email)
      if (!_emailValid) {
        return
      }

      const fullNameValid = await validateFullName(fullName)
      if (!fullNameValid) {
        return
      }

      const _phoneValid = validatePhone(phone)
      if (!_phoneValid) {
        return
      }

      if (!avatar) {
        setAvatarError(true)
        setError(false)
        return
      }

      const data: bookcarsTypes.CreateUserPayload = {
        email,
        fullName,
        phone,
        location,
        bio,
        language: UserService.getLanguage(),
        type: bookcarsTypes.RecordType.Supplier,
        avatar,
        payLater,
        licenseRequired,
        contracts,
        minimumRentalDays: minimumRentalDays ? Number(minimumRentalDays) : undefined,
        priceChangeRate: priceChangeRate ? Number(priceChangeRate) : undefined,
        supplierCarLimit: supplierCarLimit ? Number(supplierCarLimit) : undefined,
        notifyAdminOnNewCar,
      }

      const status = await UserService.create(data)

      if (status === 200) {
        navigate('/suppliers')
      } else {
        setError(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict admin>
      <div className="create-supplier">
        <Paper className="supplier-form" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="supplier-form-title">
            {' '}
            {strings.CREATE_SUPPLIER_HEADING}
            {' '}
          </h1>
          <form onSubmit={handleSubmit}>
            <Avatar
              type={bookcarsTypes.RecordType.Supplier}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={onBeforeUpload}
              onChange={onAvatarChange}
              color="disabled"
              className="avatar-ctn"
            />

            <div className="info">
              <InfoIcon />
              <span>{strings.RECOMMENDED_IMAGE_SIZE}</span>
            </div>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
              <Input
                id="full-name"
                type="text"
                error={fullNameError}
                required
                onBlur={handleFullNameBlur}
                onChange={handleFullNameChange}
                autoComplete="off"
              />
              <FormHelperText error={fullNameError}>{(fullNameError && strings.INVALID_SUPPLIER_NAME) || ''}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
              <Input
                id="email"
                type="text"
                error={!emailValid || emailError}
                onBlur={handleEmailBlur}
                onChange={handleEmailChange}
                autoComplete="off"
                required
              />
              <FormHelperText error={!emailValid || emailError}>
                {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                {(emailError && commonStrings.EMAIL_ALREADY_REGISTERED) || ''}
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <FormControlLabel
                control={(
                  <Switch
                    checked={payLater}
                    onChange={(e) => {
                      setPayLater(e.target.checked)
                    }}
                    color="primary"
                  />
                )}
                label={commonStrings.PAY_LATER}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <FormControlLabel
                control={(
                  <Switch
                    checked={licenseRequired}
                    onChange={(e) => {
                      setLicenseRequired(e.target.checked)
                    }}
                    color="primary"
                  />
                )}
                label={commonStrings.LICENSE_REQUIRED}
              />
            </FormControl>

            <div className="info">
              <InfoIcon />
              <span>{commonStrings.OPTIONAL}</span>
            </div>

            <FormControl fullWidth margin="dense">
              <FormControlLabel
                control={(
                  <Switch
                    checked={notifyAdminOnNewCar}
                    disabled={user?.type === bookcarsTypes.UserType.Supplier}
                    onChange={(e) => {
                      setNotifyAdminOnNewCar(e.target.checked)
                    }}
                    color="primary"
                  />
                )}
                label={commonStrings.NOTIFY_ADMIN_ON_NEW_CAR}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.SUPPLIER_CAR_LIMIT}</InputLabel>
              <Input type="text" onChange={handleSupplierCarLimitChange} autoComplete="off" slotProps={{ input: { inputMode: 'numeric', pattern: '^\\d+$' } }} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.MIN_RENTAL_DAYS}</InputLabel>
              <Input type="text" onChange={handleMinimumRentalDaysChange} autoComplete="off" slotProps={{ input: { inputMode: 'numeric', pattern: '^\\d+$' } }} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.PRICE_CHANGE_RATE}</InputLabel>
              <Input type="text" onChange={handlePriceChangeRateChange} autoComplete="off" slotProps={{ input: { inputMode: 'numeric', pattern: '^-?\\d+$' } }} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.PHONE}</InputLabel>
              <Input type="text" onChange={handlePhoneChange} onBlur={handlePhoneBlur} autoComplete="off" error={!phoneValid} />
              <FormHelperText error={!phoneValid}>{(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.LOCATION}</InputLabel>
              <Input type="text" onChange={handleLocationChange} autoComplete="off" />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{commonStrings.BIO}</InputLabel>
              <Input type="text" onChange={handleBioChange} autoComplete="off" />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <ContractList
                onUpload={(language, filename) => {
                  const _contracts = bookcarsHelper.cloneArray(contracts) as bookcarsTypes.Contract[]
                  const contract = _contracts.find((c) => c.language === language)
                  if (contract) {
                    contract.file = filename
                  } else {
                    _contracts.push({ language, file: filename })
                  }
                  setContracts(_contracts)
                }}
                onDelete={(language) => {
                  const _contracts = bookcarsHelper.cloneArray(contracts) as bookcarsTypes.Contract[]
                  _contracts.find((c) => c.language === language)!.file = null
                  setContracts(_contracts)
                }}
              />
            </FormControl>

            <div className="buttons">
              <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                {commonStrings.CREATE}
              </Button>
              <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={handleCancel}>
                {commonStrings.CANCEL}
              </Button>
            </div>

            <div className="form-error">
              {error && <Error message={commonStrings.GENERIC_ERROR} />}
              {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
            </div>
          </form>
        </Paper>
      </div>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateSupplier

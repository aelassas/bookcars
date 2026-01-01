import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import validator from 'validator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { intervalToDuration } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import PageContainer from '@/components/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import DatePickerField from '@/components/DatePickerField'
import CountrySelect from '@/components/CountrySelect'
import Avatar from '@/components/Avatar'
import NoMatch from './NoMatch'

import '@/assets/css/update-user.css'

// Form validation schema
const formSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required' }),
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine((val) => !val || validator.isMobilePhone(val), { message: commonStrings.PHONE_NOT_VALID }).optional(),
  birthDate: z.date().refine((value) => {
    if (value) {
      const sub = intervalToDuration({ start: value, end: new Date() }).years ?? 0
      return sub >= env.MINIMUM_AGE
    }
    return true
  }, { message: commonStrings.BIRTH_DATE_NOT_VALID }),
  licenseId: z.string().optional(),
  country: z.string().min(1, { message: 'Country is required' }),
})

type FormFields = z.infer<typeof formSchema>

const UpdateUser = () => {
  const navigate = useNavigate()
  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(false)
  const [avatar, setAvatar] = useState<string>('')
  const [birthDate, setBirthDate] = useState<Date | undefined>()
  const [selectedCountry, setSelectedCountry] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    clearErrors,
  } = useForm<FormFields>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      licenseId: '',
    },
  })

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser && _loggedUser.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('u')) {
        const id = params.get('u')
        if (id && id !== '') {
          try {
            const _user = await UserService.getUser(id)

            if (_user) {
              if (!(
                _loggedUser.type === bookcarsTypes.UserType.Admin
                || (_user.type === bookcarsTypes.UserType.User && _loggedUser._id === _user.supplier)
              )) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              setLoggedUser(_loggedUser)
              setUser(_user)
              setAvatar(_user.avatar || '')
              setValue('email', _user.email || '')
              setValue('fullName', _user.fullName || '')
              setValue('phone', _user.phone || '')
              setValue('licenseId', _user.license || '')
              
              if (_user.birthDate) {
                const date = new Date(_user.birthDate)
                setBirthDate(date)
                setValue('birthDate', date)
              }
              
              if (_user.country) {
                setSelectedCountry(_user.country)
                setValue('country', _user.country)
              }
              
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setVisible(false)
          }
        } else {
          setLoading(false)
          setNoMatch(true)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    }
  }

  const onAvatarChange = (_avatar: string) => {
    if (loggedUser && user && loggedUser._id === user._id) {
      const _loggedUser = bookcarsHelper.clone(loggedUser)
      _loggedUser.avatar = _avatar

      setLoggedUser(_loggedUser)
    }

    const _user = bookcarsHelper.clone(user)
    if (_user) {
      _user.avatar = _avatar
      setUser(_user)
    }
    
    setAvatar(_avatar)
  }

  const handleCancel = () => {
    navigate('/users')
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!user) {
        helper.error()
        return
      }

      setLoading(true)
      setFormError(false)

      const language = UserService.getLanguage()
      const payload: bookcarsTypes.UpdateUserPayload = {
        _id: user._id as string,
        fullName: data.fullName,
        phone: data.phone || '',
        birthDate: data.birthDate,
        license: data.licenseId || '',
        country: selectedCountry,
        language,
        type: bookcarsTypes.UserType.User,
        avatar,
        location: user.location || '',
        bio: user.bio || '',
      }

      const status = await UserService.updateUser(payload)

      if (status === 200) {
        helper.info(commonStrings.UPDATED)
        navigate('/users')
      } else {
        setFormError(true)
      }
    } catch (err) {
      helper.error(err)
      setFormError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {loggedUser && user && visible && (
        <PageContainer>
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/users')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Update Driver</h1>
            <p className="text-sm text-gray-500 mt-1">Update the driver&apos;s information</p>
          </div>

          {/* Form Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Driver Information</CardTitle>
              <CardDescription>Update the driver&apos;s details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Profile Picture - Optional */}
                <div className="space-y-2">
                  <Label>Profile Picture (Optional)</Label>
                  <div className="flex justify-center">
                    <Avatar
                      type={bookcarsTypes.RecordType.User}
                      mode="update"
                      record={user}
                      size="large"
                      readonly={false}
                      onChange={onAvatarChange}
                      color="disabled"
                      className="avatar-ctn"
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">Optional: Upload a profile picture for the driver</p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    {...register('fullName')}
                    placeholder="Enter full name"
                    className={errors.fullName ? 'border-red-500' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-500">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email - Disabled */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-sm text-gray-500">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+1234567890"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                {/* Birth Date */}
                <div className="space-y-2">
                  <Label>
                    Birth Date <span className="text-red-500">*</span>
                  </Label>
                  <DatePickerField
                    value={birthDate}
                    placeholder="Select birth date"
                    onChange={(date) => {
                      if (date) {
                        setBirthDate(date)
                        if (errors.birthDate) {
                          clearErrors('birthDate')
                        }
                        setValue('birthDate', date, { shouldValidate: true })
                      }
                    }}
                    className={errors.birthDate ? 'border-red-500' : ''}
                  />
                  {errors.birthDate && (
                    <p className="text-sm text-red-500">{errors.birthDate.message}</p>
                  )}
                </div>

                {/* License ID */}
                <div className="space-y-2">
                  <Label htmlFor="licenseId">License ID</Label>
                  <Input
                    id="licenseId"
                    {...register('licenseId')}
                    placeholder="Enter driver's license ID"
                  />
                  <p className="text-sm text-gray-500">Optional: Driver&apos;s license identification number</p>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <CountrySelect
                    value={selectedCountry}
                    onChange={(country) => {
                      setSelectedCountry(country)
                      setValue('country', country, { shouldValidate: true })
                      if (country && errors.country) {
                        clearErrors('country')
                      }
                    }}
                    placeholder="Select a country"
                    className={errors.country ? 'border-red-500' : ''}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500">{errors.country.message}</p>
                  )}
                </div>

                {/* Form Error */}
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{commonStrings.GENERIC_ERROR}</AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="flex-1"
                  >
                    {isSubmitting || loading ? 'Updating...' : 'Update Driver'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting || loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </PageContainer>
      )}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateUser

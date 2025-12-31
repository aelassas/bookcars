import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import validator from 'validator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { intervalToDuration } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import PageContainer from '@/components/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-user'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import DatePickerField from '@/components/DatePickerField'
import CountrySelect from '@/components/CountrySelect'
import Avatar from '@/components/Avatar'

import '@/assets/css/create-user.css'

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

const CreateUser = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [formError, setFormError] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')
  const [birthDate, setBirthDate] = useState<Date | undefined>()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
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

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setUser(_user)
      setVisible(true)
    }
  }

  const validateEmail = async (value: string) => {
    if (value && validator.isEmail(value)) {
      const status = await UserService.validateEmail({ email: value })
      if (status !== 200) {
        setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
        return false
      }
    }
    return true
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

      const language = UserService.getLanguage()

      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      
      const payload: bookcarsTypes.CreateUserPayload = {
        email: data.email,
        phone: data.phone || '',
        location: '', // Keep location empty
        bio: '',
        fullName: data.fullName,
        type: bookcarsTypes.UserType.User, // Always create as driver
        avatar: avatar || '', // Optional avatar
        birthDate: data.birthDate,
        language,
        license: data.licenseId || undefined, // Store license ID
        country: selectedCountry, // Store country in dedicated field
        password: tempPassword, // Temporary password to skip email activation
      }

      const formStatus = await UserService.create(payload)

      if (formStatus === 200) {
        navigate('/users')
      } else {
        setFormError(true)
      }
    } catch (err) {
      helper.error(err)
      setFormError(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && visible && (
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
            <h1 className="text-2xl font-semibold text-gray-900">Create New Driver</h1>
            <p className="text-sm text-gray-500 mt-1">Add a new driver to the system</p>
          </div>

          {/* Form Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Driver Information</CardTitle>
              <CardDescription>Enter the driver's details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Profile Picture - Optional */}
                <div className="space-y-2">
                  <Label>Profile Picture (Optional)</Label>
                  <div className="flex justify-center">
                    <Avatar
                      type={bookcarsTypes.RecordType.User}
                      mode="create"
                      size="large"
                      readonly={false}
                      onChange={(avatar) => {
                        setAvatar(avatar)
                      }}
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

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    onBlur={(e) => validateEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
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
                  <p className="text-sm text-gray-500">Optional: Driver's license identification number</p>
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
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Driver'}
                </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                </Button>
              </div>
            </form>
            </CardContent>
          </Card>
        </PageContainer>
      )}
    </Layout>
  )
}

export default CreateUser

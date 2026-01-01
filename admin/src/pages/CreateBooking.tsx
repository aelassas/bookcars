import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Info as InfoIcon,
  Person as DriverIcon
} from '@mui/icons-material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as blStrings } from '@/lang/booking-list'
import { strings as bfStrings } from '@/lang/booking-filter'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/create-booking'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as helper from '@/utils/helper'
import SupplierSelectList from '@/components/SupplierSelectList'
import UserSelectList from '@/components/UserSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarSelectList from '@/components/CarSelectList'
import StatusList from '@/components/StatusList'
import DateTimePicker from '@/components/DateTimePicker'
import DatePicker from '@/components/DatePicker'
import { Option, Supplier } from '@/models/common'
import { schema, FormFields } from '@/models/BookingForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import '@/assets/css/create-booking.css'

const CreateBooking = () => {
  const navigate = useNavigate()

  const [isSupplier, setIsSupplier] = useState(false)
  const [visible, setVisible] = useState(false)
  const [carObj, setCarObj] = useState<bookcarsTypes.Car>()
  const [minDate, setMinDate] = useState<Date>()
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)

  const form = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      supplier: undefined,
      driver: undefined,
      pickupLocation: undefined,
      dropOffLocation: undefined,
      car: undefined,
      status: undefined,
      cancellation: false,
      amendments: false,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      additionalDriver: false,
      additionalDriverFullName: '',
      additionalDriverEmail: '',
      additionalDriverPhone: '',
    }
  })

  const {
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting, errors }, // Destructure errors here for birthdate check
    getValues,
  } = form

  const supplier = useWatch({ control, name: 'supplier' })
  const pickupLocation = useWatch({ control, name: 'pickupLocation' })
  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const additionalDriverEnabled = useWatch({ control, name: 'additionalDriver' })

  useEffect(() => {
    if (from) {
      const _minDate = new Date(from)
      _minDate.setDate(_minDate.getDate() + 1)
      setMinDate(_minDate)
    } else {
      setMinDate(undefined)
    }
  }, [from])

  const onSubmit = async (data: FormFields) => {
    if (!carObj || fromError || toError) {
      helper.error()
      return
    }

    const additionalDriverSet = helper.carOptionAvailable(carObj, 'additionalDriver') && data.additionalDriver

    const booking: bookcarsTypes.Booking = {
      supplier: data.supplier?._id!,
      car: carObj._id,
      driver: data.driver?._id,
      pickupLocation: data.pickupLocation!._id,
      dropOffLocation: data.dropOffLocation!._id,
      from: data.from!,
      to: data.to!,
      status: data.status as bookcarsTypes.BookingStatus,
      cancellation: data.cancellation,
      amendments: data.amendments,
      theftProtection: data.theftProtection,
      collisionDamageWaiver: data.collisionDamageWaiver,
      fullInsurance: data.fullInsurance,
      additionalDriver: additionalDriverSet,
    }

    let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined = undefined
    if (additionalDriverSet) {
      _additionalDriver = {
        fullName: data.additionalDriverFullName!,
        email: data.additionalDriverEmail!,
        phone: data.additionalDriverPhone!,
        birthDate: data.additionalDriverBirthDate!,
      }
    }

    const options: bookcarsTypes.CarOptions = {
      cancellation: data.cancellation,
      amendments: data.amendments,
      theftProtection: data.theftProtection,
      collisionDamageWaiver: data.collisionDamageWaiver,
      fullInsurance: data.fullInsurance,
      additionalDriver: additionalDriverSet,
    }

    try {
      // use bookcarsHelper.calculatePrice
      const price = await bookcarsHelper.calculateTotalPrice(carObj, from!, to!, carObj.supplier.priceChangeRate || 0, options)
      booking.price = price

      const _booking = await BookingService.create({
        booking,
        additionalDriver: _additionalDriver,
      })

      if (_booking && _booking._id) {
        navigate('/')
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      setVisible(true)

      if (user.type === bookcarsTypes.RecordType.Supplier) {
        setValue('supplier', { _id: user._id, name: user.fullName, image: user.avatar } as Supplier)
        setIsSupplier(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-booking p-6">
        <Card className="mx-auto max-w-3xl" style={visible ? {} : { display: 'none' }}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{strings.NEW_BOOKING_HEADING}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {!isSupplier && (
                  <FormField
                    control={control}
                    name="supplier"
                    render={() => (
                      <FormItem>
                        <FormLabel className="required">{blStrings.SUPPLIER}</FormLabel>
                        <FormControl>
                          <SupplierSelectList
                            variant="standard"
                            onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Option : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={control}
                  name="driver"
                  render={() => (
                    <FormItem>
                      <FormLabel className="required">{blStrings.DRIVER}</FormLabel>
                      <FormControl>
                        <UserSelectList
                          variant="standard"
                          onChange={(values) => setValue('driver', values.length > 0 ? values[0] as Option : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={control}
                    name="pickupLocation"
                    render={() => (
                      <FormItem>
                        <FormLabel className="required">{bfStrings.PICK_UP_LOCATION}</FormLabel>
                        <FormControl>
                          <LocationSelectList
                            variant="standard"
                            onChange={(values) => setValue('pickupLocation', values.length > 0 ? values[0] as Option : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="dropOffLocation"
                    render={() => (
                      <FormItem>
                        <FormLabel className="required">{bfStrings.DROP_OFF_LOCATION}</FormLabel>
                        <FormControl>
                          <LocationSelectList
                            variant="standard"
                            onChange={(values) => setValue('dropOffLocation', values.length > 0 ? values[0] as Option : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="car"
                  render={() => (
                    <FormItem>
                      <FormLabel className="required">{blStrings.CAR}</FormLabel>
                      <FormControl>
                        <CarSelectList
                          supplier={supplier?._id!}
                          pickupLocation={pickupLocation?._id!}
                          onChange={(values) => {
                            const _car = values.length > 0 ? values[0] as bookcarsTypes.Car : undefined
                            setValue('car', _car)
                            setCarObj(_car)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={control}
                    name="from"
                    render={() => (
                      <FormItem>
                        <FormLabel className="required">{commonStrings.FROM}</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={from}
                            showClear
                            onChange={(date) => {
                              setValue('from', date || undefined)
                              if (date && to && date > to) {
                                setValue('to', undefined)
                              }
                            }}
                            onError={(err: DateTimeValidationError) => {
                              setFromError(!!err)
                            }}
                            language={UserService.getLanguage()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="to"
                    render={() => (
                      <FormItem>
                        <FormLabel className="required">{commonStrings.TO}</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={to}
                            minDate={minDate}
                            showClear
                            onChange={(date) => {
                              setValue('to', date || undefined)
                            }}
                            onError={(err: DateTimeValidationError) => {
                              setToError(!!err)
                            }}
                            language={UserService.getLanguage()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="status"
                  render={() => (
                    <FormItem>
                      <FormLabel className="required">{blStrings.STATUS}</FormLabel>
                      <FormControl>
                        <StatusList
                          onChange={(value) => {
                            const currentValue = getValues('status')
                            if (currentValue !== value) {
                              setValue('status', value)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-md">
                  <InfoIcon className="text-neutral-500 w-4 h-4" />
                  <span className="text-xs text-neutral-500">{commonStrings.OPTIONAL}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="cancellation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.CANCELLATION}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'cancellation')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="amendments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.AMENDMENTS}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'amendments')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="theftProtection"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.THEFT_PROTECTION}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'theftProtection')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="collisionDamageWaiver"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.COLLISION_DAMAGE_WAVER}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'collisionDamageWaiver')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="fullInsurance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.FULL_INSURANCE}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'fullInsurance')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="additionalDriver"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label>{csStrings.ADDITIONAL_DRIVER}</Label>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!carObj || !helper.carOptionAvailable(carObj, 'additionalDriver')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {carObj && helper.carOptionAvailable(carObj, 'additionalDriver') && additionalDriverEnabled && (
                  <div className="space-y-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <DriverIcon className="text-neutral-500" />
                      <span className="font-semibold">{csStrings.ADDITIONAL_DRIVER}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={control}
                        name="additionalDriverFullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="required">{commonStrings.FULL_NAME}</FormLabel>
                            <FormControl>
                              <Input {...field} autoComplete="off" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={control}
                        name="additionalDriverEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="required">{commonStrings.EMAIL}</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" autoComplete="off" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={control}
                        name="additionalDriverPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="required">{commonStrings.PHONE}</FormLabel>
                            <FormControl>
                              <Input {...field} autoComplete="off" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={control}
                        name="additionalDriverBirthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="required">{commonStrings.BIRTH_DATE}</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={(birthDate) => {
                                  if (birthDate) {
                                    setValue('additionalDriverBirthDate', birthDate, { shouldValidate: true })
                                  }
                                }}
                                language={UserService.getLanguage()}
                              />
                            </FormControl>
                            <FormMessage>
                              {errors.additionalDriverBirthDate && helper.getBirthDateError(env.MINIMUM_AGE)}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {commonStrings.CREATE}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default CreateBooking

import React, { memo, useEffect, useState } from 'react'
import { StyleSheet, Text, View, Image } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Locale, format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import BookingStatus from './BookingStatus'
import Button from './Button'
import * as helper from '@/utils/helper'
import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import * as StripeService from '@/services/StripeService'

interface BookingProps {
  booking: bookcarsTypes.Booking
  locale: Locale
  language: string
  onCancel: () => void
}

const iconSize = 24
const iconColor = '#000'
const extraIconColor = '#1f9201'
const extraIconSize = 16

const Booking = ({
  booking,
  locale,
  language,
  onCancel
}: BookingProps) => {
  const from = new Date(booking.from)
  const to = new Date(booking.to)
  const days = bookcarsHelper.days(from, to)
  const car = booking.car as bookcarsTypes.Car
  const supplier = booking.supplier as bookcarsTypes.User

  const today = new Date()
  today.setHours(0)
  today.setMinutes(0)
  today.setSeconds(0)
  today.setMilliseconds(0)

  const _fr = bookcarsHelper.isFrench(language)
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'

  const [loading, setLoading] = useState(true)
  const [currencySymbol, setCurrencySymbol] = useState('')
  const [price, setPrice] = useState(0)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')

  useEffect(() => {
    const init = async () => {
      if (booking && car && language && days) {
        const priceChangeRate = (booking.supplier as bookcarsTypes.User).priceChangeRate || 0
        setCurrencySymbol(await StripeService.getCurrencySymbol())
        setPrice(await StripeService.convertPrice(booking.price!))
        setCancellation(await helper.getCancellationOption(car.cancellation, language, priceChangeRate, true))
        setAmendments(await helper.getAmendmentsOption(car.amendments, language, priceChangeRate, true))
        setCollisionDamageWaiver(await helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, language, priceChangeRate, true))
        setTheftProtection(await helper.getTheftProtectionOption(car.theftProtection, days, language, priceChangeRate, true))
        setFullInsurance(await helper.getFullInsuranceOption(car.fullInsurance, days, language, priceChangeRate, true))
        setAdditionalDriver(await helper.getAdditionalDriverOption(car.additionalDriver, days, language, priceChangeRate, true))
        setLoading(false)
      }
    }

    init()
  }, [booking, car, days, language])

  return !loading && price && (
    <View key={booking._id} style={styles.bookingContainer}>
      <View style={styles.booking}>
        <View style={styles.header}>
          <MaterialIcons name="directions-car" size={iconSize} color={iconColor} />
          <Text style={styles.headerText}>{car.name}</Text>
        </View>

        <BookingStatus style={styles.status} status={booking.status} />

        <Text style={styles.detailTitle}>{i18n.t('DAYS')}</Text>
        <Text style={styles.detailText}>
          {`${helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(format(from, _format, { locale }))} - ${bookcarsHelper.capitalize(
            format(to, _format, { locale }),
          )})`}
        </Text>

        <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
        <Text style={styles.detailText}>{(booking.pickupLocation as bookcarsTypes.Location).name}</Text>

        <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
        <Text style={styles.detailText}>{(booking.dropOffLocation as bookcarsTypes.Location).name}</Text>

        <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
        <Text style={styles.detailText}>{car.name}</Text>

        <Text style={styles.detailTitle}>{i18n.t('SUPPLIER')}</Text>
        <View style={styles.supplier}>
          <Image
            style={styles.supplierImg}
            source={{
              uri: bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar),
            }}
          />
          <Text style={styles.supplierText}>{supplier.fullName}</Text>
        </View>

        {(booking.cancellation || booking.amendments || booking.collisionDamageWaiver || booking.theftProtection || booking.fullInsurance || booking.additionalDriver) && (
          <>
            <Text style={styles.detailTitle}>{i18n.t('OPTIONS')}</Text>
            <View style={styles.extras}>
              {booking.cancellation && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('CANCELLATION')}</Text>
                  <Text style={styles.extraText}>{cancellation}</Text>
                </View>
              )}

              {booking.amendments && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('AMENDMENTS')}</Text>
                  <Text style={styles.extraText}>{amendments}</Text>
                </View>
              )}

              {booking.collisionDamageWaiver && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('COLLISION_DAMAGE_WAVER')}</Text>
                  <Text style={styles.extraText}>{collisionDamageWaiver}</Text>
                </View>
              )}

              {booking.theftProtection && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('THEFT_PROTECTION')}</Text>
                  <Text style={styles.extraText}>{theftProtection}</Text>
                </View>
              )}

              {booking.fullInsurance && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('FULL_INSURANCE')}</Text>
                  <Text style={styles.extraText}>{fullInsurance}</Text>
                </View>
              )}

              {booking.additionalDriver && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                  <Text style={styles.extraText}>{additionalDriver}</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
        <Text style={styles.detailTextBold}>{`${bookcarsHelper.formatPrice(price, currencySymbol, language)}`}</Text>

        {booking.cancellation
          && !booking.cancelRequest
          && booking.status !== bookcarsTypes.BookingStatus.Cancelled
          && new Date(booking.from) >= today
          && (
            <Button
              size="small"
              color="secondary"
              style={styles.button}
              label={i18n.t('CANCEL_BOOKING_BTN')}
              onPress={() => {
                if (onCancel) {
                  onCancel()
                }
              }}
            />
          )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bookingContainer: {
    marginRight: 7,
    marginLeft: 7,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  booking: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingRight: 10,
    paddingBottom: 20,
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: '#d9d8d9',
    borderRadius: 5,
  },
  header: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerText: {
    color: '#444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 5,
  },
  detailTitle: {
    alignSelf: 'stretch',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  detailText: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 12,
    marginBottom: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  detailTextBold: {
    fontSize: 15,
    fontWeight: '700',
  },
  status: {
    marginBottom: 10,
  },
  extras: {
    marginBottom: 10,
  },
  extra: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 3,
  },
  extraIcon: {
    marginRight: 4,
  },
  extraTitle: {
    fontWeight: '600',
    fontSize: 12,
    marginRight: 5,
  },
  extraText: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
  },
  supplier: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  supplierImg: {
    width: env.SUPPLIER_IMAGE_WIDTH,
    height: env.SUPPLIER_IMAGE_HEIGHT,
  },
  supplierText: {
    color: '#a1a1a1',
    fontSize: 10,
    marginLeft: 5,
  },
  button: {
    marginTop: 15,
  },
})

export default memo(Booking)

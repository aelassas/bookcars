import React, { memo } from 'react'
import { StyleSheet, Text, View, Image } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Locale, format } from 'date-fns'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'
import * as bookcarsHelper from '../miscellaneous/bookcarsHelper'

import BookingStatus from './BookingStatus'
import Button from './Button'
import * as helper from '../common/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'

interface BookingProps {
  booking: bookcarsTypes.Booking
  locale: Locale
  fr: boolean
  onCancel: () => void
}

const _format = 'eee d LLLL yyyy kk:mm'
const iconSize = 24
const iconColor = '#000'
const extraIconColor = '#1f9201'
const extraIconSize = 16

const Booking = ({
  booking,
  locale,
  fr,
  onCancel
}: BookingProps) => {
  const from = new Date(booking.from)
  const to = new Date(booking.to)
  const days = bookcarsHelper.days(from, to)
  const car = booking.car as bookcarsTypes.Car
  const supplier = booking.company as bookcarsTypes.User

  const today = new Date()
  today.setHours(0)
  today.setMinutes(0)
  today.setSeconds(0)
  today.setMilliseconds(0)

  return (
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
        <Text style={styles.detailText}>{`${car.name} (${bookcarsHelper.formatNumber(car.price)} ${i18n.t('CAR_CURRENCY')})`}</Text>

        <Text style={styles.detailTitle}>{i18n.t('SUPPLIER')}</Text>
        <View style={styles.company}>
          <Image
            style={styles.companyImg}
            source={{
              uri: bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar),
            }}
          />
          <Text style={styles.companyText}>{supplier.fullName}</Text>
        </View>

        {(booking.cancellation || booking.amendments || booking.collisionDamageWaiver || booking.theftProtection || booking.fullInsurance || booking.additionalDriver) && (
          <>
            <Text style={styles.detailTitle}>{i18n.t('OPTIONS')}</Text>
            <View style={styles.extras}>
              {booking.cancellation && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('CANCELLATION')}</Text>
                  <Text style={styles.extraText}>{helper.getCancellationOption(car.cancellation, fr, true)}</Text>
                </View>
              )}

              {booking.amendments && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('AMENDMENTS')}</Text>
                  <Text style={styles.extraText}>{helper.getAmendmentsOption(car.amendments, fr, true)}</Text>
                </View>
              )}

              {booking.collisionDamageWaiver && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('COLLISION_DAMAGE_WAVER')}</Text>
                  <Text style={styles.extraText}>{helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, fr, true)}</Text>
                </View>
              )}

              {booking.theftProtection && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('THEFT_PROTECTION')}</Text>
                  <Text style={styles.extraText}>{helper.getTheftProtectionOption(car.theftProtection, days, fr, true)}</Text>
                </View>
              )}

              {booking.fullInsurance && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('FULL_INSURANCE')}</Text>
                  <Text style={styles.extraText}>{helper.getFullInsuranceOption(car.fullInsurance, days, fr, true)}</Text>
                </View>
              )}

              {booking.additionalDriver && (
                <View style={styles.extra}>
                  <MaterialIcons style={styles.extraIcon} name="check" size={extraIconSize} color={extraIconColor} />
                  <Text style={styles.extraTitle}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                  <Text style={styles.extraText}>{helper.getAdditionalDriverOption(car.additionalDriver, days, fr, true)}</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
        <Text style={styles.detailTextBold}>{`${bookcarsHelper.formatNumber(booking.price)} ${i18n.t('CURRENCY')}`}</Text>

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
  company: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  companyImg: {
    width: env.COMPANY_IMAGE_WIDTH,
    height: env.COMPANY_IMAGE_HEIGHT,
  },
  companyText: {
    color: '#a1a1a1',
    fontSize: 10,
    marginLeft: 5,
  },
  button: {
    marginTop: 15,
  },
})

export default memo(Booking)

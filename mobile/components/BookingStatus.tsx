import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'

import * as helper from '@/utils/helper'

interface BookingStatusProps {
  style: object
  status: bookcarsTypes.BookingStatus
}

const BookingStatus = ({
  style,
  status
}: BookingStatusProps) => {
  const styles = StyleSheet.create({
    container: {
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    text: {
      color: status === bookcarsTypes.BookingStatus.Void
        ? '#6E7C86'
        : status === bookcarsTypes.BookingStatus.Pending
          ? '#EF6C00'
          : status === bookcarsTypes.BookingStatus.Deposit
            ? '#3CB371'
            : status === bookcarsTypes.BookingStatus.Paid
              ? '#77BC23'
              : status === bookcarsTypes.BookingStatus.Reserved
                ? '#1E88E5'
                : status === bookcarsTypes.BookingStatus.Cancelled
                  ? '#E53935'
                  : 'transparent',
      fontSize: 13,
      fontWeight: '400',
    },
  })

  return (
    <View
      style={{
        ...styles.container,
        ...style,
        backgroundColor:
          status === bookcarsTypes.BookingStatus.Void
            ? '#D9D9D9'
            : status === bookcarsTypes.BookingStatus.Pending
              ? '#FBDCC2'
              : status === bookcarsTypes.BookingStatus.Deposit
                ? '#CDECDA'
                : status === bookcarsTypes.BookingStatus.Paid
                  ? '#D1F9D1'
                  : status === bookcarsTypes.BookingStatus.Reserved
                    ? '#D9E7F4'
                    : status === bookcarsTypes.BookingStatus.Cancelled
                      ? '#FBDFDE'
                      : 'transparent',
      }}
    >
      <Text style={styles.text}>{helper.getBookingStatus(status)}</Text>
    </View>
  )
}

export default BookingStatus

import React, { useState, useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View, Text, RefreshControl } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { Paragraph, Dialog, Portal, Button as NativeButton } from 'react-native-paper'
import { enUS, fr } from 'date-fns/locale'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import * as helper from '@/common/helper'
import * as BookingService from '@/services/BookingService'
import Booking from './Booking'

interface BookingListProps {
  navigation?: NativeStackNavigationProp<StackParams, keyof StackParams>
  suppliers?: string[]
  statuses?: string[]
  filter?: bookcarsTypes.Filter
  user: string
  booking?: string
  language?: string
  header?: React.ReactElement
}

const BookingList = ({
  navigation,
  suppliers,
  statuses,
  filter,
  user,
  booking: bookingId,
  language,
  header
}: BookingListProps) => {
  const [firstLoad, setFirstLoad] = useState(true)
  const [onScrollEnd, setOnScrollEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<bookcarsTypes.Booking[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [cancelRequestProcessing, setCancelRequestProcessing] = useState(false)
  const [cancelRequestSent, setCancelRequestSent] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [locale, setLoacle] = useState(fr)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (reset = false) => {
    try {
      if (suppliers && statuses && suppliers.length > 0 && statuses.length > 0) {
        let _page = page
        if (reset) {
          _page = 0
          setPage(0)
        }
        const payload: bookcarsTypes.GetBookingsPayload = {
          suppliers,
          statuses,
          filter,
          user,
        }
        setLoading(true)
        setFetch(true)
        const data = await BookingService.getBookings(payload, _page + 1, env.BOOKINGS_PAGE_SIZE)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const _rows = _page === 0 ? _data.resultData : [...rows, ..._data.resultData]
        setRows(_rows)
        setFetch(_data.resultData.length === env.BOOKINGS_PAGE_SIZE)
        setLoading(false)
      } else {
        setRows([])
        setFetch(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  useEffect(() => {
    setLoacle(language === 'fr' ? fr : enUS)
  }, [language])

  useEffect(() => {
    if (page > 0) {
      fetchData()
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (firstLoad && suppliers && suppliers.length > 0 && statuses && statuses.length > 0) {
        await fetchData()
        setFirstLoad(false)
      }
    }

    init()
  }, [firstLoad, suppliers, statuses]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!firstLoad) {
      if (suppliers && statuses) {
        if (page > 0) {
          fetchData(true)
        } else {
          fetchData()
        }
      }
    }
  }, [suppliers, statuses, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      try {
        if (bookingId) {
          setLoading(true)
          setFetch(true)
          const booking = await BookingService.getBooking(bookingId)
          setRows(booking ? [booking] : [])
          if (!booking) {
            setDeleted(true)
          }
          setFetch(false)
          setLoading(false)
        }
      } catch (err) {
        helper.error(err)
      }
    }

    if (bookingId) {
      init()
    }
  }, [bookingId])

  const numToRender = Math.floor(env.BOOKINGS_PAGE_SIZE / 2)

  return (
    <View style={styles.container}>
      <KeyboardAwareFlatList
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}

        extraHeight={20}
        extraScrollHeight={20}
        enableOnAndroid

        initialNumToRender={numToRender}
        maxToRenderPerBatch={numToRender}
        removeClippedSubviews
        contentContainerStyle={styles.contentContainer}
        style={styles.flatList}
        data={rows}
        renderItem={({ item: booking }) => (
          <Booking
            booking={booking}
            locale={locale}
            language={language as string}
            onCancel={() => {
              setSelectedId(booking._id as string)
              setOpenCancelDialog(true)
            }}
          />
        )}
        keyExtractor={(item) => item._id as string}
        onEndReached={() => setOnScrollEnd(true)}
        onMomentumScrollEnd={() => {
          if (onScrollEnd && fetch && suppliers) {
            setPage(page + 1)
          }
          setOnScrollEnd(false)
        }}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View style={styles.container}>
            {
              fetch && !openCancelDialog
                ? <ActivityIndicator size="large" color="#f37022" style={styles.indicator} />
                : null
            }
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.container}>
              <Text style={styles.text}>{deleted ? i18n.t('BOOKING_DELETED') : i18n.t('EMPTY_BOOKING_LIST')}</Text>
            </View>
          )
            : null
        }
        refreshing={loading}
        refreshControl={
          navigation && (
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true)

              if (bookingId) {
                navigation.navigate('Booking', { id: bookingId })
              } else {
                navigation.navigate('Bookings', {})
              }

              // navigation.dispatch((state) => {
              //   const { routes } = state
              //   const index = routes.findIndex((r) => r.name === 'Bookings')
              //   routes.splice(index, 1)
              //   const now = Date.now()
              //   routes.push({
              //     name: 'Bookings',
              //     key: `Bookings-${now}`,
              //     params: {},
              //   })

              //   return CommonActions.reset({
              //     ...state,
              //     routes,
              //     index: routes.length - 1,
              //   })
              // })
            }}
            />)
        }
      />

      <Portal>
        <Dialog style={styles.dialog} visible={openCancelDialog} dismissable={false}>
          <Dialog.Title style={styles.dialogTitleContent}>{(!cancelRequestSent && !cancelRequestProcessing && i18n.t('CONFIRM_TITLE')) || ''}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {cancelRequestProcessing ? (
              <ActivityIndicator size="large" color="#f37022" />
            ) : cancelRequestSent ? (
              <Paragraph>{i18n.t('CANCEL_BOOKING_REQUEST_SENT')}</Paragraph>
            ) : (
              <Paragraph>{i18n.t('CANCEL_BOOKING')}</Paragraph>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            {!cancelRequestProcessing && (
              <NativeButton
                // color='#f37022'
                onPress={() => {
                  setOpenCancelDialog(false)
                  if (cancelRequestSent) {
                    setTimeout(() => {
                      setCancelRequestSent(false)
                    }, 500)
                  }
                }}
              >
                {i18n.t('CLOSE')}
              </NativeButton>
            )}
            {!cancelRequestSent && !cancelRequestProcessing && (
              <NativeButton
                // color='#f37022'
                onPress={async () => {
                  try {
                    const row = rows.find((r) => r._id === selectedId)
                    if (!row) {
                      helper.error()
                      return
                    }

                    setCancelRequestProcessing(true)
                    const status = await BookingService.cancel(selectedId)

                    if (status === 200) {
                      row.cancelRequest = true

                      setCancelRequestSent(true)
                      setRows(rows)
                      setSelectedId('')
                      setCancelRequestProcessing(false)
                    } else {
                      helper.error()
                      setCancelRequestProcessing(false)
                      setOpenCancelDialog(false)
                    }
                  } catch (err) {
                    helper.error(err)
                    setCancelRequestProcessing(false)
                    setOpenCancelDialog(false)
                  }
                }}
              >
                {i18n.t('CONFIRM')}
              </NativeButton>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#333',
    fontSize: 12,
  },
  contentContainer: {
    flexGrow: 1,
    alignSelf: 'stretch',
    paddingTop: 10,
    paddingBottom: 10,
  },
  flatList: {
    alignSelf: 'stretch',
  },
  indicator: {
    margin: 10,
  },
  dialog: {
    width: '90%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  dialogTitleContent: {
    textAlign: 'center',
  },
  dialogContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActions: {
    height: 75,
  },
})

export default BookingList

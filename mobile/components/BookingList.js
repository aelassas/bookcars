import React, { useState, useEffect } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View, Text } from 'react-native'
import { Paragraph, Dialog, Portal, Button as NativeButton } from 'react-native-paper'
import { enUS, fr } from 'date-fns/locale'

import Env from '../config/env.config'
import i18n from '../lang/i18n'
import * as Helper from '../common/Helper'
import * as BookingService from '../services/BookingService'

import Booking from './Booking'

const BookingList = (props) => {
  const [firstLoad, setFirstLoad] = useState(true)
  const [onScrollEnd, setOnScrollEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [openCancelDialog, setOpenCancelDialog] = useState(false)
  const [cancelRequestProcessing, setCancelRequestProcessing] = useState(false)
  const [cancelRequestSent, setCancelRequestSent] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [locale, setLoacle] = useState(fr)

  const _fetch = async (reset = false) => {
    try {
      if (props.companies.length > 0 && props.statuses.length > 0) {
        let _page = page
        if (reset) {
          _page = 0
          setPage(0)
        }
        const payload = {
          companies: props.companies,
          statuses: props.statuses,
          filter: props.filter,
          user: props.user,
        }
        setLoading(true)
        setFetch(true)
        const data = await BookingService.getBookings(payload, _page, Env.BOOKINGS_PAGE_SIZE)
        const _data = Array.isArray(data) && data.length > 0 ? data[0] : { resultData: [] }
        const _rows = _page === 0 ? _data.resultData : [...rows, ..._data.resultData]
        setRows(_rows)
        setFetch(_data.resultData.length > 0)
        setLoading(false)
      } else {
        setRows([])
        setFetch(false)
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  useEffect(() => {
    setLoacle(props.language === Env.LANGUAGE.FR ? fr : enUS)
  }, [props.language])

  useEffect(() => {
    if (page > 0) {
      _fetch()
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async function () {
      if (firstLoad && props.companies && props.companies.length > 0 && props.statuses && props.statuses.length > 0) {
        await _fetch()
        setFirstLoad(false)
      }
    })()
  }, [firstLoad, props.companies, props.statuses]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!firstLoad) {
      if (props.companies && props.statuses) {
        if (page > 0) {
          _fetch(true)
        } else {
          _fetch()
        }
      }
    }
  }, [props.companies, props.statuses, props.filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        setFetch(true)
        const booking = await BookingService.getBooking(props.booking)
        setRows(booking ? [booking] : [])
        if (!booking) setDeleted(true)
        setFetch(false)
        setLoading(false)
      } catch (err) {
        Helper.error(err)
      }
    }

    if (props.booking) init()
  }, [props.booking])

  const _fr = props.language === Env.LANGUAGE.FR
  const numToRender = Math.floor(Env.BOOKINGS_PAGE_SIZE / 2)

  return (
    <View style={styles.container}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        initialNumToRender={numToRender}
        maxToRenderPerBatch={numToRender}
        removeClippedSubviews
        nestedScrollEnabled
        contentContainerStyle={styles.contentContainer}
        style={styles.flatList}
        data={rows}
        renderItem={({ item: booking }) => (
          <Booking
            booking={booking}
            locale={locale}
            fr={_fr}
            onCancel={() => {
              setSelectedId(booking._id)
              setOpenCancelDialog(true)
            }}
          />
        )}
        keyExtractor={(item) => item._id}
        onEndReached={() => setOnScrollEnd(true)}
        onMomentumScrollEnd={() => {
          if (onScrollEnd && fetch && props.companies) {
            setPage(page + 1)
          }
          setOnScrollEnd(false)
        }}
        ListHeaderComponent={props.header}
        ListFooterComponent={fetch && !openCancelDialog && <ActivityIndicator size="large" color="#f37022" style={styles.indicator} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.container}>
              <Text style={styles.text}>{deleted ? i18n.t('BOOKING_DELETED') : i18n.t('EMPTY_BOOKING_LIST')}</Text>
            </View>
          )
        }
        refreshing={loading}
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
                    setCancelRequestProcessing(true)
                    const status = await BookingService.cancel(selectedId)

                    if (status === 200) {
                      const row = rows.find((r) => r._id === selectedId)
                      row.cancelRequest = true

                      setCancelRequestSent(true)
                      setRows(rows)
                      setSelectedId('')
                      setCancelRequestProcessing(false)
                    } else {
                      Helper.error()
                      setCancelRequestProcessing(false)
                      setOpenCancelDialog(false)
                    }
                  } catch (err) {
                    Helper.error(err)
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

import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useRouter } from 'expo-router'
import { CommonActions, NavigationRoute, RouteProp } from '@react-navigation/native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import * as helper from '@/utils/helper'
import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as CarService from '@/services/CarService'
import Car from './Car'


interface CarListProps {
  from?: Date
  to?: Date
  suppliers?: string[]
  rating?: number
  ranges?: bookcarsTypes.CarRange[]
  multimedia?: bookcarsTypes.CarMultimedia[]
  seats?: number,
  carSpecs?: bookcarsTypes.CarSpecs,
  pickupLocation?: string
  dropOffLocation?: string
  pickupLocationName?: string
  distance?: string
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[]
  deposit?: number
  header?: React.ReactElement
  cars?: bookcarsTypes.Car[]
  hidePrice?: boolean
  footerComponent?: React.ReactElement
  routeName?: 'Cars' | 'Checkout',
  includeAlreadyBookedCars?: boolean
  includeComingSoonCars?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
}

const CarList = ({
  from,
  to,
  suppliers,
  rating,
  ranges,
  multimedia,
  seats,
  carSpecs,
  pickupLocation,
  dropOffLocation,
  pickupLocationName,
  distance,
  carType: _carType,
  gearbox,
  mileage,
  fuelPolicy,
  deposit,
  header,
  cars,
  hidePrice,
  footerComponent,
  routeName,
  // route,
  includeAlreadyBookedCars,
  includeComingSoonCars,
  onLoad,
}: CarListProps) => {
  const router = useRouter()
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [onScrollEnd, setOnScrollEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const _language = await UserService.getLanguage()
        i18n.locale = _language
        setLanguage(_language)
      } catch (err) {
        helper.error(err)
      }
    }

    init()
  }, [])

  const fetchData = async (
    _page: number,
    _suppliers?: string[],
    _rating?: number,
    _ranges?: bookcarsTypes.CarRange[],
    _multimedia?: bookcarsTypes.CarMultimedia[],
    _seats?: number,
    _carSpecs?: bookcarsTypes.CarSpecs,
    _pickupLocation?: string,
    __carType?: string[],
    _gearbox?: string[],
    _mileage?: string[],
    _fuelPolicy?: string[],
    _deposit?: number
  ) => {
    try {
      if (_suppliers && _suppliers.length > 0) {
        setLoading(true)
        setFetch(true)

        const payload: bookcarsTypes.GetCarsPayload = {
          suppliers: _suppliers,
          rating: _rating,
          ranges: _ranges,
          multimedia: _multimedia,
          seats: _seats,
          carSpecs: _carSpecs,
          pickupLocation: _pickupLocation,
          carType: __carType,
          gearbox: _gearbox,
          mileage: _mileage,
          fuelPolicy: _fuelPolicy,
          deposit: _deposit,
          includeAlreadyBookedCars,
          includeComingSoonCars,
          from,
          to,
        }

        const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
        const _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]

        setRows(_rows)
        setFetch(_data.resultData.length === env.CARS_PAGE_SIZE)
        if (onLoad) {
          onLoad({ rows: _data.resultData, rowCount: totalRecords })
        }
      } else {
        setRows([])
        setFetch(false)
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (suppliers) {
      if (suppliers && rating && ranges && multimedia && seats && carSpecs && pickupLocation && _carType && gearbox && mileage && fuelPolicy && deposit) {
        fetchData(page, suppliers, rating, ranges, multimedia, seats, carSpecs, pickupLocation, _carType, gearbox, mileage, fuelPolicy, deposit)
      } else {
        setRows([])
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
      }
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, suppliers, rating, ranges, multimedia, seats, carSpecs, pickupLocation, _carType, gearbox, mileage, fuelPolicy, deposit])

  useEffect(() => {
    if (suppliers && rating && ranges && multimedia && seats && carSpecs && pickupLocation && _carType && gearbox && mileage && fuelPolicy && deposit) {
      setPage(1)
    }
  }, [suppliers, rating, ranges, multimedia, seats, carSpecs, pickupLocation, _carType, gearbox, mileage, fuelPolicy, deposit])

  useEffect(() => {
    if (cars) {
      setRows(cars)
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: cars, rowCount: cars.length })
      }
      setLoading(false)
    }
  }, [cars]) // eslint-disable-line react-hooks/exhaustive-deps

  const numToRender = Math.floor(env.CARS_PAGE_SIZE / 2)

  return (
    <View style={styles.container}>
      {((from && to && pickupLocation && dropOffLocation) || hidePrice) && (
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
          renderItem={({ item: car }) => (
            <Car
              car={car}
              language={language}
              from={from}
              to={to}
              pickupLocation={pickupLocation}
              dropOffLocation={dropOffLocation}
              pickupLocationName={pickupLocationName}
              distance={distance}
              hidePrice={hidePrice}
            />
          )}
          keyExtractor={(item) => item._id}
          onEndReachedThreshold={0.8}
          onEndReached={() => {
            if (fetch && !onScrollEnd) {
              setOnScrollEnd(true)
            }
          }}
          onMomentumScrollEnd={() => {
            if (onScrollEnd && fetch) {
              setPage(page + 1)
            }
            setOnScrollEnd(false)
          }}
          ListHeaderComponent={header}
          ListFooterComponent={
            <View style={styles.container}>
              {
                footerComponent || (fetch
                  ? <ActivityIndicator size="large" color="#f37022" style={styles.indicator} />
                  : null)
              }
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.container}>
                <Text>{i18n.t('EMPTY_CAR_LIST')}</Text>
              </View>
            )
              : null
          }
          refreshing={loading}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)

                const hasRequiredParams = pickupLocation && dropOffLocation && from && to
                const isCarsRoute = routeName === 'Cars'
                const isCheckoutRoute = routeName === 'Checkout' && cars && cars.length > 0

                if (hasRequiredParams && (isCarsRoute || isCheckoutRoute)) {
                  // 1. Prepare the params for the specific route
                  const params: any = {
                    pickupLocation,
                    dropOffLocation,
                    from: from.getTime().toString(),
                    to: to.getTime().toString(),
                    d: Date.now().toString(),
                  }

                  if (isCheckoutRoute) {
                    params.car = cars[0]._id
                  }

                  // 2. Use the helper.navigate with reload = true
                  // This internally calls router.replace and adds 'd: Date.now()'
                  helper.navigate({ name: routeName, params }, true)
                } else {
                  setRefreshing(false)
                }
              }}
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
})

export default CarList

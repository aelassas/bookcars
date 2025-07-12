import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
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
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
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
  route: RouteProp<StackParams, keyof StackParams>
  includeAlreadyBookedCars?: boolean
  includeComingSoonCars?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
}

const CarList = ({
  navigation,
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
              navigation={navigation}
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
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true)

              if ((routeName && pickupLocation && dropOffLocation && from && to) && ((routeName === 'Checkout' && cars && cars.length > 0) || routeName === 'Cars')) {
                // helper.navigate(route, navigation, true)

                navigation.dispatch((state) => {
                  const { routes } = state
                  const _routes = bookcarsHelper.cloneArray(routes) as NavigationRoute<StackParams, keyof StackParams>[]
                  let index = 0

                  if (routeName === 'Cars') {
                    index = routes.findIndex((r) => r.name === 'Cars')
                    // routes.splice(index, 1)
                    const now = Date.now()
                    _routes[index] = {
                      name: routeName,
                      key: `${routeName}-${now}`,
                      params: {
                        pickupLocation: pickupLocation!,
                        dropOffLocation: dropOffLocation!,
                        from: from!.getTime(),
                        to: to!.getTime(),
                        d: now,
                      },
                    }
                    // routes.push({
                    //   name: 'Cars',
                    //   key: `Cars-${now}`,
                    //   params: {
                    //     pickupLocation: pickupLocation!,
                    //     dropOffLocation: dropOffLocation!,
                    //     from: from!.getTime(),
                    //     to: to!.getTime(),
                    //     d: now,
                    //   },
                    // })
                  } else {
                    index = routes.findIndex((r) => r.name === 'Checkout')
                    // routes.splice(index, 1)
                    const now = Date.now()
                    _routes[index] = {
                      name: routeName,
                      key: `${routeName}-${now}`,
                      params: {
                        car: cars![0]._id,
                        pickupLocation: pickupLocation!,
                        dropOffLocation: dropOffLocation!,
                        from: from!.getTime(),
                        to: to!.getTime(),
                        d: now,
                      },
                    }
                    // routes.push({
                    //   name: 'Checkout',
                    //   key: `Checkout-${now}`,
                    //   params: {
                    //     car: cars![0]._id,
                    //     pickupLocation: pickupLocation!,
                    //     dropOffLocation: dropOffLocation!,
                    //     from: from!.getTime(),
                    //     to: to!.getTime(),
                    //     d: now,
                    //   },
                    // })
                  }

                  return CommonActions.reset({
                    ...state,
                    routes: _routes,
                    index,
                  })
                })
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

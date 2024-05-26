import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'

import * as helper from '../common/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import * as CarService from '../services/CarService'
import Car from './Car'

interface CarListProps {
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
  from?: Date
  to?: Date
  suppliers?: string[]
  pickupLocation?: string
  dropOffLocation?: string
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  deposit?: number
  header?: React.ReactElement
  cars?: bookcarsTypes.Car[]
  hidePrice?: boolean
  footerComponent?: React.ReactElement
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
}

const CarList = ({
  navigation,
  from,
  to,
  suppliers,
  pickupLocation,
  dropOffLocation,
  carType: _carType,
  gearbox,
  mileage,
  deposit,
  header,
  cars,
  hidePrice,
  footerComponent,
  onLoad
}: CarListProps) => {
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [onScrollEnd, setOnScrollEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [page, setPage] = useState(1)

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
    _pickupLocation?: string,
    __carType?: string[],
    _gearbox?: string[],
    _mileage?: string[],
    _deposit?: number
  ) => {
    try {
      if (_suppliers && _suppliers.length > 0) {
        setLoading(true)
        setFetch(true)

        const payload: bookcarsTypes.GetCarsPayload = {
          suppliers: _suppliers,
          pickupLocation: _pickupLocation,
          carType: __carType,
          gearbox: _gearbox,
          mileage: _mileage,
          deposit: _deposit,
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
        setFetch(_data.resultData.length > 0)
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
      if (suppliers.length > 0 && pickupLocation && _carType && gearbox && mileage && deposit) {
        fetchData(page, suppliers, pickupLocation, _carType, gearbox, mileage, deposit)
      } else {
        setRows([])
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
      }
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, suppliers, pickupLocation, _carType, gearbox, mileage, deposit])

  useEffect(() => {
    setPage(1)
  }, [suppliers, pickupLocation, _carType, gearbox, mileage, deposit])

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
        <FlatList
          keyboardShouldPersistTaps="handled"
          initialNumToRender={numToRender}
          maxToRenderPerBatch={numToRender}
          removeClippedSubviews
          nestedScrollEnabled
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
              navigation={navigation}
              hidePrice={hidePrice}
            />
          )}
          keyExtractor={(item) => item._id}
          onEndReached={() => setOnScrollEnd(true)}
          onMomentumScrollEnd={() => {
            if (onScrollEnd && fetch) {
              setPage(page + 1)
            }
            setOnScrollEnd(false)
          }}
          ListHeaderComponent={header}
          ListFooterComponent={
            footerComponent || (fetch
              ? <ActivityIndicator size="large" color="#f37022" style={styles.indicator} />
              : <></>)
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.container}>
                <Text>{i18n.t('EMPTY_CAR_LIST')}</Text>
              </View>
            )
              : <></>
          }
          refreshing={loading}
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

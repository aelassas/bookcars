import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native'
import * as Helper from '../common/Helper'
import Env from '../config/env.config'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import * as CarService from '../services/CarService'
import Car from './Car'

const CarList = (props) => {
  const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE)
  const [onScrollEnd, setOnScrollEnd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)

  const _init = async () => {
    try {
      const language = await UserService.getLanguage()
      i18n.locale = language
      setLanguage(language)
    } catch (err) {
      Helper.error(err)
    }
  }

  useEffect(() => {
    ;(async function () {
      await _init()
    })()
  }, [])

  const _fetch = async (page, companies, pickupLocation, fuel, gearbox, mileage, deposit) => {
    try {
      if (companies.length > 0) {
        setLoading(true)
        setFetch(true)

        const payload = {
          companies,
          pickupLocation,
          fuel,
          gearbox,
          mileage,
          deposit,
        }

        const data = await CarService.getCars(payload, page, Env.CARS_PAGE_SIZE)
        const _data = Array.isArray(data) && data.length > 0 ? data[0] : { resultData: [] }
        const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
        const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData]

        setRows(_rows)
        setFetch(_data.resultData.length > 0)
        if (props.onLoad) {
          props.onLoad({ rows: _data.resultData, rowCount: totalRecords })
        }
      } else {
        setRows([])
        setFetch(false)
      }
    } catch (err) {
      Helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (props.companies) {
      if (props.companies.length > 0) {
        _fetch(page, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit)
      } else {
        setRows([])
        setFetch(false)
        if (props.onLoad) {
          props.onLoad({ rows: [], rowCount: 0 })
        }
      }
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, props.companies, props.pickupLocatio, props.fuel, props.gearbox, props.mileage, props.deposit])

  useEffect(() => {
    setPage(1)
  }, [props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit])

  const fr = language === Env.LANGUAGE.FR
  const numToRender = Math.floor(Env.CARS_PAGE_SIZE / 2)

  return (
    <View style={styles.container}>
      {props.from && props.to && (
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
            <Car car={car} fr={fr} from={props.from} to={props.to} pickupLocation={props.pickupLocation} dropOffLocation={props.dropOffLocation} navigation={props.navigation} />
          )}
          keyExtractor={(item) => item._id}
          onEndReached={() => setOnScrollEnd(true)}
          onMomentumScrollEnd={() => {
            if (onScrollEnd && fetch) {
              setPage(page + 1)
            }
            setOnScrollEnd(false)
          }}
          ListHeaderComponent={props.header}
          ListFooterComponent={fetch && <ActivityIndicator size="large" color="#f37022" style={styles.indicator} />}
          ListEmptyComponent={
            !loading && (
              <View style={styles.container}>
                <Text style={styles.text}>{i18n.t('EMPTY_CAR_LIST')}</Text>
              </View>
            )
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

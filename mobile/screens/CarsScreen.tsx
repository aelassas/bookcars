import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import Layout from '../components/Layout'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import CarList from '../components/CarList'
import SupplierFilter from '../components/SupplierFilter'
import CarTypeFilter from '../components/CarTypeFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import DepositFilter from '../components/DepositFilter'

const CarsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Cars'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [deposit, setDeposit] = useState(-1)

  const _init = async () => {
    const language = await UserService.getLanguage()
    i18n.locale = language
    setVisible(true)
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
  }, [route.params, isFocused])

  const onLoad = () => {
    setReload(false)
  }

  const onLoadSuppliers = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
    setLoaded(true)
  }

  const onChangeSuppliers = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const onChangeFuel = (_carType: bookcarsTypes.CarType[]) => {
    setCarType(_carType)
  }

  const onChangeGearbox = (_gearbox: bookcarsTypes.GearboxType[]) => {
    setGearbox(_gearbox)
  }

  const onChangeMileage = (_mileage: bookcarsTypes.Mileage[]) => {
    setMileage(_mileage)
  }

  const onChangeDeposit = (_deposit: number) => {
    setDeposit(_deposit)
  }

  return (
    <Layout style={styles.master} onLoad={onLoad} reload={reload} navigation={navigation} route={route}>
      {visible && (
        <CarList
          navigation={navigation}
          suppliers={suppliers}
          carType={carType}
          gearbox={gearbox}
          mileage={mileage}
          deposit={deposit}
          pickupLocation={route.params.pickupLocation}
          dropOffLocation={route.params.dropOffLocation}
          from={new Date(route.params.from)}
          to={new Date(route.params.to)}
          header={(
            <View>
              <SupplierFilter style={styles.filter} visible onLoad={onLoadSuppliers} onChange={onChangeSuppliers} />
              <CarTypeFilter style={styles.filter} visible={loaded} onChange={onChangeFuel} />
              <GearboxFilter style={styles.filter} visible={loaded} onChange={onChangeGearbox} />
              <MileageFilter style={styles.filter} visible={loaded} onChange={onChangeMileage} />
              <DepositFilter style={styles.filter} visible={loaded} onChange={onChangeDeposit} />
            </View>
          )}
        />
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  filter: {
    marginRight: 7,
    marginBottom: 10,
    marginLeft: 7,
  },
})

export default CarsScreen

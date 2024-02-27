import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

import Master from '../components/Master'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import CarList from '../components/CarList'
import SupplierFilter from '../components/SupplierFilter'
import FuelFilter from '../components/FuelFilter'
import GearboxFilter from '../components/GearboxFilter'
import MileageFilter from '../components/MileageFilter'
import DepositFilter from '../components/DepositFilter'

const CarsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Cars'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [fuel, setFuel] = useState([bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline])
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

  const onLoadCompanies = (_companies: string[]) => {
    setCompanies(_companies)
    setLoaded(true)
  }

  const onChangeCompanies = (_companies: string[]) => {
    setCompanies(_companies)
  }

  const onChangeFuel = (_fuel: bookcarsTypes.CarType[]) => {
    setFuel(_fuel)
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
    <Master style={styles.master} onLoad={onLoad} reload={reload} navigation={navigation} route={route}>
      {visible && (
        <CarList
          navigation={navigation}
          companies={companies}
          fuel={fuel}
          gearbox={gearbox}
          mileage={mileage}
          deposit={deposit}
          pickupLocation={route.params.pickupLocation}
          dropOffLocation={route.params.dropOffLocation}
          from={new Date(route.params.from)}
          to={new Date(route.params.to)}
          header={(
            <View>
              <SupplierFilter style={styles.filter} visible onLoad={onLoadCompanies} onChange={onChangeCompanies} />
              <FuelFilter style={styles.filter} visible={loaded} onChange={onChangeFuel} />
              <GearboxFilter style={styles.filter} visible={loaded} onChange={onChangeGearbox} />
              <MileageFilter style={styles.filter} visible={loaded} onChange={onChangeMileage} />
              <DepositFilter style={styles.filter} visible={loaded} onChange={onChangeDeposit} />
            </View>
          )}
        />
      )}
    </Master>
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

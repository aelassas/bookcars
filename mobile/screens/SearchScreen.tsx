import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
// import * as Location from 'expo-location'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
import Layout from '@/components/Layout'
import CarList from '@/components/CarList'
import SupplierFilter from '@/components/SupplierFilter'
import CarTypeFilter from '@/components/CarTypeFilter'
import GearboxFilter from '@/components/GearboxFilter'
import MileageFilter from '@/components/MileageFilter'
import DepositFilter from '@/components/DepositFilter'
import CarRangeFilter from '@/components/CarRangeFilter'
import CarMultimediaFilter from '@/components/CarMultimediaFilter'
import CarSeatsFilter from '@/components/CarSeatsFilter'
import FuelPolicyFilter from '@/components/FuelPolicyFilter'
import CarSpecsFilter from '@/components/CarSpecsFilter'
import SearchFormFilter from '@/components/SearchFormFilter'
import CarRatingFilter from '@/components/CarRatingFilter'
import Indicator from '@/components/Indicator'

const SearchScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Cars'>) => {
  const isFocused = useIsFocused()

  const [language, setLanguage] = useState('')
  const [reload, setReload] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [visible, setVisible] = useState(false)
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [seats, setSeats] = useState(-1)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [deposit, setDeposit] = useState(-1)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropoffLocation, setDropoffLocation] = useState<bookcarsTypes.Location>()
  const [carCount, setCarCount] = useState(0)
  const [fuelPolicy, setFuelPolicy] = useState(bookcarsHelper.getAllFuelPolicies())
  // const [distance, setDistance] = useState('')
  const [rating, setRating] = useState(-1)
  const [showFilters, setShowFilters] = useState(false)

  const from = useMemo(() => new Date(route.params.from), [route.params.from])
  const to = useMemo(() => new Date(route.params.to), [route.params.to])

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
          carSpecs,
          carType,
          gearbox,
          mileage,
          fuelPolicy,
          deposit,
          ranges,
          multimedia,
          rating,
          seats,
          from,
          to,
        }
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        setSuppliers(_suppliers)
      }
    }

    updateSuppliers()
  }, [pickupLocation, carSpecs, carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

  const _init = async () => {
    const _language = await UserService.getLanguage()
    i18n.locale = _language
    setLanguage(_language)
    const _pickupLocation = await LocationService.getLocation(route.params.pickupLocation)
    setPickupLocation(_pickupLocation)

    // const { status } = await Location.requestForegroundPermissionsAsync()
    // if (status !== 'granted') {
    //   alert('Permission to access location was denied')
    // }
    // const location = await Location.getCurrentPositionAsync({})
    // const d = bookcarsHelper.distance(_pickupLocation.latitude!, _pickupLocation.longitude!, location.coords.latitude, location.coords.longitude, 'K')
    // setDistance(bookcarsHelper.formatDistance(d, language))

    if (route.params.pickupLocation === route.params.dropOffLocation) {
      setDropoffLocation(bookcarsHelper.clone(_pickupLocation))
    } else {
      const _dropoffLocation = await LocationService.getLocation(route.params.dropOffLocation)
      setDropoffLocation(_dropoffLocation)
    }

    const payload: bookcarsTypes.GetCarsPayload = {
      pickupLocation: _pickupLocation._id,
      carSpecs,
      carType,
      gearbox,
      mileage,
      fuelPolicy,
      deposit,
      ranges,
      multimedia,
      rating,
      seats,
      from,
      to,
    }
    const _suppliers = await SupplierService.getFrontendSuppliers(payload)
    const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
    setSuppliers(_suppliers)
    setSupplierIds(_supplierIds)

    setLoaded(true)
    setVisible(true)
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params, isFocused])

  const onLoad = () => {
    setReload(false)
  }

  const onChangeSuppliers = (_suppliers: string[]) => {
    setSupplierIds(_suppliers)
  }

  const onChangeCarRating = (value: number) => {
    setRating(value)
  }

  const onChangeCarRange = (_ranges: bookcarsTypes.CarRange[]) => {
    setRanges(_ranges)
  }

  const onChangeCarMultimedia = (_multimedia: bookcarsTypes.CarMultimedia[]) => {
    setMultimedia(_multimedia)
  }

  const onChangeCarSeats = (value: number) => {
    setSeats(value)
  }

  const onChangeCarSpecs = (value: bookcarsTypes.CarSpecs) => {
    setCarSpecs(value)
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

  const onChangeFuelPolicy = (_fuelPolicy: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(_fuelPolicy)
  }

  const onChangeDeposit = (_deposit: number) => {
    setDeposit(_deposit)
  }

  return language && (
    <Layout style={styles.master} onLoad={onLoad} reload={reload} navigation={navigation} route={route}>
      {!visible && <Indicator style={{ marginVertical: 10 }} />}
      {visible && pickupLocation && dropoffLocation && (
        <CarList
          route={route}
          navigation={navigation}
          suppliers={supplierIds}
          rating={rating}
          ranges={ranges}
          multimedia={multimedia}
          seats={seats}
          carSpecs={carSpecs}
          carType={carType}
          gearbox={gearbox}
          mileage={mileage}
          fuelPolicy={fuelPolicy}
          deposit={deposit}
          pickupLocation={route.params.pickupLocation}
          dropOffLocation={route.params.dropOffLocation}
          // pickupLocationName={pickupLocation.name}
          // distance={distance}
          from={new Date(route.params.from)}
          to={new Date(route.params.to)}
          onLoad={(data) => {
            if (data) {
              setCarCount(data?.rowCount)
            }
          }}
          routeName="Cars"
          // includeAlreadyBookedCars
          includeComingSoonCars
          header={(
            <View>
              <SearchFormFilter
                navigation={navigation}
                style={styles.filter}
                visible={loaded}
                pickupLocation={pickupLocation._id}
                dropOffLocation={dropoffLocation._id}
                pickupLocationText={pickupLocation.name}
                dropOffLocationText={dropoffLocation.name}
                fromDate={new Date(route.params.from)}
                fromTime={new Date(route.params.from)}
                toDate={new Date(route.params.to)}
                toTime={new Date(route.params.to)}
              />

              <Pressable onPress={() => setShowFilters((prev) => !prev)}>
                <View style={styles.shwoFiltersBtn}>
                  <MaterialIcons name="filter-list" size={22} style={styles.shwoFiltersIcon} />
                  <Text style={styles.shwoFiltersTxt}>{showFilters ? i18n.t('HIDE_FILTERS') : i18n.t('SHOW_FILTERS')}</Text>
                </View>
              </Pressable>

              {showFilters && (
                <>
                  <SupplierFilter style={styles.filter} visible={loaded} suppliers={suppliers} onChange={onChangeSuppliers} />
                  <CarRatingFilter style={styles.filter} visible={loaded} onChange={onChangeCarRating} />
                  <CarRangeFilter style={styles.filter} visible={loaded} onChange={onChangeCarRange} />
                  <CarMultimediaFilter style={styles.filter} visible={loaded} onChange={onChangeCarMultimedia} />
                  <CarSeatsFilter style={styles.filter} visible={loaded} onChange={onChangeCarSeats} />
                  <CarSpecsFilter style={styles.filter} visible={loaded} onChange={onChangeCarSpecs} />
                  <CarTypeFilter style={styles.filter} visible={loaded} onChange={onChangeFuel} />
                  <GearboxFilter style={styles.filter} visible={loaded} onChange={onChangeGearbox} />
                  <MileageFilter style={styles.filter} visible={loaded} onChange={onChangeMileage} />
                  <FuelPolicyFilter style={styles.filter} visible={loaded} onChange={onChangeFuelPolicy} />
                  <DepositFilter language={language} style={styles.filter} visible={loaded} onChange={onChangeDeposit} />
                </>
              )}

              {loaded && (
                <View style={styles.title}>
                  <View style={styles.bookcars}>
                    <Text style={styles.titleText}>{i18n.t('SEARCH_TITLE_1')}</Text>
                    <Text style={styles.titleBookCars}>{i18n.t('BOOKCARS')}</Text>
                    <Text style={styles.titleText}>{i18n.t('SEARCH_TITLE_2')}</Text>
                  </View>
                  {carCount > 0 && (
                    <Text style={styles.carCount}>{`(${carCount} ${carCount === 1 ? i18n.t('CAR_AVAILABLE') : i18n.t('CARS_AVAILABLE')})`}</Text>
                  )}
                </View>
              )}
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
  title: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 10,
  },
  bookcars: {
    display: 'flex',
    flexDirection: 'row',
  },
  titleText: {
    fontSize: 18,
  },
  titleBookCars: {
    color: '#212121',
    fontSize: 18,
    fontWeight: '600',
  },
  carCount: {
    color: '#717171',
    marginTop: 3,
  },
  shwoFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f37022',
    // borderColor: '#d9d8d9',
    borderColor: '#f37022',
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 7,
    marginBottom: 10,
    marginLeft: 7,
    paddingVertical: 5,
  },
  shwoFiltersIcon: {
    color: '#fff',
    marginRight: 5,
  },
  shwoFiltersTxt: {
    color: '#fff',
  }
})

export default SearchScreen

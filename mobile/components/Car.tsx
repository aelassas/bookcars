import React, { memo } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { StyleSheet, Text, View, Image } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import Button from './Button'
import * as helper from '../common/helper'
import * as env from '../config/env.config'
import i18n from '../lang/i18n'

interface CarProps {
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
  language: string
  car: bookcarsTypes.Car
  from?: Date
  to?: Date
  pickupLocation?: string
  dropOffLocation?: string
  hidePrice?: boolean
}

const iconSize = 24
const iconColor = '#000'

const getExtraIcon = (extra: number) => (extra === -1 ? 'clear' : extra === 0 ? 'check' : 'info')

const getExtraColor = (extra: number) => (extra === 0 ? '#1f9201' : extra === -1 ? '#f44336' : 'rgba(0, 0, 0, 0.35)')

const Car = ({
  car,
  language,
  from,
  to,
  pickupLocation,
  dropOffLocation,
  navigation,
  hidePrice
}: CarProps) => {
  const fr = bookcarsHelper.isFrench(language)

  const styles = StyleSheet.create({
    carContainer: {
      marginRight: 7,
      marginLeft: 7,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    car: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: '#fff',
      paddingTop: 20,
      paddingRight: 10,
      paddingBottom: 20,
      paddingLeft: 10,
      borderWidth: 1,
      borderColor: '#d9d8d9',
      borderRadius: 5,
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    imgView: {
      width: '100%',
      height: env.CAR_IMAGE_HEIGHT,
      alignItems: 'center',
    },
    img: {
      width: env.CAR_IMAGE_WIDTH,
      height: env.CAR_IMAGE_HEIGHT,
      flex: 1,
      resizeMode: 'contain',
    },
    infos: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 4,
      width: 60,
      padding: 2,
      marginLeft: 5,
    },
    infoIcon: {
      marginRight: 4,
    },
    text: {
      color: '#333',
      fontSize: 12,
    },
    extras: {
      alignSelf: 'stretch',
      marginTop: 10,
    },
    extra: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    footer: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      alignItems: 'flex-end',
      marginBottom: 10,
    },
    supplier: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flex: hidePrice ? 1 : 0.5,
    },
    supplierImg: {
      width: env.SUPPLIER_IMAGE_WIDTH,
      height: env.SUPPLIER_IMAGE_HEIGHT,
      resizeMode: 'contain',
    },
    supplierText: {
      color: '#a1a1a1',
      fontSize: 12,
      marginLeft: 5,
      width: hidePrice ? 200 : 120,
    },
    price: {
      flex: 0.5,
      alignSelf: 'stretch',
      alignItems: 'flex-end',
      marginTop: 20,
    },
    pricePrimary: {
      fontSize: 22,
      fontWeight: '700',
      color: '#383838',
      lineHeight: 28,
    },
    priceSecondary: {
      fontSize: 13,
      color: '#a1a1a1',
    },
    buttonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      width: '100%',
      marginTop: 10,
    },
  })

  return (
    <View key={car._id} style={styles.carContainer}>
      <View style={styles.car}>
        <Text style={styles.name}>{car.name}</Text>

        <View style={styles.imgView}>
          <Image style={styles.img} source={{ uri: bookcarsHelper.joinURL(env.CDN_CARS, car.image) }} />
        </View>

        <View style={styles.infos}>
          {car.type !== bookcarsTypes.CarType.Unknown && (
            <View style={styles.info}>
              <MaterialIcons name="local-gas-station" size={iconSize} color={iconColor} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getCarTypeShort(car.type)}</Text>
            </View>
          )}
          <View style={styles.info}>
            <MaterialIcons name="account-tree" size={iconSize} color={iconColor} style={styles.infoIcon} />
            <Text style={styles.text}>{helper.getGearboxTypeShort(car.gearbox)}</Text>
          </View>
          {car.seats > 0 && (
            <View style={styles.info}>
              <MaterialIcons name="person" size={iconSize} color={iconColor} style={styles.infoIcon} />
              <Text style={styles.text}>{car.seats}</Text>
            </View>
          )}
          {car.doors > 0 && (
            <View style={styles.info}>
              <Image source={require('../assets/car-door.png')} style={{ ...styles.infoIcon, width: 20, height: 20 }} />
              <Text style={styles.text}>{car.doors}</Text>
            </View>
          )}
          {car.aircon && (
            <View style={styles.info}>
              <MaterialIcons name="ac-unit" size={iconSize} color={iconColor} style={styles.infoIcon} />
            </View>
          )}
        </View>

        {car.mileage !== 0 && (
          <View style={styles.infos}>
            <MaterialIcons name="directions-car" size={iconSize} color={iconColor} style={styles.infoIcon} />
            <Text style={styles.text}>{`${i18n.t('MILEAGE')}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage, language)}`}</Text>
          </View>
        )}

        <View style={styles.infos}>
          <MaterialIcons name="local-gas-station" size={iconSize} color={iconColor} style={styles.infoIcon} />
          <Text style={styles.text}>{`${i18n.t('FUEL_POLICY')}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</Text>
        </View>

        <View style={styles.extras}>
          {car.cancellation > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.cancellation)} color={getExtraColor(car.cancellation)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getCancellation(car.cancellation, language)}</Text>
            </View>
          )}
          {car.amendments > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.amendments)} color={getExtraColor(car.amendments)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getAmendments(car.amendments, language)}</Text>
            </View>
          )}
          {car.theftProtection > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.theftProtection)} color={getExtraColor(car.theftProtection)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getTheftProtection(car.theftProtection, language)}</Text>
            </View>
          )}
          {car.collisionDamageWaiver > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.collisionDamageWaiver)} color={getExtraColor(car.collisionDamageWaiver)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language)}</Text>
            </View>
          )}
          {car.fullInsurance > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.fullInsurance)} color={getExtraColor(car.fullInsurance)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getFullInsurance(car.fullInsurance, language)}</Text>
            </View>
          )}
          {car.additionalDriver > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.additionalDriver)} color={getExtraColor(car.additionalDriver)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{helper.getAdditionalDriver(car.additionalDriver, language)}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.supplier}>
            <Image
              style={styles.supplierImg}
              source={{
                uri: bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar),
              }}
            />
            <Text style={styles.supplierText} numberOfLines={2} ellipsizeMode="tail">{car.supplier.fullName}</Text>
          </View>

          {!hidePrice && from && to && (
            <View style={styles.price}>
              <Text style={styles.priceSecondary}>{helper.getDays(bookcarsHelper.days(from, to))}</Text>
              <Text style={styles.pricePrimary}>{`${bookcarsHelper.formatPrice(helper.price(car, from, to), i18n.t('CURRENCY'), language)}`}</Text>
              <Text style={styles.priceSecondary}>{`${i18n.t('PRICE_PER_DAY')} ${bookcarsHelper.formatPrice(car.price, i18n.t('CURRENCY'), language)}`}</Text>
            </View>
          )}
        </View>

        {!hidePrice && from && to && pickupLocation && dropOffLocation && (
          <View style={styles.buttonContainer}>
            <Button
              style={styles.button}
              label={i18n.t('BOOK')}
              onPress={() => {
                const params = {
                  car: car._id,
                  pickupLocation,
                  dropOffLocation,
                  from: from.getTime(),
                  to: to.getTime(),
                }
                navigation.navigate('Checkout', params)
              }}
            />
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(Car)

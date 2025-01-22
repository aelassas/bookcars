import React, { memo, useEffect, useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { StyleSheet, Text, View, Image } from 'react-native'
import Entypo from '@expo/vector-icons/Entypo'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import Button from './Button'
import * as helper from '@/common/helper'
import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import * as StripeService from '@/services/StripeService'

interface CarProps {
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
  language: string
  car: bookcarsTypes.Car
  from?: Date
  to?: Date
  pickupLocation?: string
  dropOffLocation?: string
  pickupLocationName?: string
  distance?: string
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
  pickupLocationName,
  distance,
  navigation,
  hidePrice
}: CarProps) => {
  const fr = bookcarsHelper.isFrench(language)

  const [days, setDays] = useState<number>()
  const [loading, setLoading] = useState(true)
  const [currencySymbol, setCurrencySymbol] = useState('')
  const [totalPrice, setTotalPrice] = useState<number>()
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')

  useEffect(() => {
    const init = async () => {
      if (car && from && to && language) {
        setCurrencySymbol(await StripeService.getCurrencySymbol())
        setDays(bookcarsHelper.days(from, to))
        setTotalPrice(await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date)))
        setCancellation(await helper.getCancellation(car.cancellation, language))
        setAmendments(await helper.getAmendments(car.amendments, language))
        setCollisionDamageWaiver(await helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language))
        setTheftProtection(await helper.getTheftProtection(car.theftProtection, language))
        setFullInsurance(await helper.getFullInsurance(car.fullInsurance, language))
        setAdditionalDriver(await helper.getAdditionalDriver(car.additionalDriver, language))
        setLoading(false)
      }
    }

    init()
  }, [car, from, language, to])

  const styles = StyleSheet.create({
    carContainer: {
      marginRight: 7,
      marginLeft: 7,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    location: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 5,
      padding: 5,
    },
    locationImage: {
      marginRight: 3,
    },
    locationText: {
      fontSize: 18,
      color: '#212121',
    },
    distance: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      margin: 5,
    },
    distanceImage: {
      height: 16,
      resizeMode: 'contain',
    },
    distanceText: {
      fontSize: 11,
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
    detailsContainer: {
      flexDirection: 'column',
      flex: hidePrice ? 1 : 0.5,
    },
    supplier: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
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
    details: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginTop: 5,
      paddingLeft: 2,
    },
    rating: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    ratingText: {
      fontWeight: '600',
    },
    ratingImage: {
      width: 16,
      resizeMode: 'contain',
      marginRight: 5,
      marginLeft: 5,
    },
    tripsText: {
      fontSize: 11,
      color: '#A2A2A2',
    },
    co2: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    co2Text: {
      fontSize: 11,
      fontWeight: '600',
    },
    co2Image: {
      width: 17,
      resizeMode: 'contain',
      marginRight: 5,
      marginLeft: 5,
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
    carInfo: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#FD3446',
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

  return !loading && days && totalPrice && (
    <View key={car._id} style={styles.carContainer}>
      {pickupLocationName && (
        <>
          <View style={styles.location}>
            <Entypo style={styles.locationImage} name="location-pin" size={24} color="#212121" />
            <Text style={styles.locationText}>{pickupLocationName}</Text>
          </View>
          {distance && (
            <View style={styles.distance}>
              <Image style={styles.distanceImage} source={require('@/assets/distance-icon.png')} />
              <Text style={styles.distanceText}>{`${distance} ${i18n.t('FROM_YOU')}`}</Text>
            </View>
          )}
        </>
      )}

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
              <Image source={require('@/assets/car-door.png')} style={{ ...styles.infoIcon, width: 20, height: 20 }} />
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
              <Text style={styles.text}>{cancellation}</Text>
            </View>
          )}
          {car.amendments > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.amendments)} color={getExtraColor(car.amendments)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{amendments}</Text>
            </View>
          )}
          {car.theftProtection > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.theftProtection)} color={getExtraColor(car.theftProtection)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{theftProtection}</Text>
            </View>
          )}
          {car.collisionDamageWaiver > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.collisionDamageWaiver)} color={getExtraColor(car.collisionDamageWaiver)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{collisionDamageWaiver}</Text>
            </View>
          )}
          {car.fullInsurance > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.fullInsurance)} color={getExtraColor(car.fullInsurance)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{fullInsurance}</Text>
            </View>
          )}
          {car.additionalDriver > -1 && (
            <View style={styles.extra}>
              <MaterialIcons name={getExtraIcon(car.additionalDriver)} color={getExtraColor(car.additionalDriver)} size={iconSize} style={styles.infoIcon} />
              <Text style={styles.text}>{additionalDriver}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.detailsContainer}>
            <View style={styles.supplier}>
              <Image
                style={styles.supplierImg}
                source={{
                  uri: bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar),
                }}
              />
              <Text style={styles.supplierText} numberOfLines={2} ellipsizeMode="tail">{car.supplier.fullName}</Text>
            </View>
            <View style={styles.details}>
              <View style={styles.rating}>
                {car.rating && car.rating >= 1 && (
                  <>
                    <Text style={styles.ratingText}>{car.rating.toFixed(2)}</Text>
                    <Image source={require('@/assets/rating-icon.png')} style={styles.ratingImage} />
                  </>
                )}
                {car.trips >= 10 && <Text style={styles.tripsText}>{`(${car.trips} ${i18n.t('TRIPS')})`}</Text>}
              </View>
              {car.co2 && (
                <View style={styles.co2}>
                  <Image
                    source={
                      car.co2 <= 90
                        ? require('@/assets/co2-min-icon.png')
                        : car.co2 <= 110
                          ? require('@/assets/co2-middle-icon.png')
                          : require('@/assets/co2-max-icon.png')
                    }
                    style={styles.co2Image}
                  />
                  <Text style={styles.co2Text}>{i18n.t('CO2')}</Text>
                </View>
              )}
            </View>
          </View>

          {!hidePrice && from && to && (
            <View style={styles.price}>
              <Text style={styles.priceSecondary}>{helper.getDays(days)}</Text>
              <Text style={styles.pricePrimary}>{`${bookcarsHelper.formatPrice(totalPrice, currencySymbol, language)}`}</Text>
              <Text style={styles.priceSecondary}>{`${i18n.t('PRICE_PER_DAY')} ${bookcarsHelper.formatPrice(totalPrice / days, currencySymbol, language)}`}</Text>

              {
                car.comingSoon ? (
                  <Text style={styles.carInfo}>{i18n.t('COMING_SOON')}</Text>
                ) : car.fullyBooked ? (
                  <Text style={styles.carInfo}>{i18n.t('FULLY_BOOKED')}</Text>
                ) : null
              }
            </View>
          )}
        </View>

        {!hidePrice && from && to && pickupLocation && dropOffLocation && car.available && !car.fullyBooked && !car.comingSoon && (
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

import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { RouteProp, useIsFocused, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as StripeService from '@/services/StripeService'
import { CURRENCIES } from '@/config/env.config'
import * as helper from '@/utils/helper'

interface CurrencyMenuProps {
  route: RouteProp<StackParams, keyof StackParams>
  textColor?: string
  style?: object
}

const CurrencyMenu = ({
  route,
  textColor,
  style,
}: CurrencyMenuProps) => {
  const isFocused = useIsFocused()
  const navigation = useNavigation<NativeStackNavigationProp<StackParams, keyof StackParams>>()

  const [value, setValue] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const init = async () => {
      setValue(await StripeService.getCurrency())
      setShowMenu(false)
    }

    init()
  }, [route.name, isFocused])

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: textColor || '#000',
      fontWeight: 'bold'
    },
    menu: {
      position: 'absolute',
      top: 39,
      left: -24,
    },
    menuItem: {
      width: 70,
      height: 32,
      backgroundColor: '#fff',
      borderColor: '#f1f1f1',
      borderWidth: 1,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      color: '#515151',
      textAlign: 'center',
    },
    selected: {
      backgroundColor: '#feeee4',
    },
    textSelected: {
      color: '#f37022',
    }
  })

  return (
    <>
      <View style={{ ...styles.container, ...style }}>
        <Pressable
          onPress={() => setShowMenu((prev) => !prev)}
        >
          <Text style={styles.text}>{value}</Text>
        </Pressable>
      </View>
      {showMenu && (
        <View style={styles.menu}>
          {
            CURRENCIES.map((currency) => (
              <Pressable
                key={currency.code}
                onPress={async () => {
                  await StripeService.setCurrency(currency.code)
                  helper.navigate(route, navigation, true)
                  setValue(currency.code)
                  setShowMenu(false)
                }}
              >
                <View style={{ ...styles.menuItem, ...(currency.code === value ? styles.selected : null) }}>
                  <Text style={{ ...styles.menuItemText, ...(currency.code === value ? styles.textSelected : null) }}>{currency.code}</Text>
                </View>
              </Pressable>
            ))
          }
        </View>
      )}
    </>
  )
}

export default CurrencyMenu

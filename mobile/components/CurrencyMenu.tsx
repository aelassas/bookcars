import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { RouteProp, useIsFocused, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as StripeService from '@/services/StripeService'
import { CURRENCIES } from '@/config/env.config'
import * as helper from '@/common/helper'

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
      fontWeight: '500'
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
      color: '#515151',
      // backgroundColor: '#feeee4',
      // color: '#f37022',
      textAlign: 'center',
      verticalAlign: 'middle',
      borderColor: '#f1f1f1',
      borderWidth: 1,
    },
    selected: {
      backgroundColor: '#feeee4',
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
                <Text style={{ ...styles.menuItem, ...(currency.code === value ? styles.selected : null) }}>{currency.code}</Text>
              </Pressable>
            ))
          }
        </View>
      )}
    </>
  )
}

export default CurrencyMenu

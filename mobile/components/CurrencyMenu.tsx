import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, usePathname } from 'expo-router' // Replacement for route prop
import * as StripeService from '@/services/StripeService'
import { CURRENCIES } from '@/config/env.config'
import * as helper from '@/utils/helper'

interface CurrencyMenuProps {
  // Removed route prop - we fetch it from the hook now
  textColor?: string
  style?: object
}

const CurrencyMenu = ({
  textColor,
  style,
}: CurrencyMenuProps) => {
  const params = useLocalSearchParams()
  const pathname = usePathname() // Gets current path like '/bookings'

  const [value, setValue] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const init = async () => {
      setValue(await StripeService.getCurrency())
      setShowMenu(false)
    }

    init()
  }, [pathname]) // Re-run when path changes

  // Helper to convert pathname back to a Name for your helper.navigate


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
      zIndex: 100, // Ensure it stays above other elements
    },
    menuItem: {
      width: 70,
      height: 32,
      backgroundColor: '#fff',
      borderColor: '#f1f1f1',
      borderWidth: 1,
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
      <View style={[styles.container, style]}>
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

                  // Trigger refresh using the new helper
                  // We pass existing params so the user stays on the same data (e.g. same booking ID)

                  const currentRouteName = helper.getCurrentRouteName(pathname)
                  helper.navigate(
                    { name: currentRouteName, params: { ...params } },
                    true
                  )

                  setValue(currency.code)
                  setShowMenu(false)
                }}
              >
                <View style={[styles.menuItem, currency.code === value && styles.selected]}>
                  <Text style={[styles.menuItemText, currency.code === value && styles.textSelected]}>
                    {currency.code}
                  </Text>
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

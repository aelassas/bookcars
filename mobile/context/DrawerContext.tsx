import React, { createContext, useContext, useState, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CustomDrawerContent from '@/components/CustomDrawerContent'

const DRAWER_WIDTH = 280
const DrawerContext = createContext({ toggle: () => { } })

export const useDrawer = () => useContext(DrawerContext)

export const SimpleDrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const toggle = () => {
    // Determine targets based on current state
    const isOpening = !visible
    const toValue = isOpening ? 0 : -DRAWER_WIDTH
    const opacityValue = isOpening ? 1 : 0

    // 1. If closing, we keep 'visible' true until animation finishes 
    // OR we manage visibility via the Animated opacity directly.

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: opacityValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Optional: Only set visible false after the close animation completes
      if (!isOpening) {
        setVisible(false)
      }
    })

    // If opening, set visible immediately so the Overlay renders
    if (isOpening) {
      setVisible(true)
    }
  }

  return (
    <DrawerContext.Provider value={{ toggle }}>
      <View style={{ flex: 1 }}>
        {/* Dark Overlay */}
        {visible && (
          <Animated.View style={[styles.overlay, { opacity: opacityAnim, marginTop: insets.top, marginBottom: insets.bottom }]}>
            <Pressable style={{ flex: 1 }} onPress={toggle} />
          </Animated.View>
        )}

        {/* Sidebar */}
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          <CustomDrawerContent closeDrawer={toggle} />
        </Animated.View>

        {/* Main App Content */}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </DrawerContext.Provider>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'transparent',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  }
})

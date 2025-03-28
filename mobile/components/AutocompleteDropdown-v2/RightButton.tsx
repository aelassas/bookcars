import React, { memo, useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Easing, StyleSheet, Pressable, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import Feather from 'react-native-vector-icons/Feather'

Feather.loadFont()

const RightButtonComponent = ({
    inputHeight,
    isOpened,
    showChevron,
    showClear,
    loading,
    buttonsContainerStyle,
    ChevronIconComponent,
    ClearIconComponent,
    onClearPress,
    onChevronPress,
  }: {
    inputHeight?: number
    isOpened?: boolean
    showChevron?: boolean
    showClear?: boolean
    loading?: boolean
    buttonsContainerStyle?: object
    ChevronIconComponent?: React.ReactNode
    ClearIconComponent?: boolean
    onClearPress: () => void
    onChevronPress: () => void
  }) => {
  const isOpenedAnimationValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(isOpenedAnimationValue, {
      duration: 350,
      toValue: isOpened ? 1 : 0,
      useNativeDriver: true,
      easing: Easing.bezier(0.3, 0.58, 0.25, 0.99),
    }).start()
  }, [isOpened]) // eslint-disable-line react-hooks/exhaustive-deps

  const chevronSpin = isOpenedAnimationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  return (
    <View
      style={{
        ...styles.container,
        height: inputHeight,
        ...buttonsContainerStyle,
      }}
    >
      {!loading && showClear && (
        <Pressable onPress={onClearPress} hitSlop={15} style={styles.clearButton}>
          {ClearIconComponent ?? <MaterialIcons name="clear" size={20} color="rgba(0, 0, 0, 0.28)" />}
        </Pressable>
      )}
      {loading && <ActivityIndicator color="#999" />}
      {showChevron && (
        <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
          <Pressable onPress={onChevronPress} style={styles.chevronButton}>
            {ChevronIconComponent ?? <Feather name="chevron-down" size={20} color="#727992" />}
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}

export const RightButton = memo(RightButtonComponent)

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 0,
    flexDirection: 'row',
    right: 8,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  clearButton: {
    width: 26,
    alignItems: 'center',
    padding: 5,
  },
  chevronButton: {
    width: 26,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
})

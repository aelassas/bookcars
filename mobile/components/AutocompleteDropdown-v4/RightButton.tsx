import React, { memo, useEffect, useRef } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { ActivityIndicator, Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native'
import { ChevronDown } from 'react-native-feather'
import { MaterialIcons } from '@expo/vector-icons'

interface RightButtonProps {
  inputHeight?: number
  onClearPress?: () => void
  onChevronPress?: () => void
  isOpened?: boolean
  showChevron?: boolean
  showClear?: boolean
  loading?: boolean
  buttonsContainerStyle?: StyleProp<ViewStyle>
  ChevronIconComponent?: React.ReactNode
  ClearIconComponent?: React.ReactNode
  RightIconComponent?: React.ReactNode
  onRightIconComponentPress?: () => void
}

export const RightButton: React.FC<RightButtonProps> = memo(
  ({
    inputHeight,
    onClearPress,
    onChevronPress,
    isOpened,
    showChevron,
    showClear,
    loading,
    buttonsContainerStyle,
    ChevronIconComponent,
    ClearIconComponent,
    RightIconComponent,
    onRightIconComponentPress,
  }) => {
    const isOpenedAnimationValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
      Animated.timing(isOpenedAnimationValue, {
        duration: 350,
        toValue: isOpened ? 1 : 0,
        useNativeDriver: true,
        easing: Easing.bezier(0.3, 0.58, 0.25, 0.99),
      }).start()
    }, [isOpened, isOpenedAnimationValue])

    const chevronSpin = isOpenedAnimationValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    })

    return (
      <View
        style={{
          ...styles.container,
          height: inputHeight,
          ...(buttonsContainerStyle as object),
        }}>
        {!loading && showClear && (
          <TouchableOpacity onPress={onClearPress} style={styles.clearButton}>
            {ClearIconComponent ?? <MaterialIcons name="clear" size={20} color="rgba(0, 0, 0, 0.28)" />}
          </TouchableOpacity>
        )}
        {loading && <ActivityIndicator color="#999" />}
        {RightIconComponent && (
          <TouchableOpacity onPress={onRightIconComponentPress} style={styles.chevronButton}>
            {RightIconComponent}
          </TouchableOpacity>
        )}
        {showChevron && (
          <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
            <TouchableOpacity onPress={onChevronPress} style={styles.chevronButton}>
              {ChevronIconComponent ?? <ChevronDown width={20} stroke="#727992" />}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    )
  },
)

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
  },
  chevronButton: {
    width: 26,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
})

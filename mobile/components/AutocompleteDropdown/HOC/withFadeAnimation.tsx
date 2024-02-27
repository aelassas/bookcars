import React, { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

export const withFadeAnimation = (WrappedComponent: () => React.JSX.Element, containerStyle?: object) => {
  const FadeAnimation = (props: object) => {
    const opacityAnimationValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
      Animated.timing(opacityAnimationValue, {
        duration: 800,
        toValue: 1,
        useNativeDriver: true,
        easing: Easing.bezier(0.3, 0.58, 0.25, 0.99),
      }).start()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <Animated.View style={[containerStyle, { opacity: opacityAnimationValue }]}>
        <WrappedComponent {...props} />
      </Animated.View>
    )
  }

  return FadeAnimation
}

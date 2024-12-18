import type { FC, ComponentType } from 'react'
import React, { useEffect, useRef } from 'react'
import type { ViewProps } from 'react-native'
import { Animated, Easing } from 'react-native'

interface WithFadeAnimationProps {
  containerStyle?: ViewProps['style']
}

export const withFadeAnimation = <P extends object>(
  WrappedComponent: ComponentType<P>,
  { containerStyle }: WithFadeAnimationProps = {},
): FC<P> => {
  return (props: P) => {
    const opacityAnimationValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
      Animated.timing(opacityAnimationValue, {
        duration: 800,
        toValue: 1,
        useNativeDriver: true,
        easing: Easing.bezier(0.3, 0.58, 0.25, 0.99),
      }).start()
    }, [opacityAnimationValue])

    return (
      <Animated.View style={[containerStyle, { opacity: opacityAnimationValue }]}>
        <WrappedComponent {...props} />
      </Animated.View>
    )
  }
}

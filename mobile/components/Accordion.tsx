import React, { useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface AccordionProps {
  style?: object
  title: string
  children?: React.ReactNode
}

const Accordion = ({
  style,
  title,
  children
}: AccordionProps) => {
  const [open, setOpen] = useState(false)
  const animatedController = useRef(new Animated.Value(0)).current

  const arrowAngle = animatedController.interpolate({
    inputRange: [0, 1],
    outputRange: ['0rad', `${Math.PI}rad`],
  })

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: open ? 1 : 0,
      borderLeftWidth: 1,
      borderColor: '#d9d8d9',
      borderRadius: 5,
      backgroundColor: '#fff',
    },
    title: {
      flex: 1,
    },
    titleTouchable: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: 'red',
      zIndex: 10,
      elevation: 10,
    },
    titleContainer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
      paddingRight: 5,
      borderBottomWidth: 1,
      borderColor: '#d9d8d9',
      borderRadius: open ? 0 : 4,
      paddingTop: 5,
      paddingBottom: 5,
    },
    titleTextContainer: {
      flex: 1,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleText: {
      color: 'rgba(0, 0, 0, .6)',
      fontWeight: '400',
      fontSize: 13,
    },
    bodyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: open ? 7 : 0,
      paddingBottom: open ? 7 : 0,
      opacity: open ? 1 : 0,
      height: open ? 'auto' : 0,
      width: open ? 'auto' : 0,
    },
  })

  return (
    <View style={{ ...styles.container, ...style }}>
      <View style={styles.title}>
        <TouchableWithoutFeedback
          style={styles.titleTouchable}
          onPress={() => {
            if (open) {
              Animated.timing(animatedController, {
                duration: 300,
                toValue: 0,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                useNativeDriver: true,
              }).start()
            } else {
              Animated.timing(animatedController, {
                duration: 300,
                toValue: 1,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                useNativeDriver: true,
              }).start()
            }
            setOpen((prev) => !prev)
          }}
        >
          <View style={styles.titleContainer}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
            <Animated.View style={{ transform: [{ rotateZ: arrowAngle }] }}>
              <MaterialIcons name="keyboard-arrow-down" size={22} color="rgba(0, 0, 0, 0.7)" />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </View>
      <View style={styles.bodyContainer}>{children}</View>
    </View>
  )
}

export default Accordion

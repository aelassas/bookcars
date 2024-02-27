import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface BackdropProps {
  message?: string
}

const Backdrop = ({ message }: BackdropProps) => (
    <View style={styles.container}>
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  )

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  text: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
  },
})

export default Backdrop

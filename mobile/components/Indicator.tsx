import React from 'react'
import { ActivityIndicator } from 'react-native'

interface IndicatorProps {
  style?: object
}

const Indicator = ({ style }: IndicatorProps) => (
  <ActivityIndicator size="large" color="#D4AF37" style={style} />
)

export default Indicator

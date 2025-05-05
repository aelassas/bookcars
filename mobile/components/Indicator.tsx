import React from 'react'
import { ActivityIndicator } from 'react-native'

interface IndicatorProps {
  style?: object
}

const Indicator = ({ style }: IndicatorProps) => (
  <ActivityIndicator size="large" color="#f37022" style={style} />
)

export default Indicator

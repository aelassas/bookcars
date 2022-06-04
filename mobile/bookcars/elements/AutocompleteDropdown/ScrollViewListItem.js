import React, { memo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export const ScrollViewListItem = memo(
  ({ titleHighlighted, titleStart, titleEnd, style, onPress, numberOfLines = 2 }) => {
    return (
      <TouchableOpacity onPress={onPress}>
        <View style={styles.container}>
          <Text numberOfLines={numberOfLines}>
            <Text numberOfLines={1} style={{ ...styles.text, ...style }}>
              {titleStart}
            </Text>
            <Text numberOfLines={1} style={{ ...styles.text, ...style, fontWeight: 'bold' }}>
              {titleHighlighted}
            </Text>
            <Text numberOfLines={1} style={{ ...styles.text, ...style }}>
              {titleEnd}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    padding: 15,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexWrap: 'nowrap',

    width: '100%'
  },
  text: {
    color: '#333',
    fontSize: 16,
    flexGrow: 1,
    flexShrink: 0
  }
})

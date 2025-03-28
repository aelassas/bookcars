import React, { memo } from 'react'
import { StyleSheet, Text, Pressable, View } from 'react-native'

const ScrollViewListItemComponent = ({
  titleHighlighted,
  titleStart,
  titleEnd,
  style,
  numberOfLines = 2,
  onPress
}:
  {
    titleHighlighted?: string
    titleStart?: string
    titleEnd?: string
    style?: object
    numberOfLines?: number
    onPress: () => void
  }) => (
  <Pressable onPress={onPress}>
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
  </Pressable>
)

export const ScrollViewListItem = memo(ScrollViewListItemComponent)

const styles = StyleSheet.create({
  container: {
    padding: 15,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flexWrap: 'nowrap',

    width: '100%',
  },
  text: {
    color: '#333',
    fontSize: 16,
    flexGrow: 1,
    flexShrink: 0,
  },
})

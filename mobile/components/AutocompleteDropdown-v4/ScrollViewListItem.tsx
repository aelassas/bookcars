import type { FC } from 'react'
import React, { memo, useMemo } from 'react'
import type { ViewProps } from 'react-native'
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native'
import diacriticless from './diacriticless'
import { theme } from './theme'

interface ScrollViewListItemProps {
  highlight: string
  title: string
  style?: ViewProps['style']
  onPress?: () => void
  ignoreAccents?: boolean
  numberOfLines?: number
}

export const ScrollViewListItem: FC<ScrollViewListItemProps> = memo(
  ({ highlight, title, style, onPress, ignoreAccents, numberOfLines = 2 }) => {
    const themeName = useColorScheme()
    const styles = useMemo(() => getStyles(themeName || 'light'), [themeName])

    const titleParts = useMemo(() => {
      let titleHighlighted = ''
      let titleStart = title
      let titleEnd = ''

      if (typeof title === 'string' && title?.length > 0 && highlight?.length > 0) {
        const highlightIn = ignoreAccents ? diacriticless(title?.toLowerCase()) : title?.toLowerCase()
        const highlightWhat = ignoreAccents ? diacriticless(highlight?.toLowerCase()) : highlight?.toLowerCase()

        const substrIndex = highlightIn?.indexOf(highlightWhat)
        if (substrIndex !== -1) {
          titleStart = title?.slice(0, substrIndex)
          titleHighlighted = title?.slice(substrIndex, substrIndex + highlight?.length)
          titleEnd = title?.slice(substrIndex + highlight?.length)
        }
      }

      return { titleHighlighted, titleStart, titleEnd }
    }, [highlight, ignoreAccents, title])

    return (
      <TouchableOpacity onPress={onPress}>
        <View style={styles.container}>
          <Text numberOfLines={numberOfLines}>
            <Text numberOfLines={1} style={{ ...styles.text, ...(style as object) }}>
              {titleParts.titleStart}
            </Text>
            <Text numberOfLines={1} style={{ ...styles.text, ...(style as object), ...styles.textBold }}>
              {titleParts.titleHighlighted}
            </Text>
            <Text numberOfLines={1} style={{ ...styles.text, ...(style as object) }}>
              {titleParts.titleEnd}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    )
  },
)

const getStyles = (themeName: 'light' | 'dark' = 'light') =>
  StyleSheet.create({
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
      color: theme[themeName].listItemTextColor,
      fontSize: 16,
      flexGrow: 1,
      flexShrink: 0,
    },
    textBold: {
      fontWeight: 'bold',
    },
  })

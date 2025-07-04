import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, Dimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import { AutocompleteDropdown, AutocompleteDropdownItem } from './AutocompleteDropdown-v4.3.1'

interface LocationSelectListProps {
  selectedItem?: string
  size?: 'small'
  style?: object
  backgroundColor?: string
  placeholderTextColor?: string
  label: string
  blur?: boolean
  close?: boolean
  text?: string,
  onSelectItem?: (selectedItem: string) => void
  onFetch?: () => void
  onChangeText?: (text: string) => void
  onFocus?: () => void
}

const LocationSelectList = ({
  selectedItem: __selectedItem,
  size,
  style,
  backgroundColor,
  placeholderTextColor = 'rgba(0, 0, 0, 0.6)',
  label,
  // blur,
  close,
  text: __text,
  onSelectItem,
  onFetch,
  onChangeText: listOnChangeText,
  onFocus
}: LocationSelectListProps) => {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AutocompleteDropdownItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string>()

  useEffect(() => {
    setSelectedItem(__selectedItem)
  }, [__selectedItem])

  useEffect(() => {
    const fetch = async () => {
      await fetchData(__text || '')
      setSelectedItem(__selectedItem)
    }
    if (__text) {
      fetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [__text])

  const _setSelectedItem = (_selectedItem?: string) => {
    setSelectedItem(_selectedItem)

    if (onSelectItem) {
      onSelectItem(_selectedItem as string)
    }
  }

  const onChangeText = async (text: string) => {
    await fetchData(text)
  }

  const fetchData = async (text: string) => {
    try {
      setLoading(true)
      const data = await LocationService.getLocations(text, 1, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }

      const _rows = _data.resultData.map((location) => ({
        id: location._id,
        title: location.name || '',
      }))
      setRows(_rows)
      if (onFetch) {
        onFetch()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const small = size === 'small'

  return (
    <View style={{ ...style, ...styles.container }}>
      <Text
        style={{
          display: selectedItem ? 'flex' : 'none',
          backgroundColor: backgroundColor ?? '#F5F5F5',
          color: 'rgba(0, 0, 0, 0.6)',
          fontSize: 12,
          fontWeight: '400',
          paddingRight: 5,
          paddingLeft: 5,
          marginLeft: 15,
          position: 'absolute',
          top: -8,
          zIndex: 1,
        }}
      >
        {label}
      </Text>
      <AutocompleteDropdown
        // blur={blur}
        initialValue={selectedItem || ''}
        loading={loading}
        useFilter={false} // set false to prevent rerender twice
        dataSet={rows}
        onSelectItem={(item) => {
          if (item) {
            _setSelectedItem(item.id)
          }
        }}
        onChangeText={(text: string) => {
          onChangeText(text)
          if (listOnChangeText) {
            listOnChangeText(text)
          }
        }}
        onClear={() => {
          _setSelectedItem(undefined)
        }}
        onFocus={() => {
          if (onFocus) {
            onFocus()
          }
        }}
        textInputProps={{
          placeholder: label || '',
          placeholderTextColor,
          autoCorrect: false,
          autoCapitalize: 'none',
          style: {
            borderRadius: 10,
            // paddingLeft: 15,
            fontSize: small ? 14 : 16,
          },
        }}
        rightButtonsContainerStyle={{
          right: 8,
          height: 30,
          alignSelf: 'center',
        }}
        inputContainerStyle={{
          backgroundColor: backgroundColor ?? '#F5F5F5',
          // color: 'rgba(0, 0, 0, 0.87)',
          borderColor: 'rgba(0, 0, 0, 0.23)',
          borderWidth: 1,
          borderRadius: 10,
        }}
        suggestionsListContainerStyle={{
          display: close ? 'none' : 'flex',
        }}
        renderItem={(item) => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="location-on" size={23} style={{ marginLeft: 5 }} />
            <Text
              style={{
                paddingTop: 15,
                paddingRight: 5,
                paddingBottom: 15,
                paddingLeft: 5,
              }}
            >
              {item.title}
            </Text>
          </View>
        )}
        inputHeight={small ? 37 : 55}
        showChevron={false}
        showClear={!!selectedItem}
        closeOnBlur
        clearOnFocus={false}
        closeOnSubmit
        EmptyResultComponent={<View></View>}
        debounce={200}
        suggestionsListMaxHeight={Dimensions.get('window').height * 0.3}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 480,
  },
})

export default LocationSelectList

import React, { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Keyboard, Platform, Pressable, View, TextInput, ScrollView } from 'react-native'
import { moderateScale, ScaledSheet } from 'react-native-size-matters'
import debounce from 'lodash.debounce'
import PropTypes from 'prop-types'
import { withFadeAnimation } from './HOC/withFadeAnimation'
import { NothingFound } from './NothingFound'
import { RightButton } from './RightButton'
import { ScrollViewListItem } from './ScrollViewListItem'
import * as helper from '@/common/helper'

export interface AutocompleteOption {
  id: string
  title: string
}

export const AutocompleteDropdown: any = memo(
  forwardRef((props: any, ref: any) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const [direction, setDirection] = useState(props.direction ?? 'down')
    const [isOpened, setIsOpened] = useState(false)
    const [isCleared, setIsCleared] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [dataSet, setDataSet] = useState(props.dataSet)
    const clearOnFocus = props.clearOnFocus !== false
    const inputHeight = props.inputHeight ?? moderateScale(40, 0.2)
    const suggestionsListMaxHeight = props.suggestionsListMaxHeight ?? moderateScale(200, 0.2)
    const position = props.position ?? 'absolute'
    const bottomOffset = props.bottomOffset ?? 0
    const ScrollViewComponent = props.ScrollViewComponent ?? ScrollView
    const InputComponent = props.InputComponent ?? TextInput

    const inputRef = useRef<typeof InputComponent>(null)
    const containerRef = useRef<View>(null)

    useEffect(() => {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
        setIsKeyboardVisible(true)
      })
      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        setIsKeyboardVisible(false)
      })

      return () => {
        keyboardDidHideListener.remove()
        keyboardDidShowListener.remove()
      }
    }, [])

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [inputRef]) // eslint-disable-line react-hooks/exhaustive-deps

    /** Set initial value */
    useEffect(() => {
      if (!Array.isArray(dataSet) || selectedItem) {
        // nothing to set or already setted
        return
      }

      let dataSetItem
      if (typeof props.initialValue === 'string') {
        dataSetItem = dataSet.find((el) => el.id === props.initialValue)
      } else if (typeof props.initialValue === 'object' && props.initialValue.id) {
        dataSetItem = dataSet.find((el) => el.id === props.initialValue.id)
      }

      if (dataSetItem) {
        setSelectedItem(dataSetItem)
      }
    }, [props.initialValue, dataSet]) // eslint-disable-line react-hooks/exhaustive-deps

    /** expose controller methods */
    useEffect(() => {
      if (typeof props.controller === 'function') {
        props.controller({ close, open, toggle, clear, setInputText, setItem })
      }
    }, [isOpened, props.controller]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      setDataSet(props.dataSet)
    }, [props.dataSet])

    useEffect(() => {
      if (selectedItem) {
        setSearchText(selectedItem.title ?? '')
      } else {
        setSearchText('')
      }

      if (typeof props.onSelectItem === 'function') {
        props.onSelectItem(selectedItem)
      }
    }, [selectedItem]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (typeof props.onOpenSuggestionsList === 'function') {
        props.onOpenSuggestionsList(isOpened)
      }
      // renew state on close
      if (!isOpened) {
        if (selectedItem && props.resetOnClose !== false) {
          setSearchText(selectedItem.title)
        }
      }
    }, [isOpened]) // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * For re-render list while typing and useFilter
     */
    useEffect(() => {
      if (props.useFilter !== false && Array.isArray(props.dataSet)) {
        setDataSet(props.dataSet.slice())
      }
    }, [searchText]) // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * props.blur
     */
    useEffect(() => {
      if (props.blur) {
        inputRef.current?.blur()
      }
    }, [props.blur])

    const _onSelectItem = useCallback((item: any) => {
      setSelectedItem(item)

      inputRef.current?.blur()
      setIsOpened(false)
    }, [])

    const calculateDirection = async () => {
      const [, positionY]: any = await new Promise((resolve) => {
        containerRef.current?.measureInWindow((...rect) => {
          resolve(rect)
        })
      })

      const screenHeight = Dimensions.get('window').height

      const lowestPointOfDropdown = positionY + inputHeight + suggestionsListMaxHeight + bottomOffset
      setDirection(lowestPointOfDropdown < screenHeight ? 'down' : 'up')
    }

    /** methods */
    const close = () => {
      setIsOpened(false)
    }

    const open = async () => {
      if (!props.direction) {
        await calculateDirection()
      }

      setIsOpened(true)
    }

    const toggle = () => {
      if (isOpened) {
        close()
      } else {
        open()
      }
    }

    const clear = () => {
      onClearPress()
    }

    const setInputText = (text: string) => {
      setSearchText(text)
    }

    const setItem = (item: any) => {
      setSelectedItem(item)
    }

    const ItemSeparatorComponent = props.ItemSeparatorComponent ?? <View style={{ height: 1, width: '100%', backgroundColor: '#ddd' }} />

    const renderItem = useCallback(
      (item: any, _searchText: string) => {
        let titleHighlighted = ''
        let titleStart = item.title
        let titleEnd = ''
        let substrIndex = 0
        if (props.useFilter !== false && typeof item.title === 'string' && item.title.length > 0 && _searchText.length > 0) {
          substrIndex = item.title.toLowerCase().indexOf(_searchText.toLowerCase())
          if (substrIndex !== -1) {
            titleStart = item.title.slice(0, substrIndex)
            titleHighlighted = item.title.slice(substrIndex, substrIndex + _searchText.length)
            titleEnd = item.title.slice(substrIndex + _searchText.length)
          }
        }

        if (substrIndex === -1) {
          return null
        }

        if (typeof props.renderItem === 'function') {
          const EL = props.renderItem(item, _searchText)
          return (
            <Pressable
              onPress={() => {
                _onSelectItem(item)
              }}
            >
              {EL}
            </Pressable>
          )
        }

        const EL = withFadeAnimation(
          () => (
            <ScrollViewListItem
              {...{ titleHighlighted, titleStart, titleEnd }}
              style={props.suggestionsListTextStyle}
              onPress={() => {
                _onSelectItem(item)
              }}
            />
          ),
          {},
        )

        return <EL />
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.renderItem],
    )

    const scrollContent = useMemo(() => {
      if (!Array.isArray(dataSet)) {
        return null
      }
      const content: any[] = []
      const itemsCount = dataSet.length

      dataSet.forEach((item: AutocompleteOption, i) => {
        const listItem = renderItem(item, searchText)

        if (listItem) {
          content.push(
            <View key={item.id}>
              {content.length > 0 && i < itemsCount && ItemSeparatorComponent}
              {listItem}
            </View>
          )
        }
      })
      return content
    }, [dataSet]) // eslint-disable-line react-hooks/exhaustive-deps
    // don't use searchText here because it will rerender list twice every time

    const onClearPress = useCallback(() => {
      setSearchText('')
      setSelectedItem(null)
      // setIsOpened(false)
      // inputRef.current?.blur()
      setIsOpened(false)
      setIsCleared(true)
      if (!isKeyboardVisible) {
        inputRef.current?.focus()
      }
      if (typeof props.onClear === 'function') {
        props.onClear()
      }
    }, [props.onClear, isKeyboardVisible]) // eslint-disable-line react-hooks/exhaustive-deps

    const debouncer = debounce((text) => {
      if (typeof props.onChangeText === 'function') {
        props.onChangeText(text)
      }
    }, props.debounce ?? 0)

    const debouncedEvent = useCallback(
      (text: string) => debouncer(text), // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.onChangeText],
    )

    // const debouncedEvent = useCallback(
    //   debounce(text => {
    //     if (typeof props.onChangeText === 'function') {
    //       props.onChangeText(text)
    //     }
    //   }, props.debounce ?? 0),
    //   [props.onChangeText]) // eslint-disable-line react-hooks/exhaustive-deps

    const onChangeText = useCallback((text: string) => {
      setIsOpened(true)
      setSearchText(text)
      debouncedEvent(text)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const onChevronPress = useCallback(() => {
      toggle()
      Keyboard.dismiss()
    }, [isOpened]) // eslint-disable-line react-hooks/exhaustive-deps

    const onFocus = useCallback(
      (e: any) => {
        if (clearOnFocus) {
          setSearchText('')
        }
        if (typeof props.onFocus === 'function') {
          props.onFocus(e)
        }
        if (!isCleared) {
          open()
        }
        setIsCleared(false)
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [dataSet, clearOnFocus, props.onFocus, isCleared],
    )

    const onBlur = useCallback(
      (e: any) => {
        if (props.closeOnBlur) {
          close()
        }
        if (typeof props.onBlur === 'function') {
          props.onBlur(e)
        }
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.closeOnBlur, props.onBlur],
    )

    const onSubmit = useCallback(
      (e: any) => {
        inputRef.current?.blur()
        if (props.closeOnSubmit) {
          close()
        }

        if (typeof props.onSubmit === 'function') {
          props.onSubmit(e)
        }
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.closeOnSubmit, props.onSubmit],
    )

    return (
      <View style={[
        styles.container,
        props.containerStyle,
        Platform.select({ ios: { zIndex: 1 } }),
      ]}>
        <View ref={containerRef} onLayout={() => { }} style={[styles.inputContainerStyle, props.inputContainerStyle]}>
          <InputComponent
            ref={inputRef}
            value={searchText}
            onChangeText={onChangeText}
            autoCorrect={false}
            onBlur={onBlur}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholderTextColor="#d0d4dc"
            {...props.textInputProps}
            style={{
              ...(styles.Input as object),
              height: inputHeight,
              ...(props.textInputProps || {}).style,
            }}
          />
          <RightButton
            isOpened={isOpened}
            inputHeight={inputHeight}
            onClearPress={onClearPress}
            onChevronPress={onChevronPress}
            showChevron={props.showChevron ?? true}
            showClear={props.showClear || searchText !== ''}
            loading={props.loading}
            buttonsContainerStyle={props.rightButtonsContainerStyle}
            ChevronIconComponent={props.ChevronIconComponent}
            ClearIconComponent={props.ClearIconComponent}
          />
        </View>

        {isOpened && searchText !== '' && Array.isArray(dataSet) && (
          <View
            style={[{
              ...(styles.listContainer as object),
              ...props.suggestionsListContainerStyle,
              flex: 1,
            },
            Platform.select({
              android: {
                position,
                ...(position === 'relative'
                  ? { marginTop: 5 }
                  : {
                    [direction === 'down' ? 'top' : 'bottom']: inputHeight + 5,
                  }),
              }
            })
            ]}
          >
            <ScrollViewComponent
              keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
              automaticallyAdjustKeyboardInsets
              nestedScrollEnabled

              // extraHeight={135}
              // extraScrollHeight={70}
              // scrollEnabled
              // enabledOnAndroid
              // automaticallyAdjustContentInsets

              style={{
                maxHeight: suggestionsListMaxHeight,
                zIndex: 999,
                elevation: 999,
              }}
            >
              <View>
                {
                  scrollContent?.length && scrollContent?.length > 0
                    ? scrollContent
                    : !!searchText && (props.EmptyResultComponent ?? <NothingFound emptyResultText={props.emptyResultText} />)
                }
              </View>
            </ScrollViewComponent>
          </View>
        )}
      </View>
    )
  }),
)

AutocompleteDropdown.propTypes = {
  dataSet: PropTypes.array,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  loading: PropTypes.bool,
  useFilter: PropTypes.bool,
  showClear: PropTypes.bool,
  showChevron: PropTypes.bool,
  closeOnBlur: PropTypes.bool,
  closeOnSubmit: PropTypes.bool,
  clearOnFocus: PropTypes.bool,
  resetOnClose: PropTypes.bool,
  debounce: PropTypes.number,
  direction: PropTypes.oneOf(['down', 'up']),
  position: PropTypes.oneOf(['absolute', 'relative']),
  suggestionsListMaxHeight: PropTypes.number,
  bottomOffset: PropTypes.number,
  onChangeText: PropTypes.func,
  onSelectItem: PropTypes.func,
  onOpenSuggestionsList: PropTypes.func,
  onClear: PropTypes.func,
  onSubmit: PropTypes.func,
  onBlur: PropTypes.func,
  controller: PropTypes.func,
  containerStyle: PropTypes.object,
  rightButtonsContainerStyle: PropTypes.object,
  suggestionsListContainerStyle: PropTypes.object,
  suggestionsListTextStyle: PropTypes.object,
  ChevronIconComponent: PropTypes.element,
  ClearIconComponent: PropTypes.element,
  ScrollViewComponent: PropTypes.elementType,
  EmptyResultComponent: PropTypes.element,
  emptyResultText: PropTypes.string,
}

const styles = ScaledSheet.create({
  container: {
    marginVertical: 2,
  },
  inputContainerStyle: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#e5ecf2',
    borderRadius: 5,
  },
  Input: {
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
    paddingHorizontal: 15,
    // marginHorizontal: 15,
    fontSize: 16,
  },
  listContainer: {
    backgroundColor: '#fff',
    width: '100%',
    zIndex: 9,
    borderRadius: 5,
    shadowColor: '#00000099',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15.46,
    elevation: 20,
  },
})

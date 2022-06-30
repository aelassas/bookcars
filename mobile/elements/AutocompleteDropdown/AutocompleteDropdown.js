import debounce from 'lodash.debounce'
import PropTypes from 'prop-types'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Dimensions, Keyboard, Platform, ScrollView, Pressable, View, TextInput } from 'react-native'
import { moderateScale, ScaledSheet } from 'react-native-size-matters'
import { withFadeAnimation } from './HOC/withFadeAnimation'
import { NothingFound } from './NothingFound'
import { RightButton } from './RightButton'
import { ScrollViewListItem } from './ScrollViewListItem'
// import TextInput from '../TextInput'

export const AutocompleteDropdown = memo(
  forwardRef((props, ref) => {
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const inputRef = useRef(null)
    const containerRef = useRef(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [direction, setDirection] = useState(props.direction ?? 'down')
    const [isOpened, setIsOpened] = useState(false)
    const [isCleared, setIsCleared] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [dataSet, setDataSet] = useState(props.dataSet)
    const clearOnFocus = props.clearOnFocus === false ? false : true
    const inputHeight = props.inputHeight ?? moderateScale(40, 0.2)
    const suggestionsListMaxHeight = props.suggestionsListMaxHeight ?? moderateScale(200, 0.2)
    const position = props.position ?? 'absolute'
    const bottomOffset = props.bottomOffset ?? 0
    const ScrollViewComponent = props.ScrollViewComponent ?? ScrollView
    const InputComponent = props.InputComponent ?? TextInput

    useEffect(() => {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          setIsKeyboardVisible(true);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setIsKeyboardVisible(false);
        }
      );

      return () => {
        keyboardDidHideListener.remove();
        keyboardDidShowListener.remove();
      };
    }, []);

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [inputRef])

    /** Set initial value */
    useEffect(() => {
      if (!Array.isArray(dataSet) || selectedItem) {
        // nothing to set or already setted
        return
      }

      let dataSetItem
      if (typeof props.initialValue === 'string') {
        dataSetItem = dataSet.find(el => el.id === props.initialValue)
      } else if (typeof props.initialValue === 'object' && props.initialValue.id) {
        dataSetItem = dataSet.find(el => el.id === props.initialValue.id)
      }

      if (dataSetItem) {
        setSelectedItem(dataSetItem)
      }
    }, [])

    /** expose controller methods */
    useEffect(() => {
      if (typeof props.controller === 'function') {
        props.controller({ close, open, toggle, clear, setInputText, setItem })
      }
    }, [isOpened, props.controller])

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
    }, [selectedItem])

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
    }, [isOpened])

    /**
     * For re-render list while typing and useFilter
     */
    useEffect(() => {
      if (props.useFilter !== false && Array.isArray(props.dataSet)) {
        setDataSet(props.dataSet.slice())
      }
    }, [searchText])


    /**
     * props.blur
     */
    useEffect(() => {
      if (props.blur) {
        inputRef.current.blur()
      }
    }, [props.blur])

    const _onSelectItem = useCallback(item => {
      setSelectedItem(item)

      inputRef.current.blur()
      setIsOpened(false)
    }, [])

    const calculateDirection = async () => {
      const [, positionY] = await new Promise(resolve =>
        containerRef.current.measureInWindow((...rect) => {
          resolve(rect)
        })
      )

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
      isOpened ? close() : open()
    }

    const clear = () => {
      onClearPress()
    }

    const setInputText = text => {
      setSearchText(text)
    }

    const setItem = item => {
      setSelectedItem(item)
    }

    const ItemSeparatorComponent = props.ItemSeparatorComponent ?? (
      <View style={{ height: 1, width: '100%', backgroundColor: '#ddd' }} />
    )

    const renderItem = useCallback(
      (item, searchText) => {
        let titleHighlighted = ''
        let titleStart = item.title
        let titleEnd = ''
        let substrIndex = 0
        if (
          props.useFilter !== false &&
          typeof item.title === 'string' &&
          item.title.length > 0 &&
          searchText.length > 0
        ) {
          substrIndex = item.title.toLowerCase().indexOf(searchText.toLowerCase())
          if (substrIndex !== -1) {
            titleStart = item.title.slice(0, substrIndex)
            titleHighlighted = item.title.slice(substrIndex, substrIndex + searchText.length)
            titleEnd = item.title.slice(substrIndex + searchText.length)
          }
        }

        if (substrIndex === -1) {
          return null
        }

        if (typeof props.renderItem === 'function') {
          const EL = props.renderItem(item, searchText)
          return <Pressable onPress={() => {
            _onSelectItem(item)
          }}>{EL}</Pressable>
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
          {}
        )

        return <EL />
      },
      [props.renderItem]
    )

    const scrollContent = useMemo(() => {

      if (!Array.isArray(dataSet)) {
        return null
      }
      const content = []
      const itemsCount = dataSet.length

      dataSet.forEach((item, i) => {
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
    }, [dataSet]) // don't use searchText here because it will rerender list twice every time

    const onClearPress = useCallback(() => {
      setSearchText('')
      setSelectedItem(null)
      // setIsOpened(false)
      // inputRef.current.blur()
      setIsOpened(false)
      setIsCleared(true)
      if (!isKeyboardVisible) {
        inputRef.current.focus()
      }
      if (typeof props.onClear === 'function') {
        props.onClear()
      }
    }, [props.onClear, isKeyboardVisible])

    const debouncedEvent = useCallback(
      debounce(text => {
        if (typeof props.onChangeText === 'function') {
          props.onChangeText(text)
        }
      }, props.debounce ?? 0),
      [props.onChangeText]
    )

    const onChangeText = useCallback(text => {
      setIsOpened(true)
      setSearchText(text)
      debouncedEvent(text)
    }, [])

    const onChevronPress = useCallback(() => {
      toggle()
      Keyboard.dismiss()
    }, [isOpened])

    const onFocus = useCallback(
      e => {
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
      },
      [dataSet, clearOnFocus, props.onFocus, isCleared]
    )

    const onBlur = useCallback(
      e => {
        if (props.closeOnBlur) {
          close()
        }
        if (typeof props.onBlur === 'function') {
          props.onBlur(e)
        }
      },
      [props.closeOnBlur, props.onBlur]
    )

    const onSubmit = useCallback(
      e => {
        inputRef.current.blur()
        if (props.closeOnSubmit) {
          close()
        }

        if (typeof props.onSubmit === 'function') {
          props.onSubmit(e)
        }
      },
      [props.closeOnSubmit, props.onSubmit]
    )

    return (
      <View
        style={[styles.container, props.containerStyle, Platform.select({ ios: { zIndex: 1 } })]}
      >
        {/* it's necessary use onLayout here for Androd (bug?) */}
        <View
          ref={containerRef}
          onLayout={_ => { }}
          style={[styles.inputContainerStyle, props.inputContainerStyle]}
        >
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
              ...styles.Input,
              height: inputHeight,
              ...(props.textInputProps ?? {}).style
            }}
          />
          <RightButton
            isOpened={isOpened}
            inputHeight={inputHeight}
            onClearPress={onClearPress}
            onChevronPress={onChevronPress}
            showChevron={props.showChevron ?? true}
            showClear={(props.showClear || searchText !== '')}
            loading={props.loading}
            buttonsContainerStyle={props.rightButtonsContainerStyle}
            ChevronIconComponent={props.ChevronIconComponent}
            ClearIconComponent={props.ClearIconComponent}
          />
        </View>

        {isOpened && searchText !== '' && Array.isArray(dataSet) && (
          <View
            style={{
              ...styles.listContainer,
              position,
              ...(position === 'relative'
                ? { marginTop: 5 }
                : {
                  [direction === 'down' ? 'top' : 'bottom']: inputHeight + 5
                }),
              ...props.suggestionsListContainerStyle,
              flex: 1
            }}>
            {/* <ScrollViewComponent
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: suggestionsListMaxHeight }}
              nestedScrollEnabled={true}
              onScrollBeginDrag={Keyboard.dismiss}
            > */}
            <ScrollViewComponent
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={{ maxHeight: suggestionsListMaxHeight, zIndex: 999, elevation: 999 }}
            >
              <View>
                {scrollContent.length > 0
                  ? scrollContent
                  : !!searchText &&
                  (props.EmptyResultComponent ?? (
                    <NothingFound emptyResultText={props.emptyResultText} />
                  ))}
              </View>
            </ScrollViewComponent>
          </View>
        )}
      </View>
    )
  })
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
  emptyResultText: PropTypes.string
}

const styles = ScaledSheet.create({
  container: {
    marginVertical: 2
  },
  inputContainerStyle: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#e5ecf2',
    borderRadius: 5
  },
  Input: {
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
    paddingHorizontal: 13,
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
      height: 12
    },
    shadowOpacity: 0.3,
    shadowRadius: 15.46,
    elevation: 20
  }
})

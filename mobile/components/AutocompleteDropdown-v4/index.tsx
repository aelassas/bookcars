import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react'
import debounce from 'lodash.debounce'
import type {
  GestureResponderEvent,
  ListRenderItem,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TextInputSubmitEditingEventData,
} from 'react-native'
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'
import { moderateScale, ScaledSheet } from 'react-native-size-matters'
import { Dropdown } from './Dropdown'
import { NothingFound } from './NothingFound'
import { RightButton } from './RightButton'
import { ScrollViewListItem } from './ScrollViewListItem'
import { AutocompleteDropdownContext, AutocompleteDropdownContextProvider } from './AutocompleteDropdownContext'
import { useKeyboardHeight } from './useKeyboardHeight'
import diacriticless from './diacriticless'
import { theme } from './theme'
import type { IAutocompleteDropdownProps, AutocompleteDropdownItem } from './types'

export * from './types'
export { AutocompleteDropdownContextProvider }

export const AutocompleteDropdown = memo<
  React.ForwardRefExoticComponent<Omit<IAutocompleteDropdownProps, 'ref'> & React.RefAttributes<unknown>>
>(
  forwardRef((props: IAutocompleteDropdownProps, ref) => {
    const {
      dataSet: dataSetProp,
      initialValue: initialValueProp,
      clearOnFocus = true,
      caseSensitive = false,
      ignoreAccents = true,
      trimSearchText = true,
      editable = true,
      matchFrom,
      inputHeight = moderateScale(40, 0.2),
      suggestionsListMaxHeight = moderateScale(200, 0.2),
      // bottomOffset = 0,
      direction: directionProp,
      controller,
      onSelectItem: onSelectItemProp,
      onOpenSuggestionsList: onOpenSuggestionsListProp,
      useFilter,
      renderItem: customRenderItem,
      EmptyResultComponent,
      emptyResultText,
      // onClear,
      onChangeText: onTextChange,
      debounce: debounceDelay = 0,
      onChevronPress: onChevronPressProp,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      onSubmit: onSubmitProp,
      closeOnSubmit,
      loading: loadingProp,
      LeftComponent,
      textInputProps,
      showChevron,
      showClear,
      rightButtonsContainerStyle,
      ChevronIconComponent,
      ClearIconComponent,
      RightIconComponent,
      onRightIconComponentPress,
      containerStyle,
      inputContainerStyle,
      suggestionsListTextStyle,
    } = props
    const InputComponent = (props.InputComponent as typeof TextInput) || TextInput
    const inputRef = useRef<TextInput>(null)
    const containerRef = useRef<View>(null)
    const [searchText, setSearchText] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(loadingProp)
    const [selectedItem, setSelectedItem] = useState<AutocompleteDropdownItem | null>(null)
    const [isOpened, setIsOpened] = useState(false)
    const initialDataSetRef = useRef<AutocompleteDropdownItem[] | null>(dataSetProp)
    // const initialValueRef = useRef(initialValueProp)
    const [dataSet, setDataSet] = useState(dataSetProp)
    const matchFromStart = matchFrom === 'start'
    const kbHeight = useKeyboardHeight()
    const {
      content,
      setContent,
      activeInputContainerRef,
      controllerRef,
      direction = directionProp,
      setDirection,
    } = useContext(AutocompleteDropdownContext)
    const themeName = useColorScheme() || 'light'
    const styles = useMemo(() => getStyles(themeName), [themeName])
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

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

    useEffect(() => {
      setLoading(loadingProp)
    }, [loadingProp])

    const calculateDirection = useCallback(async () => {
      const [, positionY] = await new Promise<[x: number, y: number, width: number, height: number]>((resolve) => {
        containerRef.current?.measureInWindow((...rect) => resolve(rect))
      },)

      const screenHeight = Dimensions.get('window').height
      setDirection((screenHeight - kbHeight) / 2 > positionY ? 'down' : 'up')
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 1)
      })
    }, [kbHeight, setDirection])

    const onClearPress = useCallback(() => {
      setSearchText('')
      setSelectedItem(null)
      setDataSet(null)
      // setIsOpened(false)
      // inputRef.current?.blur()
      setIsOpened(false)
      // setIsCleared(true)
      if (!isKeyboardVisible) {
        inputRef.current?.focus()
      }
      if (typeof props.onClear === 'function') {
        props.onClear()
      }
    }, [props.onClear, isKeyboardVisible]) // eslint-disable-line react-hooks/exhaustive-deps
    /** methods */
    const close = useCallback(() => {
      setIsOpened(false)
      setContent(undefined)
    }, [setContent])

    const blur = useCallback(() => {
      inputRef.current?.blur()
    }, [])

    // useEffect(() => {
    //   if (kbHeight && !direction) {
    //     calculateDirection()
    //   }
    // }, [kbHeight, direction])

    const open = useCallback(async () => {
      if (directionProp) {
        setDirection(directionProp)
      } else {
        await calculateDirection()
      }

      setTimeout(() => {
        setIsOpened(true)
      }, 0)
    }, [calculateDirection, directionProp, setDirection])

    const toggle = useCallback(() => {
      if (isOpened) {
        close()
      } else {
        open()
      }
    }, [close, isOpened, open])

    const clear = useCallback(() => {
      onClearPress()
    }, [onClearPress])

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [ref])

    /** Set initial value */
    // useEffect(() => {
    //   const initialDataSet = initialDataSetRef.current
    //   const initialValue = initialValueRef.current
    //   if (!Array.isArray(initialDataSet)) {
    //     // nothing to set or already setted
    //     return
    //   }

    //   let dataSetItem: AutocompleteDropdownItem | undefined
    //   if (typeof initialValue === 'string') {
    //     dataSetItem = initialDataSet.find((el) => el.id === initialValue)
    //   } else if (typeof initialValue === 'object' && initialValue.id) {
    //     dataSetItem = initialDataSet.find((el) => el.id === initialValue?.id)
    //   }

    //   if (dataSetItem) {
    //     setSelectedItem(dataSetItem)
    //   }
    // }, [])

    /** Set initial value */
    useEffect(() => {
      if (!Array.isArray(dataSet) || selectedItem) {
        // nothing to set or already setted
        return
      }

      let dataSetItem
      if (typeof initialValueProp === 'string') {
        dataSetItem = dataSet.find((el) => el.id === initialValueProp)
      } else if (typeof initialValueProp === 'object' && initialValueProp.id) {
        dataSetItem = dataSet.find((el) => el.id === initialValueProp.id)
      }

      if (dataSetItem) {
        setSelectedItem(dataSetItem)
      }
    }, [initialValueProp, dataSet]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => {
      setContent(undefined)
      setIsOpened(false)
    }, [setContent])

    const setInputText = useCallback((text: string) => {
      setSearchText(text)
    }, [])

    const setItem = useCallback((item: AutocompleteDropdownItem | null) => {
      setSelectedItem(item)
    }, [])

    /** expose controller methods */
    useEffect(() => {
      const methods = controllerRef ? { close, blur, open, toggle, clear, setInputText, setItem } : null
      if (controllerRef) {
        controllerRef.current = methods
      }
      if (typeof controller === 'function') {
        controller(methods)
      } else if (controller) {
        controller.current = methods
      }
    }, [blur, clear, close, controller, controllerRef, open, setInputText, setItem, toggle])

    useEffect(() => {
      if (selectedItem) {
        setInputValue(selectedItem.title ?? '')
      } else {
        setInputValue('')
      }
    }, [selectedItem])

    useEffect(() => {
      setInputValue(searchText)
    }, [searchText])

    useEffect(() => {
      if (typeof onSelectItemProp === 'function') {
        onSelectItemProp(selectedItem)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem])

    useEffect(() => {
      if (typeof onOpenSuggestionsListProp === 'function') {
        onOpenSuggestionsListProp(isOpened)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpened])

    useEffect(() => {
      // renew state on close
      if (!isOpened && selectedItem && !loading && !inputRef.current?.isFocused()) {
        setInputValue(selectedItem.title || '')
      }
    }, [isOpened, loading, searchText, selectedItem])

    const _onSelectItem = useCallback((item: AutocompleteDropdownItem) => {
      setSelectedItem(item)
      inputRef.current?.blur()
      setIsOpened(false)
      setDataSet((prev) => prev?.filter((i) => i.id === item.id) || null)
    }, [])

    useEffect(() => {
      initialDataSetRef.current = dataSetProp
      setDataSet(dataSetProp)
    }, [dataSetProp])

    useEffect(() => {
      const initialDataSet = initialDataSetRef.current
      if (!searchText?.length) {
        // setDataSet(initialDataSet)
        setDataSet(null)
        setIsOpened(false)
        return
      }

      if (!Array.isArray(initialDataSet) || useFilter === false) {
        return
      }

      let findWhat = caseSensitive ? searchText : searchText.toLowerCase()

      if (ignoreAccents) {
        findWhat = diacriticless(findWhat)
      }

      if (trimSearchText) {
        findWhat = findWhat.trim()
      }

      const newSet = initialDataSet.filter((item: AutocompleteDropdownItem) => {
        const titleStr = item.title || ''
        const title = caseSensitive ? titleStr : titleStr.toLowerCase()
        const findWhere = ignoreAccents ? diacriticless(title) : title

        if (matchFromStart) {
          return typeof item.title === 'string' && findWhere.startsWith(findWhat)
        }
        return typeof item.title === 'string' && findWhere.indexOf(findWhat) !== -1
      })

      setDataSet(newSet)
    }, [ignoreAccents, matchFromStart, caseSensitive, searchText, trimSearchText, useFilter])

    const renderItem: ListRenderItem<AutocompleteDropdownItem> = useCallback(
      ({ item }) => {
        if (typeof customRenderItem === 'function') {
          const EL = customRenderItem(item, searchText)
          return <TouchableOpacity onPress={() => _onSelectItem(item)}>{EL}</TouchableOpacity>
        }

        return (
          <ScrollViewListItem
            key={item.id}
            title={item.title || ''}
            highlight={searchText}
            style={suggestionsListTextStyle}
            onPress={() => _onSelectItem(item)}
            ignoreAccents={ignoreAccents}
          />
        )
      },
      [_onSelectItem, customRenderItem, ignoreAccents, searchText, suggestionsListTextStyle],
    )

    const ListEmptyComponent = useMemo(() => EmptyResultComponent ?? <NothingFound emptyResultText={emptyResultText} />, [EmptyResultComponent, emptyResultText])

    const debouncedEvent = useMemo(
      () =>
        debounce((text: string) => {
          if (typeof onTextChange === 'function') {
            onTextChange(text)
          }
          setLoading(false)
        }, debounceDelay),
      [debounceDelay, onTextChange],
    )

    const onChangeText = useCallback(
      (text: string) => {
        setSearchText(text)
        setInputValue(text)
        setLoading(true)
        debouncedEvent(text)
      },
      [debouncedEvent],
    )

    const onChevronPress = useCallback(() => {
      toggle()
      Keyboard.dismiss()

      if (typeof onChevronPressProp === 'function') {
        onChevronPressProp()
      }
    }, [onChevronPressProp, toggle])

    const onFocus = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (clearOnFocus) {
          setSearchText('')
          setInputValue('')
        }
        if (typeof onFocusProp === 'function') {
          onFocusProp(e)
        }
        open()
      },
      [clearOnFocus, onFocusProp, open],
    )

    const onBlur = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (typeof onBlurProp === 'function') {
          onBlurProp(e)
        }
      },
      [onBlurProp],
    )

    const onSubmit = useCallback(
      (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
        inputRef.current?.blur()
        if (closeOnSubmit) {
          close()
        }

        if (typeof onSubmitProp === 'function') {
          onSubmitProp(e)
        }
      },
      [close, closeOnSubmit, onSubmitProp],
    )

    const onPressOut = useCallback(
       
      (e: GestureResponderEvent) => {
        if (editable) {
          inputRef?.current?.focus()
        } else {
          toggle()
        }
      },
      [editable, toggle],
    )

     
    useEffect(() => {
      if ((!content && !inputRef.current?.isFocused()) || loading) {
        const db = debounce(() => {
          setIsOpened(false)
        }, 100)
        db()
        return () => {
          db.cancel()
        }
      }
    }, [content, loading])

    useEffect(() => {
      // searchTextRef
      if (searchText && inputRef.current?.isFocused() && !loading) {
        setIsOpened(true)
      }
    }, [loading, searchText])

    useEffect(() => {
      if (isOpened && Array.isArray(dataSet)) {
        if (activeInputContainerRef) {
          activeInputContainerRef.current = containerRef.current
        }

        setContent(
          <Dropdown
            {...{
              ...props,
              direction,
              inputHeight,
              dataSet,
              suggestionsListMaxHeight,
              renderItem,
              ListEmptyComponent,
            }}
          />,
        )
      } else {
        setContent(undefined)
      }
    }, [
      ListEmptyComponent,
      activeInputContainerRef,
      dataSet,
      direction,
      inputHeight,
      isOpened,
      props,
      renderItem,
      setContent,
      suggestionsListMaxHeight,
    ])

    return (
      <View
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => {
          e.stopPropagation()
        }}
        style={[styles.container, containerStyle]}>
        <View
          ref={containerRef}
          onLayout={() => { }} // it's necessary use onLayout here for Androd (bug?)
          style={[styles.inputContainerStyle, inputContainerStyle]}>
          {LeftComponent}
          <Pressable
            style={styles.pressable}
            pointerEvents={Platform.select({ ios: 'box-only', default: 'auto' })}
            onPressOut={onPressOut}>
            <InputComponent
              ref={inputRef}
              value={inputValue}
              onChangeText={onChangeText}
              autoCorrect={false}
              editable={editable}
              onBlur={onBlur}
              onFocus={onFocus}
              onSubmitEditing={onSubmit}
              placeholderTextColor={theme[themeName].inputPlaceholderColor}
              {...textInputProps}
              style={[styles.input, { height: inputHeight }, (textInputProps ?? {}).style]}
            />
          </Pressable>
          <RightButton
            isOpened={isOpened}
            inputHeight={inputHeight}
            onClearPress={onClearPress}
            onChevronPress={onChevronPress}
            showChevron={showChevron ?? true}
            showClear={showClear || (!!searchText || !!selectedItem)}
            loading={loading}
            buttonsContainerStyle={rightButtonsContainerStyle}
            ChevronIconComponent={ChevronIconComponent}
            ClearIconComponent={ClearIconComponent}
            RightIconComponent={RightIconComponent}
            onRightIconComponentPress={onRightIconComponentPress}
          />
        </View>
      </View>
    )
  }),
)

const getStyles = (themeName: 'light' | 'dark' = 'light') =>
  ScaledSheet.create({
    container: {
      marginVertical: 2,
    },
    inputContainerStyle: {
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: theme[themeName].inputBackgroundColor,
      borderRadius: 5,
      overflow: 'hidden',
    },
    input: {
      flexGrow: 1,
      flexShrink: 1,
      overflow: 'hidden',
      paddingHorizontal: 13,
      fontSize: 16,
      color: theme[themeName].inputTextColor,
    },
    pressable: {
      flexGrow: 1,
      flexShrink: 1,
    },
  })

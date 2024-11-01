import React, { useCallback, useRef, useState, useEffect } from 'react'
import type { SetStateAction, Dispatch, FC, ReactElement, MutableRefObject } from 'react'
import type { LayoutChangeEvent, ViewProps } from 'react-native'
import { Platform, StyleSheet, View } from 'react-native'
import type { IAutocompleteDropdownRef } from './types'

export interface IAutocompleteDropdownContext {
  content?: ReactElement
  setContent: Dispatch<SetStateAction<ReactElement | undefined>>
  direction?: 'up' | 'down'
  setDirection: Dispatch<SetStateAction<IAutocompleteDropdownContext['direction']>>
  activeInputContainerRef?: MutableRefObject<View | null>
  controllerRef?: MutableRefObject<IAutocompleteDropdownRef | null>
}

export interface IAutocompleteDropdownContextProviderProps {
  headerOffset?: number
  children: React.ReactNode
}

export const AutocompleteDropdownContext = React.createContext<IAutocompleteDropdownContext>({
  content: undefined,
  setContent: () => null,
  direction: undefined,
  setDirection: () => null,
  activeInputContainerRef: undefined,
  controllerRef: undefined,
})

export const AutocompleteDropdownContextProvider: FC<IAutocompleteDropdownContextProviderProps> = ({
  headerOffset = 0,
  children,
}) => {
  const [content, setContent] = useState<IAutocompleteDropdownContext['content']>()
  const [direction, setDirection] = useState<IAutocompleteDropdownContext['direction']>(undefined)
  const [show, setShow] = useState(false)
  const [dropdownHeight, setDropdownHeight] = useState(0)
  const [inputMeasurements, setInputMeasurements] = useState<
    { x: number; y: number; width: number; height: number } | undefined
  >()
  const [opacity, setOpacity] = useState(0)
  const [contentStyles, setContentStyles] = useState<{ top: number; left: number; width?: number } | undefined>(
    undefined,
  )
  const activeInputContainerRef = useRef<View>(null)
  const controllerRef = useRef<IAutocompleteDropdownRef | null>(null)
  const positionTrackingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!inputMeasurements?.height) {
      setOpacity(0)
      return
    }

    if (dropdownHeight && direction === 'up') {
      setContentStyles({
        // top: inputMeasurements.y - dropdownHeight - 5 - headerOffset,
        top: inputMeasurements.y - dropdownHeight - Platform.select({ android: 40, ios: 70 })! - headerOffset,
        left: inputMeasurements.x,
        width: inputMeasurements.width,
      })
      setOpacity(1)
    } else if (direction === 'down') {
      setContentStyles({
        // top: inputMeasurements.y + inputMeasurements.height + 10 + headerOffset,
        top: inputMeasurements.y + inputMeasurements.height - Platform.select({ android: 30, ios: 50 })! + headerOffset,
        left: inputMeasurements.x,
        width: inputMeasurements.width,
      })
      setOpacity(1)
    }
  }, [
    direction,
    dropdownHeight,
    headerOffset,
    inputMeasurements?.height,
    inputMeasurements?.width,
    inputMeasurements?.x,
    inputMeasurements?.y,
  ])

  useEffect(() => {
    if (content) {
      activeInputContainerRef?.current?.measure((x, y, width, height, pageX, pageY) => {
        setInputMeasurements({ x: pageX, y: pageY, width, height })
        setShow(true)
      })
    } else {
      setInputMeasurements(undefined)
      setDropdownHeight(0)
      setOpacity(0)
      setContentStyles(undefined)
      setShow(false)
    }
  }, [content])

  useEffect(() => {
    if (show && !!opacity) {
      positionTrackingIntervalRef.current = setInterval(() => {
        requestAnimationFrame(() => {
          if (activeInputContainerRef?.current) {
            activeInputContainerRef?.current?.measure((_x, _y, width, height, x, y) => {
              setInputMeasurements((prev) =>
                (JSON.stringify(prev) === JSON.stringify({ x, y, width, height }) ? prev : { x, y, width, height }),)
            })
          }
        })
      }, 16)
    } else {
      clearInterval(positionTrackingIntervalRef.current)
    }

    return () => {
      clearInterval(positionTrackingIntervalRef.current)
    }
  }, [opacity, show])

  const onLayout: ViewProps['onLayout'] = useCallback((e: LayoutChangeEvent) => {
    setDropdownHeight(e.nativeEvent.layout.height)
  }, [])

  return (
    <AutocompleteDropdownContext.Provider
      value={{ content, setContent, activeInputContainerRef, direction, setDirection, controllerRef }}>
      <View
        style={styles.clickOutsideHandlerArea}
        onTouchEnd={() => {
          controllerRef.current?.close()
          controllerRef.current?.blur()
        }}>
        {children}
      </View>
      {!!content && show && (
        <View
          onLayout={onLayout}
          style={{
            ...styles.wrapper,
            opacity,
            ...contentStyles,
          }}>
          {content}
        </View>
      )}
    </AutocompleteDropdownContext.Provider>
  )
}

const styles = StyleSheet.create({
  clickOutsideHandlerArea: {
    flex: 1,
  },
  wrapper: {
    position: 'absolute',
  },
})

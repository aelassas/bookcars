import React, { useCallback, useRef, useState, useEffect } from 'react'
import type { SetStateAction, Dispatch, FC, ReactElement, MutableRefObject } from 'react'
import type { LayoutChangeEvent, ViewProps } from 'react-native'
import { StyleSheet, View } from 'react-native'
import type { IAutocompleteDropdownRef } from './types'

export interface IAutocompleteDropdownContext {
  content?: ReactElement
  setContent: Dispatch<SetStateAction<ReactElement | undefined>>
  direction?: 'up' | 'down'
  setDirection: Dispatch<SetStateAction<IAutocompleteDropdownContext['direction']>>
  activeInputContainerRef?: MutableRefObject<View | null>
  activeControllerRef?: MutableRefObject<IAutocompleteDropdownRef | null>
  controllerRefs?: MutableRefObject<IAutocompleteDropdownRef[]>
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
  activeControllerRef: undefined,
  controllerRefs: undefined,
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
    { x: number; topY: number; bottomY: number; width: number; height: number } | undefined
  >()
  const [opacity, setOpacity] = useState(0)
  const [contentStyles, setContentStyles] = useState<
    { top?: number; left: number; width?: number; bottom?: number } | undefined
  >(undefined)
  const activeInputContainerRef = useRef<View>(null)
  const wrapperRef = useRef<View>(null)
  const activeControllerRef = useRef<IAutocompleteDropdownRef | null>(null)
  const controllerRefs = useRef<IAutocompleteDropdownRef[]>([])
  const positionTrackingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!inputMeasurements?.height) {
      setOpacity(0)
      return
    }

    if (dropdownHeight && direction === 'up') {
      setContentStyles({
        bottom: inputMeasurements.bottomY + 5 + headerOffset,
        top: undefined,
        left: inputMeasurements.x,
        width: inputMeasurements.width,
      })
      setOpacity(1)
    } else if (direction === 'down') {
      setContentStyles({
        top: inputMeasurements.topY + inputMeasurements.height + 5 + headerOffset,
        bottom: undefined,
        left: inputMeasurements.x,
        width: inputMeasurements.width,
      })
      setOpacity(1)
    }
  }, [direction, dropdownHeight, headerOffset, inputMeasurements])

  const recalculatePosition = useCallback((showAfterCalculation = false) => {
    activeInputContainerRef?.current?.measure((x, y, width, height, inputPageX, inputPageY) => {
      wrapperRef.current?.measure((wrapperX, wrapperY, wrapperW, wrapperH, wrapperPageX, wrapperPageY) => {
        const currentMeasurement = {
          width,
          height,
          x: inputPageX,
          topY: inputPageY - wrapperPageY,
          bottomY: wrapperH - inputPageY + wrapperPageY,
        }
        setInputMeasurements(prev =>
          JSON.stringify(prev) === JSON.stringify(currentMeasurement) ? prev : currentMeasurement,
        )
        showAfterCalculation && setShow(true)
      })
    })
  }, [])

  useEffect(() => {
    if (content) {
      recalculatePosition(true)
    } else {
      setInputMeasurements(undefined)
      setDropdownHeight(0)
      setOpacity(0)
      setContentStyles(undefined)
      setShow(false)
    }
  }, [content, recalculatePosition])

  useEffect(() => {
    if (show && !!opacity) {
      positionTrackingIntervalRef.current = setInterval(() => {
        requestAnimationFrame(() => {
          recalculatePosition()
        })
      }, 16)
    } else {
      clearInterval(positionTrackingIntervalRef.current)
    }

    return () => {
      clearInterval(positionTrackingIntervalRef.current)
    }
  }, [recalculatePosition, opacity, show])

  const onLayout: ViewProps['onLayout'] = useCallback((e: LayoutChangeEvent) => {
    setDropdownHeight(e.nativeEvent.layout.height)
  }, [])

  return (
    <AutocompleteDropdownContext.Provider
      value={{
        content,
        setContent,
        activeInputContainerRef,
        direction,
        setDirection,
        activeControllerRef,
        controllerRefs,
      }}>
      <View
        ref={wrapperRef}
        style={styles.clickOutsideHandlerArea}
        onTouchEnd={() => {
          activeControllerRef.current?.close()
          activeControllerRef.current?.blur()
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

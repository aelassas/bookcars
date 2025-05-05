import type { MutableRefObject } from 'react'
import type React from 'react'
import type { StyleProp, TextInputProps, TextStyle, ViewStyle, FlatListProps, TextInput } from 'react-native'

export type AutocompleteDropdownItem = {
  id: string
  title?: string | null
}

export interface IAutocompleteDropdownRef {
  clear: () => void
  close: () => void
  blur: () => void
  open: () => Promise<void>
  setInputText: (text: string) => void
  toggle: () => void
  setItem: (item: AutocompleteDropdownItem) => void
}

export interface IAutocompleteDropdownProps {
  /**
   * @example [
   *     { id: "1", title: "Alpha" },
   *     { id: "2", title: "Beta" },
   *     { id: "3", title: "Gamma" }
   * ]
   */
  dataSet: AutocompleteDropdownItem[] | null
  inputHeight?: number
  suggestionsListMaxHeight?: number
  initialValue?: string | { id: string } | AutocompleteDropdownItem
  loading?: boolean
  useFilter?: boolean
  showClear?: boolean
  showChevron?: boolean
  closeOnBlur?: boolean
  closeOnSubmit?: boolean
  clearOnFocus?: boolean
  caseSensitive?: boolean
  ignoreAccents?: boolean
  trimSearchText?: boolean
  editable?: boolean
  matchFrom?: 'any' | 'start'
  debounce?: number
  direction?: 'down' | 'up'
  position?: 'absolute' | 'relative'
  bottomOffset?: number
  textInputProps?: TextInputProps
  onChangeText?: (text: string) => void
  onSelectItem?: (item: AutocompleteDropdownItem | null) => void
  renderItem?: (item: AutocompleteDropdownItem, searchText: string) => React.ReactElement | null
  onOpenSuggestionsList?: (isOpened: boolean) => void
  onClear?: () => void
  onChevronPress?: () => void
  onRightIconComponentPress?: () => void
  onSubmit?: TextInputProps['onSubmitEditing']
  onBlur?: TextInputProps['onBlur']
  onFocus?: TextInputProps['onFocus']
  controller?:
    | MutableRefObject<IAutocompleteDropdownRef | null>
    | ((controller: IAutocompleteDropdownRef | null) => void)
  containerStyle?: StyleProp<ViewStyle>
  inputContainerStyle?: StyleProp<ViewStyle>
  rightButtonsContainerStyle?: StyleProp<ViewStyle>
  suggestionsListContainerStyle?: StyleProp<ViewStyle>
  suggestionsListTextStyle?: StyleProp<TextStyle>
  ChevronIconComponent?: React.ReactElement
  RightIconComponent?: React.ReactElement
  LeftComponent?: React.ReactElement
  ClearIconComponent?: React.ReactElement
  InputComponent?: React.ComponentType
  ItemSeparatorComponent?: React.ComponentType<any> | null
  EmptyResultComponent?: React.ReactElement
  emptyResultText?: string
  flatListProps?: Partial<FlatListProps<AutocompleteDropdownItem>>
  ref?: React.LegacyRef<TextInput> | undefined
}

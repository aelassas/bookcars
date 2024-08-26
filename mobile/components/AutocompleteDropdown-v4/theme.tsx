export const light = {
  inputBackgroundColor: '#e5ecf2',
  inputPlaceholderColor: '#00000066',
  inputTextColor: '#333',
  suggestionsListBackgroundColor: '#fff',
  itemSeparatorColor: '#ddd',
  shadowColor: '#00000099',
  listItemTextColor: '#333',
}

type Theme = typeof light

export const dark: Theme = {
  inputBackgroundColor: '#1c1c1e',
  inputPlaceholderColor: '#767680',
  inputTextColor: '#fff',
  suggestionsListBackgroundColor: '#151516',
  itemSeparatorColor: '#3e3e41',
  shadowColor: '#919aaa5d',
  listItemTextColor: '#dbdddf',
}

export const theme = { light, dark }

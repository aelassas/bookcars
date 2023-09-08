import ReactAsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-root-toast'
import i18n from '../lang/i18n'

export const error = (err: unknown) => {
  if (err) {
    console.log(err)
  }
  Toast.show(i18n.t('GENERIC_ERROR'), {
    duration: Toast.durations.LONG,
  })
}

export const storeString = async (key: string, value: string) => {
  try {
    await ReactAsyncStorage.setItem(key, value)
  } catch (err) {
    error(err)
  }
}

export const getString = async (key: string) => {
  try {
    const value = await ReactAsyncStorage.getItem(key)
    return value
  } catch (err) {
    error(err)
  }
}

export async function storeObject<T>(key: string, value: T) {
  try {
    const jsonValue = JSON.stringify(value)
    await ReactAsyncStorage.setItem(key, jsonValue)
  } catch (err) {
    error(err)
  }
}

export async function getObject<T>(key: string) {
  try {
    const value = await ReactAsyncStorage.getItem(key)
    const jsonValue = value != null ? JSON.parse(value) as T : null
    return jsonValue
  } catch (err) {
    error(err)
    return null
  }
}

export const removeItem = async (key: string) => {
  try {
    await ReactAsyncStorage.removeItem(key)
  } catch (err) {
    error(err)
  }
}

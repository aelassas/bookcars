import AsyncStorage from '@react-native-async-storage/async-storage'
import * as toastHelper from './toastHelper'

/**
 * Store a string in async-storage.
 *
 * @async
 * @param {string} key
 * @param {string} value
 * @returns {void}
 */
export const storeString = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value)
  } catch (err) {
    toastHelper.error(err)
  }
}

/**
 * Get a string by key from async-storage.
 *
 * @async
 * @param {string} key
 * @returns {unknown}
 */
export const getString = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value
  } catch (err) {
    toastHelper.error(err)
    return ''
  }
}

/**
 * Store an object in async-storage.
 *
 * @export
 * @async
 * @template T
 * @param {string} key
 * @param {T} value
 * @returns {void}
 */
export const storeObject = async<T>(key: string, value: T) => {
  try {
    const jsonValue = JSON.stringify(value)
    await AsyncStorage.setItem(key, jsonValue)
  } catch (err) {
    toastHelper.error(err)
  }
}

/**
 * Get an object by key from async-storage.
 *
 * @export
 * @async
 * @template T
 * @param {string} key
 * @returns {T|null}
 */
export const getObject = async<T>(key: string) => {
  try {
    const value = await AsyncStorage.getItem(key)
    const jsonValue = value != null ? JSON.parse(value) as T : null
    return jsonValue
  } catch (err) {
    toastHelper.error(err)
    return null
  }
}

/**
 * Remove an item by key from async-storage.
 *
 * @async
 * @param {string} key
 * @returns {void}
 */
export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key)
  } catch (err) {
    toastHelper.error(err)
  }
}

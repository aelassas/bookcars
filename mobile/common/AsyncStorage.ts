import ReactAsyncStorage from '@react-native-async-storage/async-storage'
import * as ToastHelper from './ToastHelper'

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
    await ReactAsyncStorage.setItem(key, value)
  } catch (err) {
    ToastHelper.error(err)
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
    const value = await ReactAsyncStorage.getItem(key)
    return value
  } catch (err) {
    ToastHelper.error(err)
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
export async function storeObject<T>(key: string, value: T) {
  try {
    const jsonValue = JSON.stringify(value)
    await ReactAsyncStorage.setItem(key, jsonValue)
  } catch (err) {
    ToastHelper.error(err)
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
export async function getObject<T>(key: string) {
  try {
    const value = await ReactAsyncStorage.getItem(key)
    const jsonValue = value != null ? JSON.parse(value) as T : null
    return jsonValue
  } catch (err) {
    ToastHelper.error(err)
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
    await ReactAsyncStorage.removeItem(key)
  } catch (err) {
    ToastHelper.error(err)
  }
}

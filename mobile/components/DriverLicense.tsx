import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import * as Linking from 'expo-linking'
import * as DocumentPicker from 'expo-document-picker'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import * as env from '@/config/env.config'

interface DriverLicenseProps {
  user?: bookcarsTypes.User
  hideLabel?: boolean
  style?: object
  onUpload?: (filename: string) => void
  onDelete?: () => void
}

const iconSize = 32
const iconColor = '#676767'

const DriverLicense = ({
  user,
  hideLabel,
  style,
  onUpload,
  onDelete,
}: DriverLicenseProps) => {
  const [license, setLicense] = useState(user?.license || null)

  const handleUpload = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })

      if (pickerResult.canceled) {
        return
      }

      const { uri } = pickerResult.assets[0]
      const name = helper.getFileName(uri)
      const type = helper.getMimeType(name)
      const file: BlobInfo = { uri, name, type }

      let filename: string | null = null
      if (user) {
        // upload new file
        const res = await UserService.updateLicense(user._id!, file)
        if (res.status === 200) {
          filename = res.data
        } else {
          helper.error()
        }
      } else {
        // Remove previous temp file
        if (license) {
          await UserService.deleteTempLicense(license)
        }
        // upload new file
        filename = await UserService.createLicense(file)
      }

      if (filename) {
        if (onUpload) {
          onUpload(filename)
        }
      }

      setLicense(filename)
    } catch (err) {
      helper.error(err)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 10,
      paddingLeft: 10,
    },
    component: {
      flex: 1,
      marginRight: 5,
    },
    label: {
      backgroundColor: '#F5F5F5',
      color: 'rgba(0, 0, 0, 0.6)',
      fontSize: 12,
      fontWeight: '400',
      paddingRight: !hideLabel ? 5 : 0,
      paddingLeft: !hideLabel ? 5 : 0,
      marginLeft: !hideLabel ? 15 : 0,
      width: !hideLabel ? 'auto' : 0,
      position: 'absolute',
      top: -9,
      zIndex: 1,
    },
    inputContainer: {
      flexDirection: 'row',
    },
    input: {
      flex: 1,
      height: 55,
      borderWidth: 1,
      borderRadius: 10,
      borderColor: 'rgba(0, 0, 0, 0.23)',
      fontSize: 16,
      paddingTop: 15,
      paddingRight: 40,
      paddingBottom: 15,
      paddingLeft: 15,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    action: {
      marginRight: 5,
      marginLeft: 5,
    },
  })

  return (
    <View style={{ ...styles.container, ...style }}>
      <Pressable hitSlop={15} onPress={handleUpload} style={styles.component}>
        {!hideLabel && <Text style={styles.label}>{i18n.t('DRIVER_LICENSE')}</Text>}
        <View style={styles.inputContainer}>
          <Text style={styles.input} numberOfLines={1} ellipsizeMode="tail">{license || i18n.t('UPLOAD_FILE') || ''}</Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          hitSlop={15}
          onPress={handleUpload}
        >
          <MaterialIcons name="upload" size={iconSize} color={iconColor} />
        </Pressable>
        {license && (
          <>
            <Pressable
              style={styles.action}
              hitSlop={15}
              onPress={() => {
                const url = `${bookcarsHelper.trimEnd(user ? env.CDN_LICENSES : env.CDN_TEMP_LICENSES, '/')}/${license}`
                Linking.openURL(url)
              }}
            >
              <MaterialIcons name="visibility" size={iconSize} color={iconColor} />
            </Pressable>
            <Pressable
              style={styles.action}
              hitSlop={15}
              onPress={async () => {
                try {
                  let status = 0
                  if (user) {
                    status = await UserService.deleteLicense(user._id!)
                  } else {
                    status = await UserService.deleteTempLicense(license!)
                  }

                  if (status === 200) {
                    setLicense(null)

                    if (onDelete) {
                      onDelete()
                    }
                  } else {
                    helper.error()
                  }
                } catch (err) {
                  helper.error(err)
                }
              }}
            >
              <MaterialIcons name="delete" size={32} color={iconColor} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

export default DriverLicense

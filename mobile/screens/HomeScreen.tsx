import React, { useState, useEffect } from 'react'
import { StyleSheet, ScrollView, View, Text } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import i18n from '@/lang/i18n'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import SearchForm from '@/components/SearchForm'

const HomeScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Home'>) => {
  const isFocused = useIsFocused()

  const [init, setInit] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reload, setReload] = useState(false)

  const _init = async () => {
    const _language = await UserService.getLanguage()
    i18n.locale = _language

    setInit(true)
    setVisible(true)
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
  }, [route.params, isFocused])  

  const onLoad = () => {
    setReload(false)
  }

  return (
    <Layout style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} route={route}>
      {init && visible && (
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
        >

          <View style={styles.contentContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoMain}>BookCars</Text>
              <Text style={styles.logoRegistered}>®</Text>
            </View>
            <SearchForm
              navigation={navigation}
            />
          </View>

        </ScrollView>
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  logo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    maxWidth: 480,
  },
  logoMain: {
    color: '#f37022',
    fontSize: 70,
    fontWeight: '700',
    lineHeight: 125,
  },
  logoRegistered: {
    color: '#f37022',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 40,
  },
  component: {
    alignSelf: 'stretch',
    margin: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  copyright: {
    fontSize: 12,
    color: '#70757a',
  },
  copyrightRegistered: {
    fontSize: 6,
    color: '#70757a',
    position: 'relative',
    top: -5,
  },
})

export default HomeScreen

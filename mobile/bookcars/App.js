import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { RootSiblingParent } from 'react-native-root-siblings';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DrawerNavigator from './elements/DrawerNavigator';
import i18n from './lang/i18n';
import UserService from './services/UserService';

export default function App() {

  const [init, setInit] = useState(false);
  const [drawerItems, setDrawerItems] = useState([]);

  useEffect(() => {
    const initDrawerItems = async () => {
      const language = await UserService.getLanguage();
      i18n.locale = language;

      setDrawerItems(
        [
          {
            name: 'Home',
            title: i18n.t('HOME'),
            iconName: 'home',
            showTitle: false
          },
          {
            name: 'About',
            title: i18n.t('ABOUT'),
            iconName: 'info',
            showTitle: true
          }
        ]
      );

      setInit(true);
    };

    initDrawerItems();
  }, []);

  return (
    init &&
    <SafeAreaProvider>
      <RootSiblingParent>
        <NavigationContainer>
          <ExpoStatusBar style='light' backgroundColor='rgba(0, 0, 0, 8)' />
          <DrawerNavigator drawerItems={drawerItems} />
        </NavigationContainer>
      </RootSiblingParent>
    </SafeAreaProvider>
  );
}
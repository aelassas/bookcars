import React from 'react';
import { RootSiblingParent } from 'react-native-root-siblings';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerNavigator from './elements/DrawerNavigator';
import { Provider } from 'react-native-paper';
import 'react-native-gesture-handler';

export default function App() {

  return (
    <SafeAreaProvider>
      <Provider>
        <RootSiblingParent>
          <NavigationContainer>
            <ExpoStatusBar style='light' backgroundColor='rgba(0, 0, 0, .9)' />
            <DrawerNavigator />
          </NavigationContainer>
        </RootSiblingParent>
      </Provider>
    </SafeAreaProvider>
  );
}
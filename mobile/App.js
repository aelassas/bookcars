import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { RootSiblingParent } from 'react-native-root-siblings';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerNavigator from './elements/DrawerNavigator';
import { Provider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import Helper from './common/Helper';

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        Helper.error(err);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onReady = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Provider>
        <RootSiblingParent>
          <NavigationContainer onReady={onReady}>
            <ExpoStatusBar style='light' backgroundColor='rgba(0, 0, 0, .9)' />
            <DrawerNavigator />
          </NavigationContainer>
        </RootSiblingParent>
      </Provider>
    </SafeAreaProvider>
  );
}
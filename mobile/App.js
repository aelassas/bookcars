import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RootSiblingParent } from 'react-native-root-siblings';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerNavigator from './elements/DrawerNavigator';
import { Provider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Helper from './common/Helper';
import * as NotificationService from './services/NotificationService';
import * as UserService from './services/UserService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const responseListener = useRef();
  const navigationRef = useRef();

  useEffect(() => {
    async function register() {
      const loggedIn = await UserService.loggedIn();
      if (loggedIn) {
        const currentUser = await UserService.getCurrentUser();
        await Helper.registerPushToken(currentUser.id);
      }
    }

    // Register push notifiations token
    register();

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
      try {
        if (navigationRef.current) {
          const data = response.notification.request.content.data;

          if (data.booking) {
            if (data.user && data.notification) {
              await NotificationService.markAsRead(data.user, [data.notification]);
            }
            navigationRef.current.navigate('Booking', { id: data.booking });
          } else {
            navigationRef.current.navigate('Notifications');
          }
        }
      } catch (err) {
        Helper.error(err, false);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

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
          <NavigationContainer ref={navigationRef} onReady={onReady}>
            <ExpoStatusBar style='light' backgroundColor='rgba(0, 0, 0, .9)' />
            <DrawerNavigator />
          </NavigationContainer>
        </RootSiblingParent>
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
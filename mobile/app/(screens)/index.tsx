import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview'

import * as env from '@/config/env.config'

const geolocationBridge = `(() => {
  const postNative = (value) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(value));
  window.addEventListener('error', (event) => postNative({ type: 'SAFARRENT_PAGE_ERROR', message: event.message || 'A page script failed.' }));
  window.addEventListener('unhandledrejection', (event) => postNative({ type: 'SAFARRENT_PAGE_ERROR', message: String(event.reason || 'A page request failed.') }));
  let checks = 0;
  const readyCheck = setInterval(() => {
    const root = document.getElementById('root');
    if (root && root.children.length) {
      clearInterval(readyCheck);
      postNative({ type: 'SAFARRENT_PAGE_READY' });
    } else if (++checks >= 30) {
      clearInterval(readyCheck);
      const scripts = Array.from(document.scripts).map((script) => script.src ? script.src.replace(location.origin, '') : 'inline script').join(', ');
      const modules = performance.getEntriesByType('resource')
        .filter((item) => item.name.includes('/src/') || item.name.includes('/node_modules/'))
        .slice(-8)
        .map((item) => item.name.replace(location.origin, ''))
        .join(', ');
      postNative({ type: 'SAFARRENT_PAGE_ERROR', message: 'React did not mount. Page: ' + document.title + '; scripts: ' + scripts + '; loaded modules: ' + (modules || 'none') });
    }
  }, 500);
  const callbacks = new Map();
  let nextId = 1;
  window.__srGeolocationResponse = (result) => {
    const request = callbacks.get(result.id);
    if (!request) return;
    callbacks.delete(result.id);
    if (result.error) request.error && request.error(result.error);
    else request.success && request.success(result.position);
  };
  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success, error, options) {
          const id = String(nextId++);
          callbacks.set(id, { success, error });
          postNative({
            type: 'SAFARRENT_GEOLOCATION', id,
            highAccuracy: Boolean(options && options.enableHighAccuracy)
          });
        }
      }
    });
  } catch (_) {}
})(); true;`

const HomeScreen = () => {
  // react-native-webview's default generic is `undefined`; TS 6 reduces its
  // props intersection to `never`, so provide an empty props extension.
  const webView = useRef<WebView<{}>>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [failureMessage, setFailureMessage] = useState('Check that your phone and laptop are on the same Wi-Fi and that the customer website is running.')
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false
      }
      webView.current?.goBack()
      return true
    })
    return () => subscription.remove()
  }, [canGoBack])

  const onNavigationChange = (state: WebViewNavigation) => setCanGoBack(state.canGoBack)

  const onMessage = async (event: WebViewMessageEvent) => {
    let request: { type?: string, id?: string, highAccuracy?: boolean, message?: string }
    try {
      request = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }
    if (request.type === 'SAFARRENT_PAGE_READY') {
      setLoading(false)
      setFailed(false)
      return
    }
    if (request.type === 'SAFARRENT_PAGE_ERROR') {
      setLoading(false)
      setFailureMessage(request.message || 'The SafarRent page could not render.')
      setFailed(true)
      return
    }
    if (request.type !== 'SAFARRENT_GEOLOCATION' || !request.id) {
      return
    }

    const respond = (result: Record<string, unknown>) => {
      const payload = JSON.stringify({ id: request.id, ...result })
      webView.current?.injectJavaScript(`window.__srGeolocationResponse && window.__srGeolocationResponse(${payload}); true;`)
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        respond({ error: { code: 1, message: 'Location permission was not granted.' } })
        return
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: request.highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
      })
      respond({
        position: {
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        },
      })
    } catch {
      respond({ error: { code: 2, message: 'The phone could not determine its location.' } })
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webView}
        source={{ uri: env.WEB_APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        geolocationEnabled
        injectedJavaScriptBeforeContentLoaded={geolocationBridge}
        onMessage={onMessage}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          setLoading(true)
          setFailed(false)
        }}
        onLoadEnd={() => { /* Wait for the React page to render before hiding the loading screen. */ }}
        onError={(event) => {
          setLoading(false)
          setFailureMessage(event.nativeEvent.description || 'Could not connect to the SafarRent website.')
          setFailed(true)
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) {
            setLoading(false)
            setFailureMessage(`The website returned HTTP ${event.nativeEvent.statusCode}.`)
            setFailed(true)
          }
        }}
        onNavigationStateChange={onNavigationChange}
      />
      {loading && !failed && (
        <View style={styles.overlay}>
          <Text style={styles.brand}>Safar<Text style={styles.gold}>Rent</Text></Text>
          <ActivityIndicator color="#D4AF37" size="large" />
          <Text style={styles.help}>Connecting to SafarRent…</Text>
        </View>
      )}
      {failed && (
        <View style={styles.error}>
          <Text style={styles.brand}>Safar<Text style={styles.gold}>Rent</Text></Text>
          <Text style={styles.errorTitle}>Can’t reach SafarRent</Text>
          <Text style={styles.help}>{failureMessage}</Text>
          <Text style={styles.url}>{env.WEB_APP_URL}</Text>
          <Pressable style={styles.retry} onPress={() => {
            setFailed(false)
            setLoading(true)
            webView.current?.reload()
          }}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101114' },
  webview: { flex: 1, backgroundColor: '#101114' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#101114', alignItems: 'center', justifyContent: 'center', gap: 18 },
  error: { ...StyleSheet.absoluteFill, backgroundColor: '#101114', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  brand: { color: '#F6F4EF', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  gold: { color: '#D4AF37' },
  help: { color: '#D7D5D0', textAlign: 'center', fontSize: 15, lineHeight: 22, maxWidth: 340 },
  url: { color: '#A8A6A0', textAlign: 'center', fontSize: 12 },
  errorTitle: { color: '#F6F4EF', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  retry: { backgroundColor: '#D4AF37', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 4 },
  retryText: { color: '#17191D', fontSize: 16, fontWeight: '700' },
})

export default HomeScreen

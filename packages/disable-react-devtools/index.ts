/* eslint-disable no-undef */
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<
      string,
      Map<any, any> | (() => any)
    >
  }
}

/**
 * Disable React Developer Tools.
 *
 * @export
 */
export const disableDevTools = () => {
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return
  }

  Object.keys(window.__REACT_DEVTOOLS_GLOBAL_HOOK__).forEach((k) => {
    let replacement: undefined | Map<unknown, unknown>

    if (k === 'renderers') {
      replacement = new Map()
    }

    window.__REACT_DEVTOOLS_GLOBAL_HOOK__![k] =
      replacement || (() => undefined)
  })
}

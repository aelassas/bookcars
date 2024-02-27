/**
 * Disable React Developer Tools.
 *
 * @export
 */
export const disableDevTools = () => {
    if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
        return;
    Object.keys(window.__REACT_DEVTOOLS_GLOBAL_HOOK__).forEach((k) => {
        let replacement;
        if (k === 'renderers')
            replacement = new Map();
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__[k] =
            replacement || (() => undefined);
    });
};

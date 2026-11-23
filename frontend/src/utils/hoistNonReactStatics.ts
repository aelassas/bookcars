type ComponentLike = Record<PropertyKey, any> | ((...args: any[]) => any)

const knownStatics = new Set<PropertyKey>([
  'name', 'length', 'prototype', 'caller', 'callee', 'arguments', 'arity',
])
const reactStatics = new Set<PropertyKey>([
  'childContextTypes', 'contextType', 'contextTypes', 'defaultProps', 'displayName',
  'getDefaultProps', 'getDerivedStateFromError', 'getDerivedStateFromProps', 'mixins',
  'propTypes', 'type',
])
const forwardRefStatics = new Set<PropertyKey>([
  '$$typeof', 'render', 'defaultProps', 'displayName', 'propTypes',
])
const memoStatics = new Set<PropertyKey>([
  '$$typeof', 'compare', 'defaultProps', 'displayName', 'propTypes', 'type',
])

const staticsFor = (component: ComponentLike) => {
  const marker = (component as Record<string, unknown>)?.$$typeof
  if (marker === Symbol.for('react.forward_ref')) {
return forwardRefStatics
}
  if (marker === Symbol.for('react.memo')) {
return memoStatics
}
  return reactStatics
}

/** ESM-safe equivalent of the statics copier needed by Emotion's HNRS entry. */
export default function hoistNonReactStatics<T extends ComponentLike>(
  target: T,
  source: ComponentLike | string,
  blacklist?: Record<PropertyKey, boolean>,
): T {
  if (typeof source === 'string') {
return target
}

  const prototype = Object.getPrototypeOf(source)
  if (prototype && prototype !== Object.prototype && prototype !== Function.prototype) {
    hoistNonReactStatics(target, prototype as ComponentLike, blacklist)
  }

  const excludedOnSource = staticsFor(source)
  const excludedOnTarget = staticsFor(target)
  const keys: PropertyKey[] = Object.getOwnPropertyNames(source)
  if (Object.getOwnPropertySymbols) {
keys.push(...Object.getOwnPropertySymbols(source))
}

  for (const key of keys) {
    if (knownStatics.has(key)
      || blacklist?.[key]
      || excludedOnSource.has(key)
      || excludedOnTarget.has(key)) {
continue
}
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (descriptor) {
      try {
 Object.defineProperty(target, key, descriptor) 
} catch { /* keep read-only target statics */ }
    }
  }
  return target
}

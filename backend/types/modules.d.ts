// Type declarations for modules without their own type definitions

declare module 'escape-string-regexp' {
  function escapeStringRegexp(str: string): string;
  export default escapeStringRegexp;
}

declare module 'nanoid' {
  export function nanoid(size?: number): string;
}

declare module 'i18n-js' {
  export class I18n {
    constructor(translations: Record<string, any>);
    locale: string;
    enableFallback: boolean;
    translations: Record<string, any>;
    t(key: string, options?: any): string;
  }
}

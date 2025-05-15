// Type declarations for modules without their own type definitions

declare module 'supertest' {
  import { Response } from 'express';
  
  interface SuperTest {
    get(url: string): Promise<Response>;
    post(url: string): Promise<Response>;
    put(url: string): Promise<Response>;
    delete(url: string): Promise<Response>;
    set(header: string, value: string): SuperTest;
    send(data: any): Promise<Response>;
    query(data: any): Promise<Response>;
    expect(status: number): Promise<Response>;
  }
  
  function request(app: any): SuperTest;
  export default request;
}

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

declare module 'url' {
  export function fileURLToPath(url: string): string;
}

declare module 'node:fs/promises' {
  export function readFile(path: string, options?: { encoding?: string; flag?: string }): Promise<string | Buffer>;
  export function writeFile(path: string, data: string | Buffer, options?: { encoding?: string; flag?: string }): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<void>;
  export function unlink(path: string): Promise<void>;
  export function access(path: string, mode?: number): Promise<void>;
  export function stat(path: string): Promise<any>;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
}

declare module 'node:http' {
  import { Server } from 'http';
  export default Server;
}

declare module 'node:https' {
  import { Server } from 'https';
  export interface ServerOptions {
    key: string | Buffer;
    cert: string | Buffer;
  }
  export default Server;
}

declare module 'node:process' {
  export const env: Record<string, string | undefined>;
  export function exit(code?: number): never;
  export default { env, exit };
}

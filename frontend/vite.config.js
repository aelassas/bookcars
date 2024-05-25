var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// https://vitejs.dev/config/
export default (function (_a) {
    var mode = _a.mode;
    process.env = __assign(__assign({}, process.env), loadEnv(mode, process.cwd(), ''));
    return defineConfig({
        plugins: [react()],
        resolve: {
            alias: {
                ':bookcars-types': path.resolve(__dirname, '../packages/bookcars-types'),
                ':bookcars-helper': path.resolve(__dirname, '../packages/bookcars-helper'),
                ':disable-react-devtools': path.resolve(__dirname, '../packages/disable-react-devtools'),
            },
        },
        server: {
            host: '0.0.0.0',
            port: Number.parseInt(process.env.VITE_PORT || '3002', 10),
        },
        build: {
            outDir: 'build',
            target: 'esnext'
        }
    });
});

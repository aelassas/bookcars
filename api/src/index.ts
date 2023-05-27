import 'dotenv/config'
import {getExpres} from './server'
import fs from 'fs'
import https from 'https'
import {z} from "zod";

console.log(process.env);

export const envVariables = z.object({
    BC_HOST: z.string().default('0.0.0.0'),
    BC_PORT: z.string(),
    BC_HTTPS: z.string(),
    BC_DB_SSL: z.string(),
    BC_DB_DEBUG: z.string(),
    BC_DB_URI: z.string(),
    BC_MINIMUM_AGE: z.string(),
    BC_TOKEN_EXPIRE_AT: z.string(),
    BC_JWT_SECRET: z.string(),
    BC_CDN_CARS: z.string(),
    BC_CDN_TEMP_CARS: z.string(),
    BC_SMTP_HOST: z.string(),
    BC_SMTP_PORT: z.string(),
    BC_SMTP_USER: z.string(),
    BC_SMTP_PASS: z.string(),
    BC_SMTP_FROM: z.string(),
    BC_BACKEND_HOST: z.string(),
    BC_FRONTEND_HOST: z.string(),
    BC_EXPO_ACCESS_TOKEN: z.string(),
    BC_JWT_EXPIRE_AT: z.string(),
    BC_CDN_TEMP_USERS: z.string(),
    BC_CDN_USERS: z.string(),
    BC_DEFAULT_LANGUAGE: z.string(),

    SPACES_ENDPOINT: z.string(),
    SPACES_REGION: z.string(),
    SPACES_KEY: z.string(),
    SPACES_SECRET: z.string(),
});

envVariables.parse(process.env);

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envVariables> {
        }
    }

    namespace Express {
        export interface Request {
            userId: string;
        }
    }
}


const HOST = process.env.BC_HOST || 'localhost'
const PORT = parseInt(process.env.BC_PORT) || 4000
const HTTPS = process.env.BC_HTTPS.toLocaleLowerCase() === 'true'
const PRIVATE_KEY = process.env.BC_PRIVATE_KEY
const CERTIFICATE = process.env.BC_CERTIFICATE

function main() {
    const app = getExpres();

    if (HTTPS && PRIVATE_KEY && CERTIFICATE) {
        https.globalAgent.maxSockets = Infinity
        const privateKey = fs.readFileSync(PRIVATE_KEY, 'utf8')
        const certificate = fs.readFileSync(CERTIFICATE, 'utf8')
        const credentials = {key: privateKey, cert: certificate}
        const httpsServer = https.createServer(credentials, app)

        httpsServer.listen(PORT, () => {
            console.log('HTTPS server is running on Port:', PORT)
            console.log('HTTPS server is running on Host:', HOST)
        })
    } else {
        app.listen(PORT, (): void => {
            console.log('HTTP server is running on Port:', PORT)
            console.log('HTTPS server is running on Host:', HOST)
        })
    }
}

main()

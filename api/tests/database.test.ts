import 'dotenv/config'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/common/databaseHelper'

describe('Test database connection', () => {
    it('should connect to database', async () => {
        const res = await databaseHelper.Connect(env.DB_URI, false, false)
        expect(res).toBeTruthy()
        await databaseHelper.Close()
    })
})

describe('Test database connection failure', () => {
    it('should fail connecting to database', async () => {
        const res = await databaseHelper.Connect('wrong-uri', true, false)
        expect(res).toBeFalsy()
    })
})

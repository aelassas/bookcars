import 'dotenv/config'
import * as bookcarsTypes from 'bookcars-types'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/common/databaseHelper'
import * as mailHelper from '../src/common/mailHelper'
import * as testHelper from './testHelper'
import AdditionalDriver from '../src/models/AdditionalDriver'
import User from '../src/models/User'

beforeAll(() => {
    testHelper.initializeConsole()
})

const ADDITIONAL_DRIVER: bookcarsTypes.AdditionalDriver = {
    email: testHelper.GetRandomEmail(),
    fullName: 'Additional Driver 1',
    birthDate: new Date(1990, 5, 20),
    phone: '',
}

describe('Test AdditionalDriver phone validation', () => {
    it('should test AdditionalDriver phone validation', async () => {
        await databaseHelper.Connect(env.DB_URI, false, false)
        let res = true
        try {
            const additionalDriver = new AdditionalDriver(ADDITIONAL_DRIVER)
            await additionalDriver.save()
        } catch (err) {
            console.log(err)
            res = false
        }
        await databaseHelper.Close()
        expect(res).toBeFalsy()
    })
})

describe('Test User phone validation', () => {
    it('should test User phone validation', async () => {
        await databaseHelper.Connect(env.DB_URI, false, false)
        let res = true
        const USER: bookcarsTypes.User = {
            email: testHelper.GetRandomEmail(),
            fullName: 'Additional Driver 1',
            birthDate: new Date(1990, 5, 20),
            phone: '',
        }

        let userId = ''
        try {
            const user = new User(USER)
            await user.save()
            userId = user._id
            user.phone = 'unknown'
            await user.save()
        } catch (err) {
            console.log(err)
            res = false
        } finally {
            if (userId) {
                await User.deleteOne({ _id: userId })
            }
        }
        await databaseHelper.Close()
        expect(res).toBeFalsy()
    })
})

describe('Test email sending error', () => {
    it('should test email sending error', async () => {
        await databaseHelper.Connect(env.DB_URI, false, false)
        let res = true
        try {
            await mailHelper.sendMail({
                from: testHelper.GetRandomEmail(),
                to: 'wrong-email',
                subject: 'dummy subject',
                html: 'dummy body',
            })
        } catch (err) {
            console.log(err)
            res = false
        }
        await databaseHelper.Close()
        expect(res).toBeFalsy()
    })
})

import 'dotenv/config'
import * as bookcarsTypes from 'bookcars-types'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'
import AdditionalDriver from '../src/models/AdditionalDriver'
import User from '../src/models/User'

const ADDITIONAL_DRIVER: bookcarsTypes.AdditionalDriver = {
    email: TestHelper.GetRandomEmail(),
    fullName: 'Additional Driver 1',
    birthDate: new Date(1990, 5, 20),
    phone: '',
}

describe('Test AdditionalDriver phone validation', () => {
    it('should test AdditionalDriver phone validation', async () => {
        await DatabaseHelper.Connect()
        let res = true
        try {
            const additionalDriver = new AdditionalDriver(ADDITIONAL_DRIVER)
            await additionalDriver.save()
        } catch (err) {
            console.log(err)
            res = false
        }
        await DatabaseHelper.Close()
        expect(res).toBeFalsy()
    })
})

describe('Test User phone validation', () => {
    it('should test User phone validation', async () => {
        await DatabaseHelper.Connect()
        let res = true
        const USER: bookcarsTypes.User = {
            email: TestHelper.GetRandomEmail(),
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
        await DatabaseHelper.Close()
        expect(res).toBeFalsy()
    })
})

describe('Test indexing error', () => {
    it('should test indexing error', async () => {
        let res = true
        try {
            await DatabaseHelper.Close()
            await TestHelper.initialize()
        } catch (err) {
            console.log(err)
            res = false
        }
        expect(res).toBeFalsy()
    })
})

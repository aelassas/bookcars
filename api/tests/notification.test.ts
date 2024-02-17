import 'dotenv/config'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'

let ADMIN_USER_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()
        ADMIN_USER_ID = TestHelper.getAdminUserId()

        // create admin user notifications and notification counter
        let notification = new Notification({ user: ADMIN_USER_ID, message: 'Message 1' })
        await notification.save()
        notification = new Notification({ user: ADMIN_USER_ID, message: 'Message 2' })
        await notification.save()
        const notificationCounter = new NotificationCounter({ user: ADMIN_USER_ID, count: 2 })
        await notificationCounter.save()
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    // clear admin user notifications and notification counter
    await Notification.deleteMany({ user: ADMIN_USER_ID })
    await NotificationCounter.deleteOne({ user: ADMIN_USER_ID })

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('GET /api/notification-counter/:userId', () => {
    it('should get notification counter', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/notifications/:userId/:page/:size', () => {
    it('should get notifications', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/mark-notifications-as-read/:userId', () => {
    it('should mark notifications as read', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/mark-notifications-as-unread/:userId', () => {
    it('should mark notifications as unread', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('DELETE /api/delete-notifications/:userId', () => {
    it('should delete notifications', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

import 'dotenv/config'
import request from 'supertest'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'
import app from '../src/app'
import * as env from '../src/config/env.config'

let ADMIN_USER_ID: string
let SUPPLIER_ID: string
let NOTIFICATION1_ID: string
let NOTIFICATION2_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)

  await testHelper.initialize()
  ADMIN_USER_ID = testHelper.getAdminUserId()
  const supplierName = testHelper.getSupplierName()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

  // create admin user notifications and notification counter
  let notification = new Notification({ user: ADMIN_USER_ID, message: 'Message 1' })
  await notification.save()
  NOTIFICATION1_ID = notification.id
  notification = new Notification({ user: ADMIN_USER_ID, message: 'Message 2' })
  await notification.save()
  NOTIFICATION2_ID = notification.id
  const notificationCounter = new NotificationCounter({ user: ADMIN_USER_ID, count: 2 })
  await notificationCounter.save()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()

  await testHelper.deleteSupplier(SUPPLIER_ID)

  // clear admin user notifications and notification counter
  await Notification.deleteMany({ user: ADMIN_USER_ID })
  await NotificationCounter.deleteOne({ user: ADMIN_USER_ID })

  await databaseHelper.close()
})

//
// Unit tests
//

describe('GET /api/notification-counter/:userId', () => {
  it('should get notification counter', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (expect result)
    let res = await request(app)
      .get(`/api/notification-counter/${ADMIN_USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.count).toBe(2)

    // test success (expect no result)
    res = await request(app)
      .get(`/api/notification-counter/${SUPPLIER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.count).toBe(0)

    // test failure (wrong user id)
    res = await request(app)
      .get('/api/notification-counter/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/notifications/:userId/:page/:size', () => {
  it('should get notifications', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .get(`/api/notifications/${ADMIN_USER_ID}/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(2)

    // test failure (wrong page number)
    res = await request(app)
      .get(`/api/notifications/${ADMIN_USER_ID}/unkown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/mark-notifications-as-read/:userId', () => {
  it('should mark notifications as read', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload = { ids: [NOTIFICATION1_ID, NOTIFICATION2_ID] }
    let res = await request(app)
      .post(`/api/mark-notifications-as-read/${ADMIN_USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const counter = await NotificationCounter.findOne({ user: ADMIN_USER_ID })
    expect(counter?.count).toBe(0)

    // test success (no locations)
    payload.ids = []
    res = await request(app)
      .post(`/api/mark-notifications-as-read/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/mark-notifications-as-read/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/mark-notifications-as-unread/:userId', () => {
  it('should mark notifications as unread', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload = { ids: [NOTIFICATION1_ID, NOTIFICATION2_ID] }
    let res = await request(app)
      .post(`/api/mark-notifications-as-unread/${ADMIN_USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const counter = await NotificationCounter.findOne({ user: ADMIN_USER_ID })
    expect(counter?.count).toBe(2)

    // test success (no locations)
    payload.ids = []
    res = await request(app)
      .post(`/api/mark-notifications-as-unread/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/mark-notifications-as-unread/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-notifications/:userId', () => {
  it('should delete notifications', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let notifications = await Notification.find({ user: ADMIN_USER_ID })
    expect(notifications.length).toBe(2)
    const payload = { ids: [NOTIFICATION1_ID, NOTIFICATION2_ID] }
    let res = await request(app)
      .post(`/api/delete-notifications/${ADMIN_USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    notifications = await Notification.find({ user: ADMIN_USER_ID })
    expect(notifications.length).toBe(0)
    const counter = await NotificationCounter.findOne({ user: ADMIN_USER_ID })
    expect(counter?.count).toBe(0)

    // test success (NotificationCounter not found)
    res = await request(app)
      .post(`/api/delete-notifications/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/delete-notifications/${testHelper.getUserId()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

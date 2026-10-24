import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'
import User from '../src/models/User'
import app from '../src/app'
import * as env from '../src/config/env.config'

let ADMIN_USER_ID: string
let SUPPLIER_ID: string
let NOTIFICATION1_ID: string
let NOTIFICATION2_ID: string

let USER_A_ID: string
let USER_A_TOKEN: string
let USER_B_ID: string
let NOTIF_A1_ID: string
let NOTIF_A2_ID: string
let NOTIF_B1_ID: string
let NOTIF_B2_ID: string

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
  NOTIFICATION1_ID = notification._id.toString()
  notification = new Notification({ user: ADMIN_USER_ID, message: 'Message 2' })
  await notification.save()
  NOTIFICATION2_ID = notification._id.toString()
  const notificationCounter = new NotificationCounter({ user: ADMIN_USER_ID, count: 2 })
  await notificationCounter.save()


  // create User A and User B for IDOR / access control regression tests
  const userA = new User({
    fullName: 'User A',
    email: `${testHelper.getName('user-a')}@test.bookcars.io`,
    language: 'en',
    password: 'Password123!',
    type: bookcarsTypes.UserType.User,
    verified: true,
  })
  await userA.save()
  USER_A_ID = userA._id.toString()
  USER_A_TOKEN = await testHelper.generateToken(USER_A_ID)

  const userB = new User({
    fullName: 'User B',
    email: `${testHelper.getName('user-b')}@test.bookcars.io`,
    language: 'en',
    password: 'Password123!',
    type: bookcarsTypes.UserType.User,
    verified: true,
  })
  await userB.save()
  USER_B_ID = userB._id.toString()

  const notifA1 = new Notification({ user: USER_A_ID, message: 'Notif A1', isRead: false })
  await notifA1.save()
  NOTIF_A1_ID = notifA1._id.toString()

  const notifA2 = new Notification({ user: USER_A_ID, message: 'Notif A2', isRead: false })
  await notifA2.save()
  NOTIF_A2_ID = notifA2._id.toString()

  const counterA = new NotificationCounter({ user: USER_A_ID, count: 2 })
  await counterA.save()

  const notifB1 = new Notification({ user: USER_B_ID, message: 'Notif B1', isRead: false })
  await notifB1.save()
  NOTIF_B1_ID = notifB1._id.toString()

  const notifB2 = new Notification({ user: USER_B_ID, message: 'Notif B2', isRead: false })
  await notifB2.save()
  NOTIF_B2_ID = notifB2._id.toString()

  const counterB = new NotificationCounter({ user: USER_B_ID, count: 2 })
  await counterB.save()
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

  // clear user A and user B test fixtures
  await User.deleteMany({ _id: { $in: [USER_A_ID, USER_B_ID] } })
  await Notification.deleteMany({ user: { $in: [USER_A_ID, USER_B_ID] } })
  await NotificationCounter.deleteMany({ user: { $in: [USER_A_ID, USER_B_ID] } })

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

describe('Notification Broken Access Control & IDOR regression tests', () => {
  it('allows an authenticated user to read and count their own notifications', async () => {
    // 1. Get notifications
    const resNotifs = await request(app)
      .get(`/api/notifications/${USER_A_ID}/1/10`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
    expect(resNotifs.statusCode).toBe(200)
    expect(resNotifs.body[0].resultData.length).toBe(2)
    expect(resNotifs.body[0].pageInfo[0].totalRecords).toBe(2)

    // 2. Get counter
    const resCounter = await request(app)
      .get(`/api/notification-counter/${USER_A_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
    expect(resCounter.statusCode).toBe(200)
    expect(resCounter.body.count).toBe(2)
  })

  it('prevents User A from reading User B notifications or counter by changing :userId', async () => {
    // User A attempts to read User B's notifications
    const resNotifs = await request(app)
      .get(`/api/notifications/${USER_B_ID}/1/10`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
    expect(resNotifs.statusCode).toBe(403)

    // User A attempts to read User B's counter
    const resCounter = await request(app)
      .get(`/api/notification-counter/${USER_B_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
    expect(resCounter.statusCode).toBe(403)
  })

  it('prevents User A from marking User B notifications as read or unread', async () => {
    // User A attempts to mark User B's notifications as read by targeting User B's endpoint
    const resRead = await request(app)
      .post(`/api/mark-notifications-as-read/${USER_B_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_B1_ID] })
    expect(resRead.statusCode).toBe(403)

    // Verify User B's notification is still unread in database
    const notifB1 = await Notification.findById(NOTIF_B1_ID)
    expect(notifB1?.isRead).toBe(false)

    // User A attempts to mark User B's notifications as unread
    const resUnread = await request(app)
      .post(`/api/mark-notifications-as-unread/${USER_B_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_B1_ID] })
    expect(resUnread.statusCode).toBe(403)
  })

  it('prevents User A from deleting User B notifications', async () => {
    // User A attempts to delete User B's notifications by targeting User B's endpoint
    const res = await request(app)
      .post(`/api/delete-notifications/${USER_B_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_B1_ID] })
    expect(res.statusCode).toBe(403)

    // Verify User B's notification still exists in database
    const notifB1 = await Notification.findById(NOTIF_B1_ID)
    expect(notifB1).not.toBeNull()
  })

  it('prevents bulk requests with mixed owned and foreign IDs from mutating foreign notifications', async () => {
    // User A sends mark-as-read for their own endpoint, but includes User B's notification ID
    const resRead = await request(app)
      .post(`/api/mark-notifications-as-read/${USER_A_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_A1_ID, NOTIF_B1_ID] })
    expect(resRead.statusCode).toBe(200)

    // User A's notification was marked read
    const notifA1 = await Notification.findById(NOTIF_A1_ID)
    expect(notifA1?.isRead).toBe(true)

    // User B's notification was NOT marked read
    const notifB1 = await Notification.findById(NOTIF_B1_ID)
    expect(notifB1?.isRead).toBe(false)

    // User A's counter was decremented only by 1 (their owned notification), not 2
    const counterAAfterRead = await NotificationCounter.findOne({ user: USER_A_ID })
    expect(counterAAfterRead?.count).toBe(1)

    // User A sends mark-as-unread including User B's notification
    const resUnread = await request(app)
      .post(`/api/mark-notifications-as-unread/${USER_A_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_A1_ID, NOTIF_B2_ID] })
    expect(resUnread.statusCode).toBe(200)

    const notifA1AfterUnread = await Notification.findById(NOTIF_A1_ID)
    expect(notifA1AfterUnread?.isRead).toBe(false)

    const counterAAfterUnread = await NotificationCounter.findOne({ user: USER_A_ID })
    expect(counterAAfterUnread?.count).toBe(2)

    // User A attempts to delete with mixed IDs (NOTIF_A1_ID and NOTIF_B1_ID)
    const resDelete = await request(app)
      .post(`/api/delete-notifications/${USER_A_ID}`)
      .set(env.X_ACCESS_TOKEN, USER_A_TOKEN)
      .send({ ids: [NOTIF_A1_ID, NOTIF_B1_ID] })
    expect(resDelete.statusCode).toBe(200)

    // User A's notification was deleted
    const notifA1Deleted = await Notification.findById(NOTIF_A1_ID)
    expect(notifA1Deleted).toBeNull()

    // User B's notification was NOT deleted
    const notifB1StillExists = await Notification.findById(NOTIF_B1_ID)
    expect(notifB1StillExists).not.toBeNull()

    // User B's counter remains 2
    const counterB = await NotificationCounter.findOne({ user: USER_B_ID })
    expect(counterB?.count).toBe(2)
  })

  it('rejects notification endpoints when authentication is missing or invalid', async () => {
    // Missing token
    let res = await request(app).get(`/api/notifications/${USER_A_ID}/1/10`)
    expect(res.statusCode).toBe(403)

    res = await request(app).get(`/api/notification-counter/${USER_A_ID}`)
    expect(res.statusCode).toBe(403)

    res = await request(app)
      .post(`/api/mark-notifications-as-read/${USER_A_ID}`)
      .send({ ids: [NOTIF_A2_ID] })
    expect(res.statusCode).toBe(403)

    res = await request(app)
      .post(`/api/mark-notifications-as-unread/${USER_A_ID}`)
      .send({ ids: [NOTIF_A2_ID] })
    expect(res.statusCode).toBe(403)

    res = await request(app)
      .post(`/api/delete-notifications/${USER_A_ID}`)
      .send({ ids: [NOTIF_A2_ID] })
    expect(res.statusCode).toBe(403)

    // Invalid token
    res = await request(app)
      .get(`/api/notifications/${USER_A_ID}/1/10`)
      .set(env.X_ACCESS_TOKEN, 'invalid-jwt-token')
    expect(res.statusCode).toBe(401)
  })
})

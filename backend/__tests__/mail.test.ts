import { jest } from '@jest/globals'

const TEST_ACCOUNT = { user: 'testuser', pass: 'testpass' }

// Base mock for nodemailer
jest.unstable_mockModule('nodemailer', () => ({
  createTestAccount: jest.fn(async () => TEST_ACCOUNT),
  createTransport: jest.fn(), // We'll define implementation per test
}))

describe('mail module', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  /**
   * Helper to initialize the environment and mail module for each test
   */
  const setupTest = async (envOverrides: any, messageId = 'mock-id') => {
    jest.unstable_mockModule('../src/config/env.config.js', () => envOverrides)

    const nodemailer = await import('nodemailer')
    const { sendMail } = await import('../src/utils/mailHelper.js')

    const sendMailMock = jest.fn(async () => ({ messageId }))
    const verifyMock = jest.fn(async () => true)
    const createTransportMock = nodemailer.createTransport as jest.Mock

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
      verify: verifyMock,
    })

    return { sendMail, nodemailer, sendMailMock }
  }

  it('creates Ethereal test account transporter when CI=true', async () => {
    const { sendMail, nodemailer } = await setupTest(
      { CI: true, SMTP_PORT: 587 },
      '123'
    )

    const info = await sendMail({
      from: 'from@example.com',
      to: 'to@example.com',
      subject: 'test',
      text: 'hello',
    })

    expect(nodemailer.createTestAccount).toHaveBeenCalled()
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.ethereal.email',
        auth: TEST_ACCOUNT,
        secure: false,
      })
    )
    expect(info.messageId).toBe('123')
  })

  it('creates real SMTP transporter with secure: true for port 465', async () => {
    const { sendMail, nodemailer } = await setupTest({
      CI: false,
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 465,
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    })

    await sendMail({ to: 'to@example.com', subject: 'SSL', text: 'body' })

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true,
      })
    )
  })

  it('creates real SMTP transporter with secure: false for port 587', async () => {
    const { sendMail, nodemailer } = await setupTest({
      CI: false,
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    })

    await sendMail({ to: 'to@example.com', subject: 'TLS', text: 'body' })

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
        secure: false,
      })
    )
  })
})

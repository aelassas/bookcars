# Payment Gateway Setup Guide

This guide covers the setup and configuration of payment gateways (Stripe and PayPal) for the BookCars car rental platform.

## Table of Contents

1. [Overview](#overview)
2. [Stripe Setup](#stripe-setup)
3. [PayPal Setup](#paypal-setup)
4. [Environment Variables](#environment-variables)
5. [Testing Payments](#testing-payments)
6. [Troubleshooting](#troubleshooting)

## Overview

BookCars supports two payment gateways:
- **Stripe** - Recommended for most regions, supports multiple payment methods
- **PayPal** - Alternative for regions where Stripe is not available

You can configure which payment gateway to use via the `PAYMENT_GATEWAY` environment variable. The system supports:
- Credit/Debit Cards
- Google Pay
- Apple Pay
- PayPal (when PayPal gateway is selected)
- Link (Stripe's one-click checkout)
- Pay at counter (Pay Later option)
- Pay deposit or pay in full

## Stripe Setup

### Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and create an account
2. Complete the account verification process
3. Navigate to the [Dashboard](https://dashboard.stripe.com)

### Step 2: Get Your API Keys

1. In the Stripe Dashboard, go to **Developers** > **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` for test mode or `pk_live_` for live mode)
   - **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)

3. Copy both keys - you'll need them for configuration

### Step 3: Configure Environment Variables

#### Backend Configuration

Add the following to your backend `.env` file or environment:

```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API keys)
BC_STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Stripe Webhook Secret (see Step 4 below)
BC_STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Checkout Session expiration in seconds (default: 82800 = ~23 hours)
# Minimum: 1800 seconds (30 minutes), Maximum: 82800 seconds
BC_STRIPE_SESSION_EXPIRE_AT=82800

# Payment Gateway Selection (use 'Stripe' or 'PayPal')
BC_PAYMENT_GATEWAY=Stripe
```

#### Frontend Configuration

Add the following to your frontend `.env` file or environment:

```bash
# Stripe Publishable Key (from Stripe Dashboard > Developers > API keys)
VITE_BC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Payment Gateway Selection (must match backend)
VITE_BC_PAYMENT_GATEWAY=Stripe
```

#### Mobile App Configuration

For React Native mobile app, add to your environment:

```bash
# Stripe Publishable Key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Payment Gateway Selection
EXPO_PUBLIC_PAYMENT_GATEWAY=Stripe
```

### Step 4: Set Up Stripe Webhooks

Webhooks provide reliable payment confirmation even if users don't complete the redirect flow.

#### 4.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://your-domain.com/api/stripe-webhook
   ```
   Replace `your-domain.com` with your actual domain

4. Select events to listen for:
   - `checkout.session.completed` - When a checkout session is completed
   - `payment_intent.succeeded` - When a payment intent succeeds
   - `payment_intent.payment_failed` - When a payment fails (optional, for logging)

5. Click **Add endpoint**

#### 4.2 Get Webhook Signing Secret

1. After creating the endpoint, click on it to view details
2. In the **Signing secret** section, click **Reveal** or **Click to reveal**
3. Copy the signing secret (starts with `whsec_`)
4. Add it to your backend environment as `BC_STRIPE_WEBHOOK_SECRET`

#### 4.3 Test Webhook Locally (Development)

For local development, use Stripe CLI:

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:4002/api/stripe-webhook
   ```

4. Stripe CLI will display a webhook signing secret (starts with `whsec_`)
   - Use this for `BC_STRIPE_WEBHOOK_SECRET` in your local environment

5. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Step 5: Verify Integration

1. **Test Mode**: Use test API keys (starting with `pk_test_` and `sk_test_`)
   - Test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC

2. **Live Mode**: Switch to live keys (starting with `pk_live_` and `sk_live_`)
   - Only after thorough testing in test mode
   - Ensure webhook endpoint is accessible via HTTPS

3. **Test the Flow**:
   - Create a booking through the frontend
   - Complete payment with a test card
   - Verify booking status updates to "Paid"
   - Check that confirmation emails are sent

## PayPal Setup

### Step 1: Create a PayPal Business Account

1. Go to [https://www.paypal.com/business](https://www.paypal.com/business)
2. Create a business account or upgrade existing account
3. Complete the verification process

### Step 2: Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com)
2. Navigate to **My Apps & Credentials**
3. Click **Create App**
4. Enter app name and select environment (Sandbox for testing, Live for production)
5. Click **Create App**
6. Copy the **Client ID** and **Secret**

### Step 3: Configure Environment Variables

#### Backend Configuration

```bash
# PayPal Client ID
BC_PAYPAL_CLIENT_ID=your_paypal_client_id

# PayPal Client Secret
BC_PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# PayPal Sandbox Mode (true for testing, false for production)
BC_PAYPAL_SANDBOX=true

# Payment Gateway Selection
BC_PAYMENT_GATEWAY=PayPal
```

#### Frontend Configuration

```bash
# PayPal Client ID
VITE_BC_PAYPAL_CLIENT_ID=your_paypal_client_id

# PayPal Debug Mode (optional, for development)
VITE_BC_PAYPAL_DEBUG=false

# Payment Gateway Selection
VITE_BC_PAYMENT_GATEWAY=PayPal
```

### Step 4: Test PayPal Integration

1. **Sandbox Testing**:
   - Use PayPal sandbox test accounts
   - Create test accounts in PayPal Developer Dashboard
   - Test with sandbox credentials

2. **Live Mode**:
   - Switch `BC_PAYPAL_SANDBOX` to `false`
   - Use live credentials from PayPal Dashboard

## Environment Variables Summary

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BC_PAYMENT_GATEWAY` | Payment gateway: `Stripe` or `PayPal` | Yes | `Stripe` |
| `BC_STRIPE_SECRET_KEY` | Stripe secret API key | Yes (if Stripe) | - |
| `BC_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Recommended | - |
| `BC_STRIPE_SESSION_EXPIRE_AT` | Checkout session expiration (seconds) | No | `82800` |
| `BC_PAYPAL_CLIENT_ID` | PayPal client ID | Yes (if PayPal) | - |
| `BC_PAYPAL_CLIENT_SECRET` | PayPal client secret | Yes (if PayPal) | - |
| `BC_PAYPAL_SANDBOX` | Use PayPal sandbox mode | No | `true` |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_BC_PAYMENT_GATEWAY` | Payment gateway: `Stripe` or `PayPal` | Yes | `Stripe` |
| `VITE_BC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes (if Stripe) | - |
| `VITE_BC_PAYPAL_CLIENT_ID` | PayPal client ID | Yes (if PayPal) | - |
| `VITE_BC_PAYPAL_DEBUG` | Enable PayPal debug mode | No | `false` |

### Mobile App Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_PAYMENT_GATEWAY` | Payment gateway: `Stripe` or `PayPal` | Yes |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes (if Stripe) |
| `EXPO_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client ID | Yes (if PayPal) |

## Testing Payments

### Stripe Test Cards

Use these test card numbers in Stripe test mode:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Visa - Success |
| `4000 0000 0000 0002` | Visa - Card declined |
| `4000 0000 0000 9995` | Visa - Insufficient funds |
| `5555 5555 5555 4444` | Mastercard - Success |
| `5200 8282 8282 8210` | Mastercard - Success |

For all test cards:
- Use any future expiry date (e.g., `12/34`)
- Use any 3-digit CVC (e.g., `123`)
- Use any postal code

### PayPal Sandbox Testing

1. Create sandbox accounts in PayPal Developer Dashboard
2. Use sandbox buyer account credentials to test payments
3. Test various scenarios:
   - Successful payment
   - Payment cancellation
   - Payment failure

### Testing Checklist

- [ ] Test successful payment flow
- [ ] Test payment cancellation
- [ ] Test payment failure handling
- [ ] Verify booking status updates correctly
- [ ] Verify confirmation emails are sent
- [ ] Test webhook delivery (Stripe)
- [ ] Test with different payment methods
- [ ] Test deposit vs. full payment options
- [ ] Test "Pay Later" option (if enabled)

## Troubleshooting

### Stripe Issues

#### Webhook Not Receiving Events

1. **Check webhook endpoint URL**:
   - Must be publicly accessible (not localhost)
   - Must use HTTPS in production
   - URL format: `https://your-domain.com/api/stripe-webhook`

2. **Verify webhook secret**:
   - Ensure `BC_STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe Dashboard
   - For local testing, use the secret from Stripe CLI

3. **Check webhook logs**:
   - View webhook delivery attempts in Stripe Dashboard > Developers > Webhooks
   - Check backend logs for webhook processing errors

4. **Test webhook manually**:
   ```bash
   # Using Stripe CLI
   stripe trigger checkout.session.completed
   ```

#### Payment Intent Not Succeeding

1. Check Stripe Dashboard > Payments for error details
2. Verify API keys are correct (test vs. live)
3. Check currency settings match between frontend and backend
4. Verify amount calculation is correct (Stripe uses smallest currency unit)

#### Embedded Checkout Not Loading

1. Verify `VITE_BC_STRIPE_PUBLISHABLE_KEY` is set correctly
2. Check browser console for errors
3. Ensure Stripe.js is loaded properly
4. Verify payment gateway is set to `Stripe` in frontend config

### PayPal Issues

#### PayPal Buttons Not Loading

1. Verify `VITE_BC_PAYPAL_CLIENT_ID` is set correctly
2. Check PayPal sandbox vs. live mode settings
3. Check browser console for errors
4. Ensure PayPal SDK is loaded properly

#### Payment Not Completing

1. Check PayPal Dashboard for transaction status
2. Verify client ID and secret match
3. Check sandbox vs. live mode configuration
4. Review PayPal transaction logs

### General Issues

#### Payment Gateway Not Working

1. **Verify environment variables are set**:
   ```bash
   # Backend
   echo $BC_PAYMENT_GATEWAY
   echo $BC_STRIPE_SECRET_KEY  # or BC_PAYPAL_CLIENT_ID
   
   # Frontend
   echo $VITE_BC_PAYMENT_GATEWAY
   echo $VITE_BC_STRIPE_PUBLISHABLE_KEY  # or VITE_BC_PAYPAL_CLIENT_ID
   ```

2. **Check payment gateway selection**:
   - Backend and frontend must use the same gateway
   - Restart services after changing environment variables

3. **Verify API keys are correct**:
   - Test keys for development
   - Live keys for production
   - Keys must match the selected environment

#### Booking Status Not Updating

1. Check webhook delivery (Stripe) or order status (PayPal)
2. Verify booking controller is processing payments correctly
3. Check database for booking status updates
4. Review backend logs for errors

#### Emails Not Sending After Payment

1. Verify SMTP configuration is correct
2. Check email service logs
3. Ensure booking confirmation function is called
4. Check spam folder for confirmation emails

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Add `.env` files to `.gitignore`

2. **Use test mode during development**
   - Test with test API keys
   - Switch to live keys only in production

3. **Verify webhook signatures**
   - Always verify Stripe webhook signatures
   - Use HTTPS for webhook endpoints

4. **Keep API keys secure**
   - Rotate keys periodically
   - Use different keys for test and production
   - Limit API key permissions when possible

5. **Monitor payment activity**
   - Regularly check Stripe/PayPal dashboards
   - Set up alerts for failed payments
   - Review webhook delivery logs

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [PayPal Developer Documentation](https://developer.paypal.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [PayPal Sandbox Testing](https://developer.paypal.com/docs/api-basics/sandbox/)

## Support

For issues related to:
- **Stripe**: Contact [Stripe Support](https://support.stripe.com)
- **PayPal**: Contact [PayPal Developer Support](https://developer.paypal.com/support)
- **BookCars Integration**: Check the [GitHub Issues](https://github.com/aelassas/bookcars/issues) or create a new issue


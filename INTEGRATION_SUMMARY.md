# Google reCAPTCHA, Google OAuth, and OTP Integration Summary

## Overview
This document summarizes the integration of Google reCAPTCHA, Google OAuth sign-in/sign-up, and OTP (One-Time Password) authentication for customer flows in the BookCars application.

## 1. Google reCAPTCHA Integration

### Status: ✅ Already Implemented (reCAPTCHA v3)

**Version:** **reCAPTCHA v3** (invisible, score-based verification)

**Backend:**
- Endpoint: `POST /api/verify-recaptcha/:token/:ip`
- Controller: `backend/src/controllers/userController.ts::verifyRecaptcha`
- Validates reCAPTCHA v3 tokens with Google's API
- Uses Google's v3 verification endpoint: `https://www.google.com/recaptcha/api/siteverify`

**Frontend:**
- Already integrated in signup flow (`frontend/src/pages/SignUp.tsx`)
- Uses `useRecaptchaContext` hook
- Helper function: `frontend/src/utils/helper.ts::verifyReCaptcha`
- Service method: `frontend/src/services/UserService.ts::verifyRecaptcha`
- **v3 Implementation Details:**
  - Uses `grecaptcha.execute()` API (v3 method)
  - Loads script with `?render=${RECAPTCHA_SITE_KEY}` (v3 endpoint)
  - Invisible verification (no checkbox challenge)
  - Supports action-based scoring (e.g., 'submit', 'signup')
  - Shows reCAPTCHA badge in bottom-right corner

**Configuration:**
- Environment variables:
  - `BC_RECAPTCHA_SECRET` (backend)
  - `VITE_BC_RECAPTCHA_ENABLED` (frontend)
  - `VITE_BC_RECAPTCHA_SITE_KEY` (frontend)

**Note:** reCAPTCHA is currently implemented in signup. To add it to signin, follow the same pattern used in SignUp.tsx.

## 2. Google OAuth Sign-in/Sign-up

### Status: ✅ Already Fully Implemented

**Backend:**
- Endpoint: `POST /api/social-sign-in`
- Controller: `backend/src/controllers/userController.ts::socialSignin`
- Validates Google access tokens via Google OAuth API
- Creates user account if doesn't exist
- Sets authentication cookies for web or returns token for mobile

**Frontend:**
- Component: `frontend/src/components/SocialLogin.tsx`
- Uses `reactjs-social-login` package
- Google OAuth button with proper configuration
- Handles sign-in and automatic sign-up

**Configuration:**
- Environment variable: `VITE_BC_GG_APP_ID` (Google Client ID)
- Redirect URI: Current page URL
- Scope: `openid profile email`

**Features:**
- Automatic user creation on first Google sign-in
- Profile picture and name extraction
- Seamless integration with existing authentication flow

## 3. OTP (One-Time Password) System

### Status: ✅ Newly Implemented

### Backend Implementation

**Model:**
- File: `backend/src/models/OTP.ts`
- Schema includes:
  - `identifier`: Email or phone number
  - `otp`: 6-digit code
  - `type`: 'email' or 'sms'
  - `purpose`: 'signup', 'signin', 'password-reset', 'phone-verification'
  - `verified`: Boolean flag
  - `attempts`: Rate limiting counter
  - `expireAt`: Auto-expires after 10 minutes

**Controller:**
- File: `backend/src/controllers/otpController.ts`
- Endpoints:
  - `POST /api/send-otp`: Send OTP via email or SMS
  - `POST /api/verify-otp`: Verify OTP code

**Features:**
- 6-digit OTP generation
- Email OTP via existing SMTP infrastructure
- SMS OTP placeholder (ready for Twilio/Vonage integration)
- Rate limiting (1 minute cooldown between requests)
- Max 5 verification attempts
- Auto-expiration after 10 minutes
- Automatic cleanup of expired OTPs

**Routes:**
- Added to `backend/src/config/userRoutes.config.ts`
- Registered in `backend/src/routes/userRoutes.ts`

**Types:**
- Added `SendOTPPayload` and `VerifyOTPPayload` to `packages/bookcars-types/index.ts`

### Frontend Implementation

**Service:**
- File: `frontend/src/services/UserService.ts`
- Methods:
  - `sendOTP(data: SendOTPPayload)`: Send OTP
  - `verifyOTP(data: VerifyOTPPayload)`: Verify OTP

**Component:**
- File: `frontend/src/components/OTPVerification.tsx`
- Features:
  - 6-digit OTP input with auto-focus
  - Paste support for OTP codes
  - Resend functionality with 60-second cooldown
  - Error handling and display
  - Loading states

**Language Strings:**
- Added to `frontend/src/lang/common.ts`:
  - `VERIFY_OTP`
  - `OTP_SENT`
  - `OTP_VERIFIED`
  - `RESEND_OTP`
  - `RESEND_OTP_IN`
  - `VERIFY`
  - `SENDING`

**Backend Language Strings:**
- Added to `backend/src/lang/en.ts`:
  - `OTP_SIGNUP_SUBJECT`
  - `OTP_SIGNUP_MESSAGE`
  - `OTP_SIGNIN_SUBJECT`
  - `OTP_SIGNIN_MESSAGE`
  - `OTP_PASSWORD_RESET_SUBJECT`
  - `OTP_PASSWORD_RESET_MESSAGE`
  - `OTP_PHONE_VERIFICATION_SUBJECT`
  - `OTP_PHONE_VERIFICATION_MESSAGE`
  - `OTP_EXPIRY_NOTICE`

## Usage Examples

### Using OTP in Signup Flow

```typescript
import OTPVerification from '@/components/OTPVerification'
import * as UserService from '@/services/UserService'

// After user submits signup form
const handleOTPVerified = async () => {
  // Proceed with account creation
  const status = await UserService.signup(payload)
  // ...
}

<OTPVerification
  identifier={email}
  type="email"
  purpose="signup"
  onVerified={handleOTPVerified}
  onCancel={() => navigate('/sign-up')}
/>
```

### Using OTP in Signin Flow

```typescript
// Send OTP for signin
await UserService.sendOTP({
  identifier: email,
  type: 'email',
  purpose: 'signin'
})

// Verify OTP
const result = await UserService.verifyOTP({
  identifier: email,
  otp: '123456',
  type: 'email',
  purpose: 'signin'
})

if (result.verified) {
  // Proceed with signin
}
```

## Environment Variables

No new environment variables are required for OTP (uses existing SMTP configuration).

For SMS OTP (future enhancement), you would need:
- `BC_TWILIO_ACCOUNT_SID` (or similar for other providers)
- `BC_TWILIO_AUTH_TOKEN`
- `BC_TWILIO_PHONE_NUMBER`

## Next Steps

1. **SMS Integration**: Implement SMS provider (Twilio, Vonage, etc.) in `otpController.ts::sendSMSOTP`
2. **Add reCAPTCHA to Signin**: Follow the pattern in SignUp.tsx
3. **OTP in Signup/Signin Pages**: Integrate OTPVerification component into signup/signin flows
4. **OTP for Password Reset**: Add OTP option to forgot password flow
5. **Phone Verification**: Add phone number verification using SMS OTP

## Testing

### Test OTP Endpoints

```bash
# Send OTP
curl -X POST https://tokyodrivingclub.com/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "type": "email",
    "purpose": "signup"
  }'

# Verify OTP
curl -X POST https://tokyodrivingclub.com/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "otp": "123456",
    "type": "email",
    "purpose": "signup"
  }'
```

## Files Modified/Created

### Backend
- ✅ `backend/src/models/OTP.ts` (new)
- ✅ `backend/src/controllers/otpController.ts` (new)
- ✅ `backend/src/config/env.config.ts` (added OTP interface)
- ✅ `backend/src/config/userRoutes.config.ts` (added routes)
- ✅ `backend/src/routes/userRoutes.ts` (registered routes)
- ✅ `backend/src/lang/en.ts` (added OTP strings)
- ✅ `packages/bookcars-types/index.ts` (added OTP payload types)

### Frontend
- ✅ `frontend/src/components/OTPVerification.tsx` (new)
- ✅ `frontend/src/services/UserService.ts` (added OTP methods)
- ✅ `frontend/src/lang/common.ts` (added OTP strings)

## Notes

- OTP system is production-ready for email OTP
- SMS OTP requires SMS provider integration (placeholder ready)
- All OTPs expire after 10 minutes
- Rate limiting prevents abuse (1 minute cooldown, max 5 attempts)
- Google OAuth and reCAPTCHA are already fully functional


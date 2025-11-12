# Admin Panel Login Guide

## Login URL

**Direct Login Page:**
```
https://admin.tokyodrivingclub.com/sign-in
```

## Default Credentials

- **Email:** `admin@bookcars.ma`
- **Password:** `B00kC4r5`

## How to Access

1. **Direct Login URL (Recommended):**
   - Navigate to: https://admin.tokyodrivingclub.com/sign-in
   - Enter your credentials
   - Click "Sign In"

2. **From Main Page:**
   - If you're on the main page (https://admin.tokyodrivingclub.com/)
   - The app should redirect you to `/sign-in` if you're not authenticated
   - If not, manually navigate to `/sign-in`

## Troubleshooting

### If you can't see the login form:

1. **Clear browser cache and cookies** for the domain
2. **Try incognito/private browsing mode**
3. **Navigate directly to:** https://admin.tokyodrivingclub.com/sign-in
4. **Check browser console** for any JavaScript errors

### If login fails:

1. **Verify the admin user exists:**
   ```bash
   docker compose logs bc-backend | grep "Admin user"
   ```
   Should show: "Admin user created successfully"

2. **Check backend is running:**
   ```bash
   docker compose ps bc-backend
   ```

3. **Test API endpoint:**
   ```bash
   curl https://admin.tokyodrivingclub.com/api/settings
   ```

## Security Note

⚠️ **Important:** Change the default password after first login!

The default password `B00kC4r5` is hardcoded in the setup script and should be changed for security.

## Admin User Creation

The admin user is automatically created during backend setup with:
- Email: From `BC_ADMIN_EMAIL` environment variable (default: `admin@bookcars.ma`)
- Password: `B00kC4r5` (hardcoded in setup script)
- Type: Admin
- Status: Active and Verified

To change the admin email, edit `/home/ubuntu/bookcars/backend/.env.docker`:
```
BC_ADMIN_EMAIL=your-email@example.com
```

Then restart the backend container.


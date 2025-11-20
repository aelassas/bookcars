# Admin Bootstrap Confirmation

## ✅ Admin User Successfully Bootstrapped

### Database Details
- **Collection:** `User` (capital U - this is important!)
- **Database:** `bookcars`
- **Status:** ✅ Created and verified

### Admin Credentials
- **Email:** `admin@bookcars.ma`
- **Password:** `B00kC4r5`
- **Type:** `admin`
- **Active:** `true`
- **Verified:** `true`
- **Full Name:** `admin`

### Login Information
- **Admin Panel URL:** https://admin.tokyodrivingclub.com/sign-in
- **Direct Login Path:** `/sign-in`

### Important Notes

1. **Collection Name:** The User model uses the collection name `User` (capital U), not `users` (lowercase). This is defined in `/home/ubuntu/bookcars/backend/src/models/User.ts`:
   ```typescript
   collection: 'User',
   ```

2. **Bootstrap Process:** The admin user is automatically created during backend startup via the setup script (`backend/src/setup/setup.js`). The setup script:
   - Checks if admin user exists by email
   - Creates admin user if it doesn't exist
   - Uses password: `B00kC4r5` (hardcoded in setup script)
   - Uses email from `BC_ADMIN_EMAIL` environment variable

3. **Environment Variable:** The admin email is configured in `/home/ubuntu/bookcars/backend/.env.docker`:
   ```
   BC_ADMIN_EMAIL=admin@bookcars.ma
   ```

### Verification Commands

To verify the admin user exists:
```bash
docker compose exec bc-backend node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.BC_DB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}), 'User');
  const admin = await User.findOne({email: 'admin@bookcars.ma'});
  console.log('Admin exists:', !!admin);
  if (admin) {
    console.log('Email:', admin.email);
    console.log('Type:', admin.type);
    console.log('Active:', admin.active);
    console.log('Verified:', admin.verified);
  }
  await mongoose.disconnect();
});
"
```

### Troubleshooting

If login fails:
1. Verify admin user exists in `User` collection (not `users`)
2. Check backend logs: `docker compose logs bc-backend | grep -i admin`
3. Test API endpoint: `curl -X POST https://admin.tokyodrivingclub.com/api/sign-in/admin -H "Content-Type: application/json" -d '{"email":"admin@bookcars.ma","password":"B00kC4r5"}'`
4. Check backend is running: `docker compose ps bc-backend`

### Security Recommendation

⚠️ **Change the default password after first login!**

The default password `B00kC4r5` is hardcoded in the setup script and should be changed for security.


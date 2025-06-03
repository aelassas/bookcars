# Dress Rental Database Initialization Guide

This directory contains comprehensive scripts to initialize a fresh dress rental database and migrate from car rental systems.

## � Quick Start - Fresh Database Initialization (Recommended)

For new installations or clean setups, use the database initialization script:

```bash
# 1. Navigate to scripts directory
cd api/scripts

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp ../env.example ../.env
# Edit .env with your database connection details

# 4. Initialize fresh dress rental database
npm run init-db
```

This will create a complete dress rental database with:
- ✅ Admin user (admin@bookdresses.com / admin123)
- ✅ Sample suppliers and locations
- ✅ 6 sample dresses (wedding, evening, cocktail, prom, casual)
- ✅ Sample users and bookings
- ✅ Proper indexes for performance
- ✅ Arabic language support

## 🚨 Migration Warnings (For Existing Car Rental Systems)

1. **BACKUP YOUR DATABASE** before running any migration scripts
2. **TEST ON DEVELOPMENT ENVIRONMENT** first
3. **This migration is IRREVERSIBLE** without a backup
4. **All car-related data will be PERMANENTLY DELETED**

## 📁 Migration Files

### Database Initialization Scripts

1. **`init-dress-database.js`** - Fresh database initialization with dress data (RECOMMENDED)
2. **`package.json`** - NPM scripts for easy execution

### Migration Scripts (For Existing Car Systems)

3. **`comprehensive-car-to-dress-migration.js`** - Main MongoDB migration script
4. **`car-to-dress-migration.sql`** - SQL migration for PostgreSQL/MySQL/SQL Server
5. **`CarToDressMigration.cs`** - Entity Framework Core migration for .NET
6. **`run-migration.sh`** - Safe migration runner with backup and rollback
7. **`verify-migration.js`** - Post-migration verification script

### Legacy Scripts (for reference)
- `migrate-car-to-dress.js` - Original simple migration script

## 🔄 Migration Process Overview

The migration performs the following operations:

### 1. **Data Removal**
- Drops `Car` collection/table entirely
- Removes car-specific properties from all collections
- Cleans up car-related indexes and constraints

### 2. **Schema Updates**
- Renames `car` fields to `dress` in Bookings and Notifications
- Updates User collection (supplierCarLimit → supplierDressLimit)
- Removes car-specific fields (fuel, gearbox, mileage, etc.)

### 3. **New Dress Properties**
- Adds dress-specific fields (type, size, style, material, color, length)
- Creates dress metadata (customizable, accessories, rentals count)
- Adds designer information and care instructions

### 4. **Performance Optimization**
- Creates indexes for dress-specific queries
- Optimizes for common dress rental search patterns

## 🚀 Quick Start (Recommended)

### For MongoDB (Node.js)

```bash
# 1. Navigate to scripts directory
cd api/scripts

# 2. Install dependencies (if needed)
npm install mongoose dotenv

# 3. Set up environment variables
cp ../env.example ../.env
# Edit .env with your database connection details

# 4. Run the safe migration script
chmod +x run-migration.sh
./run-migration.sh
```

### For SQL Databases

```bash
# 1. Review and customize the SQL script for your database
# 2. Create a backup
mysqldump -u username -p database_name > backup.sql

# 3. Run the migration
mysql -u username -p database_name < car-to-dress-migration.sql
```

### For .NET Entity Framework Core

```bash
# 1. Add the migration file to your project
# 2. Run the migration
dotnet ef database update CarToDressMigration
```

## 📋 Pre-Migration Checklist

- [ ] **Database backup created and verified**
- [ ] **Migration tested on development environment**
- [ ] **All applications using the database are stopped**
- [ ] **Environment variables configured correctly**
- [ ] **Sufficient disk space for backup and migration**
- [ ] **Database connection credentials verified**

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `api` directory with:

```env
BC_MONGODB_URI=mongodb://localhost:27017/bookdresses
BC_DB_NAME=bookdresses
BC_DEFAULT_LANGUAGE=ar
BC_TIMEZONE=Asia/Jerusalem
BC_BASE_CURRENCY=ILS
```

### Database Connection

Update the connection string in the migration scripts:

**MongoDB:**
```javascript
const MONGODB_URI = process.env.BC_MONGODB_URI || 'mongodb://localhost:27017/bookdresses';
```

**SQL:**
```sql
-- Update connection details in the SQL script header
```

## 📊 Migration Details

### Removed Car Properties
- `aircon` (air conditioning)
- `mileage` 
- `theftProtection`
- `collisionDamageWaiver`
- `fullInsurance`
- `additionalDriver`
- `seats`
- `doors`
- `gearbox`
- `fuelPolicy`
- `multimedia`
- `co2`
- `range`

### Added Dress Properties
- `type` (wedding, evening, cocktail, casual, prom, bridesmaid)
- `size` (xs, s, m, l, xl, xxl, custom)
- `style` (traditional, modern, designer, vintage, bohemian, minimalist)
- `material` (silk, cotton, lace, satin, chiffon, tulle, organza, velvet)
- `color` (white, ivory, black, red, blue, etc.)
- `length` (in centimeters)
- `customizable` (boolean)
- `accessories` (array of accessories)
- `rentals` (rental count)
- `designerName`
- `careInstructions`
- `occasionTags`
- `season`

### Collection/Table Changes

| Original | New | Action |
|----------|-----|--------|
| `Car` | `Dress` | Renamed/Recreated |
| `Booking.car` | `Booking.dress` | Field renamed |
| `Notification.car` | `Notification.dress` | Field renamed |
| `User.supplierCarLimit` | `User.supplierDressLimit` | Field renamed |

## 🔍 Verification

After migration, run the verification script:

```bash
node verify-migration.js
```

The verification checks:
- ✅ Car collection removed
- ✅ Dress collection structure
- ✅ Booking references updated
- ✅ User fields migrated
- ✅ Indexes created
- ✅ Data integrity maintained

## 🔄 Rollback Procedure

If migration fails or issues are discovered:

### Automatic Rollback
```bash
# The run-migration.sh script offers automatic rollback on failure
./run-migration.sh
# Follow prompts if migration fails
```

### Manual Rollback
```bash
# Restore from backup (MongoDB)
mongorestore --uri="mongodb://localhost:27017/bookdresses" --drop /path/to/backup

# Restore from backup (SQL)
mysql -u username -p database_name < backup.sql
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify database is running
   - Check connection string
   - Ensure proper credentials

2. **Permission Errors**
   - Ensure database user has admin privileges
   - Check file permissions on scripts

3. **Memory Issues**
   - Large datasets may require increased memory
   - Consider running migration in batches

4. **Timeout Errors**
   - Increase connection timeout
   - Run during low-traffic periods

### Getting Help

1. Check the verification script output
2. Review migration logs
3. Examine database state manually
4. Restore from backup if needed

## 📈 Performance Considerations

- **Large Datasets**: Migration time scales with data size
- **Indexes**: New indexes improve query performance
- **Downtime**: Plan for application downtime during migration
- **Resources**: Ensure adequate CPU and memory

## 🔒 Security Notes

- Migration scripts require admin database access
- Backup files contain sensitive data
- Secure backup storage location
- Clean up temporary files after migration

## 📝 Post-Migration Tasks

1. **Update Application Code**
   - Update API endpoints from `/cars` to `/dresses`
   - Modify frontend components
   - Update documentation

2. **Test Application**
   - Verify all dress rental functionality
   - Test booking process
   - Validate user management

3. **Monitor Performance**
   - Check query performance
   - Monitor index usage
   - Optimize as needed

4. **Clean Up**
   - Remove old backup files (after verification)
   - Update deployment scripts
   - Archive migration scripts

## 📞 Support

For issues or questions:
1. Review this documentation
2. Check verification script output
3. Examine application logs
4. Contact development team

---

**Remember: Always backup your data before running any migration!** 🔐

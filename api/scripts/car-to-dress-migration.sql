-- =====================================================
-- Comprehensive Car to Dress Rental Migration Script
-- =====================================================
-- This SQL script migrates a car rental database to a dress rental database
-- Compatible with PostgreSQL, MySQL, and SQL Server (with minor syntax adjustments)
-- 
-- IMPORTANT: 
-- 1. Backup your database before running this script
-- 2. Test on a development environment first
-- 3. Adjust data types and syntax for your specific database system
-- =====================================================

-- Step 1: Create new dress-specific tables if they don't exist
-- =====================================================

-- Create DressTypes table
CREATE TABLE IF NOT EXISTS DressTypes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dress types
INSERT IGNORE INTO DressTypes (name, description) VALUES
('wedding', 'Wedding dresses for special ceremonies'),
('evening', 'Elegant evening gowns for formal events'),
('cocktail', 'Cocktail dresses for semi-formal occasions'),
('casual', 'Casual dresses for everyday wear'),
('prom', 'Prom dresses for graduation events'),
('bridesmaid', 'Bridesmaid dresses for wedding parties');

-- Create DressSizes table
CREATE TABLE IF NOT EXISTS DressSizes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    size_code VARCHAR(10) NOT NULL UNIQUE,
    size_name VARCHAR(50) NOT NULL,
    measurements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dress sizes
INSERT IGNORE INTO DressSizes (size_code, size_name, measurements) VALUES
('xs', 'Extra Small', 'Bust: 32", Waist: 24", Hips: 34"'),
('s', 'Small', 'Bust: 34", Waist: 26", Hips: 36"'),
('m', 'Medium', 'Bust: 36", Waist: 28", Hips: 38"'),
('l', 'Large', 'Bust: 38", Waist: 30", Hips: 40"'),
('xl', 'Extra Large', 'Bust: 40", Waist: 32", Hips: 42"'),
('xxl', 'Double Extra Large', 'Bust: 42", Waist: 34", Hips: 44"'),
('custom', 'Custom Size', 'Made to measure');

-- Create DressMaterials table
CREATE TABLE IF NOT EXISTS DressMaterials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    care_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dress materials
INSERT IGNORE INTO DressMaterials (name, description, care_instructions) VALUES
('silk', 'Luxurious natural fiber', 'Dry clean only'),
('cotton', 'Breathable natural fiber', 'Machine washable'),
('lace', 'Delicate decorative fabric', 'Hand wash or dry clean'),
('satin', 'Smooth lustrous fabric', 'Dry clean recommended'),
('chiffon', 'Lightweight sheer fabric', 'Gentle hand wash or dry clean'),
('tulle', 'Fine mesh fabric', 'Hand wash gently'),
('organza', 'Crisp sheer fabric', 'Dry clean only'),
('velvet', 'Soft pile fabric', 'Professional cleaning only');

-- Create DressStyles table
CREATE TABLE IF NOT EXISTS DressStyles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dress styles
INSERT IGNORE INTO DressStyles (name, description) VALUES
('traditional', 'Classic traditional designs'),
('modern', 'Contemporary modern styles'),
('designer', 'High-end designer pieces'),
('vintage', 'Retro and vintage inspired'),
('bohemian', 'Free-spirited boho style'),
('minimalist', 'Clean and simple designs');

-- Step 2: Drop car-related tables
-- =====================================================

-- Drop car-specific tables (adjust table names as needed)
DROP TABLE IF EXISTS CarTypes;
DROP TABLE IF EXISTS CarModels;
DROP TABLE IF EXISTS CarFeatures;
DROP TABLE IF EXISTS FuelTypes;
DROP TABLE IF EXISTS GearboxTypes;
DROP TABLE IF EXISTS Cars;

-- Step 3: Modify existing tables
-- =====================================================

-- Update Dresses table (assuming it exists, or rename from Cars table)
-- If Cars table exists and needs to be converted to Dresses:

-- Option A: If you have a Cars table to convert
-- RENAME TABLE Cars TO Dresses;

-- Modify Dresses table structure
ALTER TABLE Dresses 
-- Remove car-specific columns
DROP COLUMN IF EXISTS fuel_type,
DROP COLUMN IF EXISTS gearbox_type,
DROP COLUMN IF EXISTS engine_size,
DROP COLUMN IF EXISTS doors,
DROP COLUMN IF EXISTS seats,
DROP COLUMN IF EXISTS mileage,
DROP COLUMN IF EXISTS air_conditioning,
DROP COLUMN IF EXISTS theft_protection,
DROP COLUMN IF EXISTS collision_damage_waiver,
DROP COLUMN IF EXISTS full_insurance,
DROP COLUMN IF EXISTS additional_driver_fee,

-- Add dress-specific columns
ADD COLUMN IF NOT EXISTS dress_type VARCHAR(50) DEFAULT 'casual',
ADD COLUMN IF NOT EXISTS dress_size VARCHAR(10) DEFAULT 'm',
ADD COLUMN IF NOT EXISTS dress_style VARCHAR(50) DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS material VARCHAR(50) DEFAULT 'cotton',
ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'white',
ADD COLUMN IF NOT EXISTS length_cm INT DEFAULT 120,
ADD COLUMN IF NOT EXISTS customizable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS designer_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS accessories TEXT, -- JSON array of accessories
ADD COLUMN IF NOT EXISTS rental_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS care_instructions TEXT,
ADD COLUMN IF NOT EXISTS occasion_tags TEXT, -- JSON array of occasions
ADD COLUMN IF NOT EXISTS season VARCHAR(20) DEFAULT 'all-season';

-- Update Bookings table
ALTER TABLE Bookings 
-- Rename car_id to dress_id if it exists
CHANGE COLUMN car_id dress_id INT,
-- Remove car-specific booking fields
DROP COLUMN IF EXISTS fuel_policy,
DROP COLUMN IF EXISTS mileage_limit,
DROP COLUMN IF EXISTS insurance_type,
DROP COLUMN IF EXISTS additional_driver,
-- Add dress-specific booking fields
ADD COLUMN IF NOT EXISTS fitting_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fitting_date DATETIME,
ADD COLUMN IF NOT EXISTS alteration_notes TEXT,
ADD COLUMN IF NOT EXISTS accessories_included TEXT; -- JSON array

-- Update Users table
ALTER TABLE Users 
-- Rename car-related fields to dress-related
CHANGE COLUMN supplier_car_limit supplier_dress_limit INT DEFAULT 10,
CHANGE COLUMN notify_admin_on_new_car notify_admin_on_new_dress BOOLEAN DEFAULT TRUE;

-- Update Notifications table
ALTER TABLE Notifications 
-- Rename car_id to dress_id if it exists
CHANGE COLUMN car_id dress_id INT;

-- Step 4: Create indexes for performance
-- =====================================================

-- Indexes for Dresses table
CREATE INDEX idx_dresses_type ON Dresses(dress_type);
CREATE INDEX idx_dresses_size ON Dresses(dress_size);
CREATE INDEX idx_dresses_style ON Dresses(dress_style);
CREATE INDEX idx_dresses_material ON Dresses(material);
CREATE INDEX idx_dresses_color ON Dresses(color);
CREATE INDEX idx_dresses_available ON Dresses(available);
CREATE INDEX idx_dresses_price ON Dresses(daily_price);
CREATE INDEX idx_dresses_rental_count ON Dresses(rental_count);
CREATE INDEX idx_dresses_designer ON Dresses(designer_name);

-- Composite indexes for common queries
CREATE INDEX idx_dresses_type_size_available ON Dresses(dress_type, dress_size, available);
CREATE INDEX idx_dresses_price_available ON Dresses(daily_price, available);
CREATE INDEX idx_dresses_location_available ON Dresses(location_id, available);

-- Indexes for Bookings table
CREATE INDEX idx_bookings_dress ON Bookings(dress_id);
CREATE INDEX idx_bookings_dates ON Bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON Bookings(status);

-- Step 5: Update data values
-- =====================================================

-- Convert any remaining car data to dress data
UPDATE Dresses 
SET 
    dress_type = CASE 
        WHEN name LIKE '%wedding%' OR name LIKE '%bridal%' THEN 'wedding'
        WHEN name LIKE '%evening%' OR name LIKE '%formal%' THEN 'evening'
        WHEN name LIKE '%cocktail%' OR name LIKE '%party%' THEN 'cocktail'
        WHEN name LIKE '%prom%' THEN 'prom'
        ELSE 'casual'
    END,
    dress_size = 'm', -- Default size, should be updated based on actual data
    material = 'cotton', -- Default material, should be updated
    color = 'white' -- Default color, should be updated
WHERE dress_type IS NULL OR dress_type = '';

-- Update rental counts based on booking history
UPDATE Dresses d
SET rental_count = (
    SELECT COUNT(*) 
    FROM Bookings b 
    WHERE b.dress_id = d.id 
    AND b.status IN ('completed', 'paid')
);

-- Step 6: Create foreign key constraints
-- =====================================================

-- Add foreign key constraints for data integrity
ALTER TABLE Dresses 
ADD CONSTRAINT fk_dresses_type 
    FOREIGN KEY (dress_type) REFERENCES DressTypes(name),
ADD CONSTRAINT fk_dresses_size 
    FOREIGN KEY (dress_size) REFERENCES DressSizes(size_code),
ADD CONSTRAINT fk_dresses_material 
    FOREIGN KEY (material) REFERENCES DressMaterials(name),
ADD CONSTRAINT fk_dresses_style 
    FOREIGN KEY (dress_style) REFERENCES DressStyles(name);

ALTER TABLE Bookings 
ADD CONSTRAINT fk_bookings_dress 
    FOREIGN KEY (dress_id) REFERENCES Dresses(id) ON DELETE CASCADE;

-- Step 7: Create views for common queries
-- =====================================================

-- View for available dresses with full details
CREATE OR REPLACE VIEW AvailableDresses AS
SELECT 
    d.*,
    dt.description as type_description,
    ds.size_name,
    dm.description as material_description,
    dst.description as style_description
FROM Dresses d
LEFT JOIN DressTypes dt ON d.dress_type = dt.name
LEFT JOIN DressSizes ds ON d.dress_size = ds.size_code
LEFT JOIN DressMaterials dm ON d.material = dm.name
LEFT JOIN DressStyles dst ON d.dress_style = dst.name
WHERE d.available = TRUE;

-- View for popular dresses
CREATE OR REPLACE VIEW PopularDresses AS
SELECT 
    d.*,
    d.rental_count,
    AVG(r.rating) as average_rating
FROM Dresses d
LEFT JOIN Reviews r ON d.id = r.dress_id
WHERE d.available = TRUE
GROUP BY d.id
ORDER BY d.rental_count DESC, average_rating DESC;

-- Step 8: Insert sample dress data (optional)
-- =====================================================

-- Insert sample dresses if the table is empty
INSERT INTO Dresses (
    name, dress_type, dress_size, dress_style, material, color, 
    length_cm, daily_price, deposit, available, customizable, 
    designer_name, description
) VALUES
('Elegant Silk Wedding Gown', 'wedding', 'm', 'traditional', 'silk', 'ivory', 180, 150.00, 500.00, TRUE, TRUE, 'Vera Wang', 'Beautiful traditional wedding dress with intricate beadwork'),
('Modern Cocktail Dress', 'cocktail', 's', 'modern', 'satin', 'black', 100, 75.00, 200.00, TRUE, FALSE, 'Calvin Klein', 'Sleek modern cocktail dress perfect for evening events'),
('Vintage Evening Gown', 'evening', 'l', 'vintage', 'velvet', 'burgundy', 160, 120.00, 350.00, TRUE, FALSE, 'Oscar de la Renta', 'Stunning vintage-inspired evening gown'),
('Bohemian Summer Dress', 'casual', 'm', 'bohemian', 'cotton', 'floral', 120, 45.00, 100.00, TRUE, FALSE, NULL, 'Comfortable bohemian dress perfect for summer occasions');

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verification queries (run these to verify the migration)
SELECT 'Dresses Count' as metric, COUNT(*) as value FROM Dresses
UNION ALL
SELECT 'Available Dresses', COUNT(*) FROM Dresses WHERE available = TRUE
UNION ALL
SELECT 'Bookings Count', COUNT(*) FROM Bookings
UNION ALL
SELECT 'Dress Types', COUNT(*) FROM DressTypes
UNION ALL
SELECT 'Dress Sizes', COUNT(*) FROM DressSizes
UNION ALL
SELECT 'Dress Materials', COUNT(*) FROM DressMaterials;

-- Show sample data
SELECT 'Sample Dresses:' as info;
SELECT id, name, dress_type, dress_size, material, color, daily_price 
FROM Dresses 
LIMIT 5;

COMMIT;

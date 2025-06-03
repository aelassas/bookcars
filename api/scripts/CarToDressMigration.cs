using Microsoft.EntityFrameworkCore.Migrations;
using System;

#nullable disable

namespace BookDresses.Migrations
{
    /// <summary>
    /// Comprehensive migration from car rental to dress rental system
    /// This migration removes all car-related entities and creates dress-related ones
    /// </summary>
    public partial class CarToDressMigration : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Drop car-related tables and constraints
            DropCarRelatedTables(migrationBuilder);

            // Step 2: Create dress-related tables
            CreateDressRelatedTables(migrationBuilder);

            // Step 3: Modify existing tables
            ModifyExistingTables(migrationBuilder);

            // Step 4: Create indexes for performance
            CreateIndexes(migrationBuilder);

            // Step 5: Seed dress-related data
            SeedDressData(migrationBuilder);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse the migration - recreate car tables and drop dress tables
            // Note: This will result in data loss!
            
            // Drop dress-related tables
            migrationBuilder.DropTable("DressAccessories");
            migrationBuilder.DropTable("Dresses");
            migrationBuilder.DropTable("DressTypes");
            migrationBuilder.DropTable("DressSizes");
            migrationBuilder.DropTable("DressMaterials");
            migrationBuilder.DropTable("DressStyles");

            // Restore car-related columns in existing tables
            migrationBuilder.RenameColumn(
                name: "DressId",
                table: "Bookings",
                newName: "CarId");

            migrationBuilder.RenameColumn(
                name: "DressId",
                table: "Notifications",
                newName: "CarId");

            migrationBuilder.RenameColumn(
                name: "SupplierDressLimit",
                table: "Users",
                newName: "SupplierCarLimit");

            migrationBuilder.RenameColumn(
                name: "NotifyAdminOnNewDress",
                table: "Users",
                newName: "NotifyAdminOnNewCar");
        }

        private void DropCarRelatedTables(MigrationBuilder migrationBuilder)
        {
            // Drop car-related tables if they exist
            migrationBuilder.Sql(@"
                IF OBJECT_ID('Cars', 'U') IS NOT NULL
                    DROP TABLE Cars;
                
                IF OBJECT_ID('CarTypes', 'U') IS NOT NULL
                    DROP TABLE CarTypes;
                
                IF OBJECT_ID('CarModels', 'U') IS NOT NULL
                    DROP TABLE CarModels;
                
                IF OBJECT_ID('FuelTypes', 'U') IS NOT NULL
                    DROP TABLE FuelTypes;
                
                IF OBJECT_ID('GearboxTypes', 'U') IS NOT NULL
                    DROP TABLE GearboxTypes;
            ");
        }

        private void CreateDressRelatedTables(MigrationBuilder migrationBuilder)
        {
            // Create DressTypes table
            migrationBuilder.CreateTable(
                name: "DressTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DressTypes", x => x.Id);
                });

            // Create DressSizes table
            migrationBuilder.CreateTable(
                name: "DressSizes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SizeCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SizeName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Measurements = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DressSizes", x => x.Id);
                });

            // Create DressMaterials table
            migrationBuilder.CreateTable(
                name: "DressMaterials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CareInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DressMaterials", x => x.Id);
                });

            // Create DressStyles table
            migrationBuilder.CreateTable(
                name: "DressStyles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DressStyles", x => x.Id);
                });

            // Create main Dresses table
            migrationBuilder.CreateTable(
                name: "Dresses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    DressTypeId = table.Column<int>(type: "int", nullable: false),
                    DressSizeId = table.Column<int>(type: "int", nullable: false),
                    DressMaterialId = table.Column<int>(type: "int", nullable: false),
                    DressStyleId = table.Column<int>(type: "int", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LengthCm = table.Column<int>(type: "int", nullable: false),
                    DailyPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    DiscountedDailyPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    WeeklyPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    MonthlyPrice = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Deposit = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Available = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Customizable = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DesignerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    MinimumAge = table.Column<int>(type: "int", nullable: false, defaultValue: 18),
                    RentalCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Rating = table.Column<decimal>(type: "decimal(3,2)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Accessories = table.Column<string>(type: "nvarchar(max)", nullable: true), // JSON
                    CareInstructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OccasionTags = table.Column<string>(type: "nvarchar(max)", nullable: true), // JSON
                    Season = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "all-season"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dresses_Users_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Dresses_DressTypes_DressTypeId",
                        column: x => x.DressTypeId,
                        principalTable: "DressTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Dresses_DressSizes_DressSizeId",
                        column: x => x.DressSizeId,
                        principalTable: "DressSizes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Dresses_DressMaterials_DressMaterialId",
                        column: x => x.DressMaterialId,
                        principalTable: "DressMaterials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Dresses_DressStyles_DressStyleId",
                        column: x => x.DressStyleId,
                        principalTable: "DressStyles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });
        }

        private void ModifyExistingTables(MigrationBuilder migrationBuilder)
        {
            // Modify Bookings table
            migrationBuilder.RenameColumn(
                name: "CarId",
                table: "Bookings",
                newName: "DressId");

            // Remove car-specific columns from Bookings
            migrationBuilder.Sql(@"
                IF COL_LENGTH('Bookings', 'FuelPolicy') IS NOT NULL
                    ALTER TABLE Bookings DROP COLUMN FuelPolicy;
                
                IF COL_LENGTH('Bookings', 'MileageLimit') IS NOT NULL
                    ALTER TABLE Bookings DROP COLUMN MileageLimit;
                
                IF COL_LENGTH('Bookings', 'InsuranceType') IS NOT NULL
                    ALTER TABLE Bookings DROP COLUMN InsuranceType;
                
                IF COL_LENGTH('Bookings', 'AdditionalDriver') IS NOT NULL
                    ALTER TABLE Bookings DROP COLUMN AdditionalDriver;
            ");

            // Add dress-specific columns to Bookings
            migrationBuilder.AddColumn<bool>(
                name: "FittingRequired",
                table: "Bookings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "FittingDate",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AlterationNotes",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccessoriesIncluded",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: true);

            // Modify Users table
            migrationBuilder.RenameColumn(
                name: "SupplierCarLimit",
                table: "Users",
                newName: "SupplierDressLimit");

            migrationBuilder.RenameColumn(
                name: "NotifyAdminOnNewCar",
                table: "Users",
                newName: "NotifyAdminOnNewDress");

            // Modify Notifications table
            migrationBuilder.RenameColumn(
                name: "CarId",
                table: "Notifications",
                newName: "DressId");
        }

        private void CreateIndexes(MigrationBuilder migrationBuilder)
        {
            // Create indexes for Dresses table
            migrationBuilder.CreateIndex(
                name: "IX_Dresses_DressTypeId",
                table: "Dresses",
                column: "DressTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_DressSizeId",
                table: "Dresses",
                column: "DressSizeId");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_DressMaterialId",
                table: "Dresses",
                column: "DressMaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_DressStyleId",
                table: "Dresses",
                column: "DressStyleId");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_Available",
                table: "Dresses",
                column: "Available");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_DailyPrice",
                table: "Dresses",
                column: "DailyPrice");

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_RentalCount",
                table: "Dresses",
                column: "RentalCount");

            // Composite indexes for common queries
            migrationBuilder.CreateIndex(
                name: "IX_Dresses_Type_Size_Available",
                table: "Dresses",
                columns: new[] { "DressTypeId", "DressSizeId", "Available" });

            migrationBuilder.CreateIndex(
                name: "IX_Dresses_Price_Available",
                table: "Dresses",
                columns: new[] { "DailyPrice", "Available" });

            // Create unique indexes
            migrationBuilder.CreateIndex(
                name: "IX_DressTypes_Name",
                table: "DressTypes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DressSizes_SizeCode",
                table: "DressSizes",
                column: "SizeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DressMaterials_Name",
                table: "DressMaterials",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DressStyles_Name",
                table: "DressStyles",
                column: "Name",
                unique: true);
        }

        private void SeedDressData(MigrationBuilder migrationBuilder)
        {
            // Seed DressTypes
            migrationBuilder.InsertData(
                table: "DressTypes",
                columns: new[] { "Name", "Description" },
                values: new object[,]
                {
                    { "wedding", "Wedding dresses for special ceremonies" },
                    { "evening", "Elegant evening gowns for formal events" },
                    { "cocktail", "Cocktail dresses for semi-formal occasions" },
                    { "casual", "Casual dresses for everyday wear" },
                    { "prom", "Prom dresses for graduation events" },
                    { "bridesmaid", "Bridesmaid dresses for wedding parties" }
                });

            // Seed DressSizes
            migrationBuilder.InsertData(
                table: "DressSizes",
                columns: new[] { "SizeCode", "SizeName", "Measurements" },
                values: new object[,]
                {
                    { "xs", "Extra Small", "Bust: 32\", Waist: 24\", Hips: 34\"" },
                    { "s", "Small", "Bust: 34\", Waist: 26\", Hips: 36\"" },
                    { "m", "Medium", "Bust: 36\", Waist: 28\", Hips: 38\"" },
                    { "l", "Large", "Bust: 38\", Waist: 30\", Hips: 40\"" },
                    { "xl", "Extra Large", "Bust: 40\", Waist: 32\", Hips: 42\"" },
                    { "xxl", "Double Extra Large", "Bust: 42\", Waist: 34\", Hips: 44\"" },
                    { "custom", "Custom Size", "Made to measure" }
                });

            // Seed DressMaterials
            migrationBuilder.InsertData(
                table: "DressMaterials",
                columns: new[] { "Name", "Description", "CareInstructions" },
                values: new object[,]
                {
                    { "silk", "Luxurious natural fiber", "Dry clean only" },
                    { "cotton", "Breathable natural fiber", "Machine washable" },
                    { "lace", "Delicate decorative fabric", "Hand wash or dry clean" },
                    { "satin", "Smooth lustrous fabric", "Dry clean recommended" },
                    { "chiffon", "Lightweight sheer fabric", "Gentle hand wash or dry clean" },
                    { "tulle", "Fine mesh fabric", "Hand wash gently" },
                    { "organza", "Crisp sheer fabric", "Dry clean only" },
                    { "velvet", "Soft pile fabric", "Professional cleaning only" }
                });

            // Seed DressStyles
            migrationBuilder.InsertData(
                table: "DressStyles",
                columns: new[] { "Name", "Description" },
                values: new object[,]
                {
                    { "traditional", "Classic traditional designs" },
                    { "modern", "Contemporary modern styles" },
                    { "designer", "High-end designer pieces" },
                    { "vintage", "Retro and vintage inspired" },
                    { "bohemian", "Free-spirited boho style" },
                    { "minimalist", "Clean and simple designs" }
                });
        }
    }
}

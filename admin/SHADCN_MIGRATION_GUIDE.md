# shadcn/Tailwind Migration Guide

## 📋 Overview

This guide explains the standardized layout template for pages migrated to shadcn/Tailwind design system.

---

## 🎨 PageContainer Component

All shadcn-migrated pages use the **`PageContainer`** component for consistent layout.

### Location
```
admin/src/components/PageContainer.tsx
```

### Features
- **Max width**: 1200px (centered)
- **Horizontal padding**: 24px (px-6)
- **Vertical padding**: 32px (py-8)
- **Background**: Light neutral gray (bg-neutral-50)
- **Responsive**: Automatically handles mobile/desktop
- **Min height**: Full screen (min-h-screen)

---

## 🚀 How to Use

### Basic Usage

```tsx
import Layout from '@/components/Layout'
import PageContainer from '@/components/PageContainer'

const MyPage = () => {
  return (
    <Layout onLoad={onLoad} strict>
      <PageContainer>
        {/* Your page content here */}
        <h1>My Page</h1>
        {/* Cards, tables, forms, etc. */}
      </PageContainer>
    </Layout>
  )
}
```

### With Custom Classes

```tsx
<PageContainer className="py-4">
  {/* Your content - overrides default py-8 to py-4 */}
</PageContainer>
```

---

## 📁 Migrated Pages

### ✅ Current Pages Using PageContainer

1. **Dashboard (HomeScreen.tsx)**
   - Location: `admin/src/pages/HomeScreen.tsx`
   - Features: Stats cards, revenue chart, recent bookings

2. **Bookings (Bookings.tsx)**
   - Location: `admin/src/pages/Bookings.tsx`
   - Features: Table, search, filters, action buttons

3. **Users (Users.tsx)**
   - Location: `admin/src/pages/Users.tsx`
   - Features: User list table, search, type filter, avatars

---

## 🎯 Migration Checklist

When migrating a page to shadcn/Tailwind:

### 1. Import PageContainer
```tsx
import PageContainer from '@/components/PageContainer'
```

### 2. Replace Layout Wrapper
**Before:**
```tsx
<Layout onLoad={onLoad}>
  <div className="my-custom-container">
    {/* content */}
  </div>
</Layout>
```

**After:**
```tsx
<Layout onLoad={onLoad}>
  <PageContainer>
    {/* content */}
  </PageContainer>
</Layout>
```

### 3. Remove Custom CSS
Delete page-specific container styles:
- `max-width` declarations
- `margin: 0 auto`
- `padding` for page wrapper
- Background colors for page wrapper

### 4. Update shadcn Components
Replace Material-UI with shadcn:
- `Button` → `@/components/ui/button`
- `TextField` → `@/components/ui/input`
- `Select` → `@/components/ui/select`
- `Card` → `@/components/ui/card`
- `Badge` → `@/components/ui/badge`
- `Table` → `@/components/ui/table`

### 5. Use Tailwind Classes
Replace custom CSS with Tailwind utilities:
- `display: flex` → `flex`
- `justify-content: space-between` → `justify-between`
- `margin-bottom: 24px` → `mb-6`
- `padding: 16px` → `p-4`

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Fixed Navigation Sidebar (250px)                   │
├─────────────┬───────────────────────────────────────┤
│  Sidebar    │  PageContainer                        │
│  (250px)    │  ┌─────────────────────────────────┐  │
│             │  │  Max-width: 1200px              │  │
│             │  │  Padding: 24px horizontal       │  │
│             │  │           32px vertical         │  │
│             │  │                                 │  │
│             │  │  <Your Page Content>            │  │
│             │  │  - Headers                      │  │
│             │  │  - Cards                        │  │
│             │  │  - Tables                       │  │
│             │  │  - Forms                        │  │
│             │  │                                 │  │
│             │  └─────────────────────────────────┘  │
│             │                                        │
└─────────────┴────────────────────────────────────────┘
```

### Desktop (≥960px)
- Sidebar: Fixed 250px on left
- Content: Starts at 250px from left
- PageContainer: Centered, max 1200px
- Total usable space: ~1200px (depends on screen)

### Mobile (≤960px)
- Sidebar: Drawer overlay (hidden by default)
- Content: Full width
- PageContainer: Full width with 24px padding

---

## 🎨 Design Tokens

### Spacing
- **Container max-width**: 1200px
- **Horizontal padding**: 24px (px-6)
- **Vertical padding**: 32px (py-8)
- **Gap between elements**: 24px (gap-6)

### Colors
- **Background**: `bg-neutral-50` (#FAFAFA)
- **Card background**: `bg-white`
- **Text primary**: `text-neutral-900`
- **Text secondary**: `text-neutral-500`
- **Borders**: `border-neutral-200`

### Typography
- **Page title (H1)**: `text-2xl font-semibold`
- **Card title (H2)**: `text-lg font-semibold`
- **Subtitle**: `text-sm text-neutral-500`
- **Body**: `text-sm`

---

## 📦 shadcn Components

### Installed Components
```bash
admin/src/components/ui/
├── button.tsx       # Primary, secondary, outline variants
├── input.tsx        # Text inputs with validation states
├── select.tsx       # Dropdown selects
├── badge.tsx        # Status pills, tags
├── card.tsx         # Container cards
└── table.tsx        # Data tables
```

### Component Imports
```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
```

---

## ✨ Best Practices

### 1. Consistent Spacing
```tsx
{/* Page sections */}
<div className="mb-8"> {/* Major sections */}
<div className="mb-6"> {/* Subsections */}
<div className="mb-4"> {/* Related elements */}
<div className="gap-6"> {/* Between cards/columns */}
```

### 2. Responsive Grid Layouts
```tsx
{/* 2-column on desktop, 1-column on mobile */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

{/* 3-column with flexible split */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

{/* Custom column spans */}
<div className="lg:col-span-2"> {/* 66% width */}
<div className="lg:col-span-1"> {/* 33% width */}
```

### 3. Card Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### 4. Table Structure
```tsx
<Card>
  <CardContent className="p-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column 1</TableHead>
          <TableHead>Column 2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Data 1</TableCell>
          <TableCell>Data 2</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

## 🔍 Example: Complete Page

```tsx
import React from 'react'
import Layout from '@/components/Layout'
import PageContainer from '@/components/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const ExamplePage = () => {
  return (
    <Layout onLoad={onLoad} strict>
      <PageContainer>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Page Title
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Subtitle or description
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-neutral-500 mb-1">Metric</p>
              <p className="text-3xl font-semibold">42</p>
            </CardContent>
          </Card>
          {/* More cards... */}
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Section Title</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your content */}
          </CardContent>
        </Card>
      </PageContainer>
    </Layout>
  )
}

export default ExamplePage
```

---

## 🎯 Benefits

1. **Consistency**: All pages have the same width, padding, and background
2. **Maintainability**: Change layout in one place (PageContainer)
3. **Responsive**: Works on mobile, tablet, and desktop automatically
4. **Clean Code**: No duplicate CSS for containers
5. **Scalable**: Easy to add new pages with consistent look

---

## 📝 Next Steps

To migrate a new page:
1. Import `PageContainer`
2. Wrap content with `<PageContainer>`
3. Use shadcn components
4. Apply Tailwind utilities
5. Remove custom CSS
6. Test responsiveness
7. Update this guide if needed

---

**Created**: December 30, 2025  
**Last Updated**: December 30, 2025  
**Pages Migrated**: 3 (Dashboard, Bookings, Users)


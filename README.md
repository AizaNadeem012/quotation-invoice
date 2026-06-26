# Quoinv - Quotations & Invoices Generator

A modern, production-ready quotation and invoice management system built with React, TypeScript, Supabase, and TanStack Router.

## Features

### Core Functionality
- **Client Management**: Add and manage your clients with contact details
- **Quotations**: Create, send, and track quotations with line items and tax calculations
- **Invoices**: Generate invoices from quotations or create standalone invoices
- **Payment Tracking**: Record payments and track outstanding balances
- **Reports**: View financial summaries and recent activity
- **Settings**: Configure company details, numbering prefixes, and user profiles

### Key Features
- ✅ Auto-numbering for invoices and quotations
- ✅ Convert quotations to invoices in one click
- ✅ Partial payment support with automatic status updates
- ✅ PDF export/print functionality for quotations and invoices
- ✅ Multi-company support with data isolation
- ✅ Role-based access control (RBAC)
- ✅ Real-time dashboard with key metrics
- ✅ Responsive design with dark mode support
- ✅ Professional UI with Tailwind CSS and Radix UI components

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router, TanStack Query
- **Backend**: Supabase (PostgreSQL database with Row Level Security)
- **Styling**: Tailwind CSS v4, Radix UI components
- **Build**: Vite, Nitro (for serverless deployment)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd quoinv-your-financial-command-center-main
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/20260619154247_b88218fe-6a15-459f-a684-12545795dcb5.sql`

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── routes/                    # Page components (TanStack Router)
│   ├── app.tsx               # Main app layout with sidebar
│   ├── app.clients.tsx       # Client management page
│   ├── app.quotations.tsx    # Quotations list page
│   ├── app.quotations.new.tsx # Create new quotation
│   ├── app.quotations.$id.tsx # Quotation detail view
│   ├── app.invoices.tsx      # Invoices list page
│   ├── app.invoices.new.tsx  # Create new invoice
│   ├── app.invoices.$id.tsx  # Invoice detail view
│   ├── app.payments.tsx      # Payment tracking page
│   ├── app.reports.tsx       # Reports and analytics
│   ├── app.settings.tsx      # Company and user settings
│   ├── app.dashboard.tsx     # Main dashboard
│   └── auth.tsx              # Authentication page
├── components/
│   └── ui/                   # Reusable UI components
├── lib/
│   └── pdf-export.ts         # PDF generation utilities
├── integrations/
│   └── supabase/
│       ├── client.ts         # Supabase client configuration
│       └── types.ts          # Database type definitions
└── styles.css                # Global styles and theme

supabase/
└── migrations/
    └── 20260619154247_*.sql  # Database schema and RLS policies
```

## Database Schema

### Core Tables
- **companies**: Company information and settings
- **profiles**: User profiles linked to companies
- **user_roles**: Role-based access control
- **clients**: Client/contact information
- **quotations**: Quotation records
- **quotation_items**: Line items for quotations
- **invoices**: Invoice records
- **invoice_items**: Line items for invoices

### Key Features
- Row Level Security (RLS) for data isolation
- Auto-incrementing numbering for invoices/quotations
- Automatic timestamp updates via triggers
- Enum types for status fields

## Usage Guide

### Creating a Quotation
1. Navigate to Quotations → New quotation
2. Select a client
3. Add line items with quantities, prices, and tax rates
4. Set issue and expiry dates
5. Add optional notes
6. Save as draft or mark as sent

### Converting to Invoice
1. Open a quotation
2. Click "Convert to invoice"
3. The system creates a new invoice with all details
4. Quotation status changes to "converted"

### Recording Payments
1. Go to Payments page
2. Click "Record payment"
3. Select an invoice with outstanding balance
4. Enter payment amount and method
5. System automatically updates invoice status

### Printing/PDF Export
- Click the printer icon on any quotation or invoice
- Opens a print dialog with formatted document
- Use browser's "Save as PDF" to export

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Cloudflare Pages
```bash
npm run deploy
```

### Environment Variables for Production
Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Security

- Row Level Security (RLS) ensures data isolation between companies
- Authentication via Supabase Auth
- Role-based permissions (owner, manager, accountant, sales, employee)
- All database operations are validated and secured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For support, contact support@quoinv.com or visit [quoinv.com](https://quoinv.com)

---

Built with ❤️ by Quoinv.com
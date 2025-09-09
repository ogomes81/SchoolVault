# SchoolVault

A mobile-friendly web application that helps parents digitize and organize school papers including worksheets, flyers, permission slips, and report cards. Features OCR text extraction, auto-classification, and public sharing capabilities.

## Features

- **User Authentication**: Email and Google sign-in via Supabase
- **Child Management**: Add and manage multiple children with grades
- **Document Upload**: Camera capture and file upload from mobile/desktop
- **OCR Processing**: Automatic text extraction using Google Cloud Vision API
- **Auto-Classification**: Smart categorization of document types
- **Metadata Extraction**: Auto-detection of due dates, teachers, subjects, and tags
- **Search & Filter**: Full-text search across titles, tags, and OCR content
- **Public Sharing**: Toggle-able share links for documents
- **Calendar Export**: .ics file generation for due dates and events
- **Mobile-First Design**: Responsive UI optimized for mobile devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Wouter for routing
- TanStack Query for data fetching
- Supabase client for authentication and storage

### Backend
- Node.js with Express
- Google Cloud Vision API for OCR
- Supabase for database and file storage
- Drizzle ORM for database operations

### Database
- PostgreSQL via Supabase
- Row Level Security (RLS) enabled
- Full-text search capabilities

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- A Google Cloud Platform account with Vision API enabled

### 2. Supabase Setup

1. Go to the [Supabase dashboard](https://supabase.com/dashboard/projects)
2. Create a new project
3. Once created, go to the project dashboard
4. Click the "Connect" button in the top toolbar
5. Copy the URI value under "Connection string" → "Transaction pooler"
6. Replace `[YOUR-PASSWORD]` with your database password
7. Go to **Storage** in the sidebar and create a new bucket called `documents`
8. Make the bucket public by toggling the "Public bucket" setting
9. Run the seed SQL script:
   - Go to **SQL Editor** in the Supabase dashboard
   - Copy and paste the contents of `supabase/seed.sql`
   - Click "Run" to create the necessary tables and policies

### 3. Google Cloud Vision API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Cloud Vision API:
   - Go to **APIs & Services** → **Library**
   - Search for "Cloud Vision API" and enable it
4. Create an API key:
   - Go to **APIs & Services** → **Credentials**
   - Click "Create Credentials" → "API key"
   - Copy the generated API key
   - (Optional) Restrict the key to Cloud Vision API for security

### 4. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="your-supabase-connection-string"

# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_BUCKET="documents"

# Google Cloud Vision
GOOGLE_VISION_API_KEY="your-google-vision-api-key"

# App Configuration
PUBLIC_APP_URL="http://localhost:5000"
PORT=5000

# Overview

SchoolVault is a mobile-friendly web application designed to help parents digitize and organize school documents including worksheets, flyers, permission slips, and report cards. The application features OCR text extraction, automatic document classification, metadata extraction, and sharing capabilities. Built with a focus on simplicity and mobile-first design, it provides parents with a centralized system to manage their children's school paperwork digitally.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side application is built using React 18 with TypeScript, utilizing Vite as the build tool for fast development and optimized production builds. The architecture follows a component-based design with:

- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and data fetching
- **Styling**: TailwindCSS with shadcn/ui components for responsive design
- **Authentication**: Supabase client for user authentication and session management
- **Mobile-First Design**: Responsive components optimized for mobile devices

## Backend Architecture
The backend follows a minimal Express.js server architecture that primarily serves as a proxy for OCR processing:

- **Server Framework**: Node.js with Express for API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **OCR Processing**: Server-side route that interfaces with Google Cloud Vision API
- **Authentication Middleware**: JWT token validation for protected routes
- **File Storage**: Integration with Supabase Storage for document uploads

## Data Storage
The application uses PostgreSQL via Supabase with a well-defined schema structure:

- **Users & Profiles**: User management with profile information
- **Children**: Child entities linked to users for document organization
- **Documents**: Core document storage with metadata fields including OCR text, classification, dates, and sharing tokens
- **Indexing**: Optimized indexes for user queries, document types, and full-text search capabilities

## Authentication & Authorization
Authentication is handled through Supabase Auth with support for:

- **Email/Password Authentication**: Traditional email-based sign-up and sign-in
- **Google OAuth**: Social authentication integration
- **Row Level Security (RLS)**: Database-level security policies ensuring users can only access their own data
- **JWT Token Management**: Secure token-based authentication for API requests

## Document Processing Pipeline
The application implements an automated document processing workflow:

1. **File Upload**: Documents uploaded to Supabase Storage with unique file paths
2. **OCR Processing**: Server-side Google Cloud Vision API integration for text extraction
3. **Auto-Classification**: Heuristic-based classification into document types (Homework, Permission Slip, Flyer, Report Card, Other)
4. **Metadata Extraction**: Automated extraction of due dates, event dates, teachers, subjects, and suggested tags
5. **Storage**: Processed data stored in PostgreSQL with full-text search capabilities

## Sharing & Calendar Features
The application includes sharing and calendar integration features:

- **Public Sharing**: Toggle-based sharing system with unique tokens for public document access
- **Calendar Export**: ICS file generation for documents with due dates or event dates
- **Share Token Management**: Secure token generation and revocation for document sharing

## Mobile Optimization
The application is designed with mobile-first principles:

- **Responsive Design**: TailwindCSS breakpoints ensuring optimal display across devices
- **Touch-Friendly Interface**: Large touch targets and mobile-optimized interactions
- **Camera Integration**: Direct camera access for document capture on mobile devices
- **Progressive Enhancement**: Core functionality works across all device types

## React Native Mobile App (Stripe-Inspired Design)
A native iPhone app built with React Native and Expo, featuring a professional Stripe-inspired UI:

### Design System
- **Stripe Color Palette**: Professional purple (#635BFF) as primary color with subtle grays
- **Typography**: iOS-style text hierarchy with proper weight and spacing
- **Shadows**: Subtle, layered shadows for depth without overwhelming the interface
- **Spacing**: Generous white space following Stripe's clean, breathable layouts

### Key Components
- **SwipeableCard**: Card-based UI with gesture-driven interactions and depth effects
- **DailySummaryCard**: Morning briefing with key metrics (documents today, this week, processing)
- **TapRipple**: Material Design-inspired tap feedback with 100ms delay
- **ContextualMenu**: Elegant, non-intrusive action menus
- **StripeLoadingScreen**: Smooth startup animation without empty states

### User Experience
- **Card Stack Paradigm**: Documents presented as swipeable cards with dismiss gestures
- **Smooth Animations**: Spring physics for natural, polished interactions
- **Haptic Feedback**: Native iOS tactile responses for all actions
- **Progressive Disclosure**: Essential information first, details on demand
- **Native Integration**: iOS share sheet, notifications, deep linking

### Architecture
- **Framework**: Expo React Native with TypeScript
- **Navigation**: React Navigation with screen-based routing
- **State**: TanStack Query for server state, React hooks for local state
- **Styling**: Stripe-inspired theme system with consistent colors and spacing

# External Dependencies

## Authentication & Database
- **Supabase**: Primary backend-as-a-service providing PostgreSQL database, authentication, and file storage
- **Supabase Auth**: Handles user authentication with email/password and Google OAuth
- **Supabase Storage**: File storage service for document images

## OCR & AI Processing
- **Google Cloud Vision API**: OCR text extraction from uploaded document images
- **Google Cloud Platform**: API key management and usage tracking

## Frontend Libraries
- **React 18**: Core frontend framework with TypeScript support
- **Vite**: Build tool and development server
- **TanStack Query**: Server state management and data fetching
- **Wouter**: Lightweight routing library
- **shadcn/ui**: Pre-built component library based on Radix UI
- **TailwindCSS**: Utility-first CSS framework

## Backend Libraries
- **Express.js**: Web application framework for Node.js
- **Drizzle ORM**: Type-safe SQL ORM for database operations
- **Neon Serverless**: PostgreSQL database driver for serverless environments

## Development Tools
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **Drizzle Kit**: Database migration and schema management tools

## Deployment & Infrastructure
- **Replit**: Development and hosting environment
- **Environment Variables**: Secure configuration management for API keys and database connections
# Hospital Billing System

## Overview

This is a client-side Hospital Billing System built with vanilla JavaScript and IndexedDB for local data storage. The system provides a comprehensive solution for managing hospital billing operations, including patient billing, medicine/service pricing management, and administrative functions. The application is designed to work entirely offline after initial load, making it suitable for healthcare environments with limited internet connectivity.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3, Bootstrap 5
- **Client-Side Storage**: IndexedDB for persistent local data storage
- **UI Framework**: Bootstrap 5 for responsive design and components
- **Icons**: Font Awesome for consistent iconography
- **PDF Generation**: html2pdf.js library for bill export functionality
- **Excel Operations**: XLSX.js library for data import/export

### Data Storage Solution
- **Primary Database**: IndexedDB (HospitalBillingDB v2)
- **Object Stores**: 
  - `items` store with auto-incrementing ID as primary key
  - Indexed by category and name for efficient querying
- **Data Structure**: JSON-based medicine/service catalog with categories, pricing, and metadata
- **Initial Data**: Pre-populated from medicines.json containing medical items and pricing

### Server Architecture
- **Static File Server**: Python HTTP server on port 5000
- **Custom Request Handler**: Routes root requests to index.html
- **CORS Support**: Development-friendly headers for cross-origin requests
- **File Serving**: Serves all static assets (HTML, CSS, JS, JSON)

## Key Components

### 1. Main Billing Interface (index.html + app.js)
- **Purpose**: Primary billing interface for creating and managing patient bills
- **Features**: 
  - Patient information input (name, OPD number)
  - Service/medicine selection with quantity calculations
  - Real-time bill preview and total calculation
  - PDF export functionality with professional formatting
  - Print capabilities for physical receipts
  - Dynamic item search and filtering

### 2. Price List Editor (edit.html + edit-app.js)
- **Purpose**: Administrative interface for managing pricing data
- **Features**:
  - Category-based item organization (Registration, Lab, Medicine, etc.)
  - CRUD operations for pricing items
  - Bulk import/export via Excel files
  - Database management and backup tools
  - Item editing with validation

### 3. Database Layer
- **IndexedDB Implementation**: Asynchronous local database operations
- **Data Seeding**: Automatic population from medicines.json on first run
- **Schema Management**: Version-controlled database upgrades
- **Categories**: Registration, Lab, Medicine, Consultation, Procedure, Supplies

### 4. User Interface Components
- **Responsive Design**: Bootstrap-based layout adapting to different screen sizes
- **Loading States**: Visual feedback during database operations
- **Toast Notifications**: User-friendly success/error messaging
- **Form Validation**: Client-side input validation and error handling

## Data Flow

1. **Application Initialization**:
   - Open IndexedDB connection
   - Check for existing data or seed from medicines.json
   - Initialize UI components and event handlers

2. **Billing Process**:
   - User inputs patient information
   - Selects services/medicines from categorized lists
   - System calculates totals including quantities and pricing
   - Generate PDF bills or print receipts

3. **Price Management**:
   - Admin accesses edit interface
   - Modifies pricing data with real-time validation
   - Changes persist to IndexedDB immediately
   - Export/import capabilities for bulk operations

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3.0**: UI framework and responsive components
- **Font Awesome 6.4.0**: Icon library for consistent visual elements
- **html2pdf.js 0.10.1**: Client-side PDF generation from HTML
- **XLSX.js 0.18.5**: Excel file reading and writing capabilities

### Runtime Environment
- **Python 3.11**: HTTP server runtime
- **Modern Web Browser**: Chrome, Firefox, Safari, Edge with IndexedDB support

## Deployment Strategy

### Development Environment
- **Local Server**: Python HTTP server on localhost:5000
- **File Structure**: All assets served from project root directory
- **Hot Reload**: Manual refresh required for changes

### Production Considerations
- **Static Hosting**: Can be deployed to any static file hosting service
- **Database Portability**: IndexedDB data stays with browser/device
- **Backup Strategy**: Export functionality for data migration
- **Browser Compatibility**: Requires IndexedDB support (IE10+)

### Scalability Approach
- **Current State**: Single-user, client-side application
- **Future Expansion**: Could add server-side API for multi-user support
- **Data Sync**: Currently no synchronization between devices/users
- **Performance**: IndexedDB handles thousands of items efficiently

## Recent Changes

✓ Added medicine browse dropdown for easier selection
✓ Implemented Days/Weeks/Months cycling with conversion display
✓ Updated default values: Days=1, Frequency=QD, auto-dose units
✓ Added Quick Price Edit modal for inline price adjustments
✓ Conditional patient info display (only shows when entered)
✓ Removed example text for cleaner interface
✓ Replaced dollar signs with taka icons throughout

## Changelog

```
Changelog:
- June 24, 2025. Initial setup and core functionality
- June 24, 2025. Medicine calculation improvements and UI enhancements
- June 24, 2025. Quick price editing and billing interface refinements
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
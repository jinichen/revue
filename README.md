# OpenV - Authentication Service Management System

OpenV is a modern authentication service management platform that provides intuitive data visualization, bill generation, and system settings management. Built with React and Next.js, the system supports dark mode and responsive design, helping organizations effectively manage and monitor authentication services.

## Key Features

### Dashboard
- **Data Visualization**: Display key metrics and trends of authentication services
- **Time Period Selection**: View statistics by year, month, or day
- **Client Call Statistics**: Use 3D bar charts to display call data for different organizations
- **Valid/Invalid Call Analysis**: Intuitively distinguish between successful and failed authentication requests

### Billing Management
- **Bill Generation**: Generate detailed bills based on time period and organization
- **Pricing Configuration**: Support pricing settings for different authentication factors
- **Data Export**: Support export functionality for billing data in various formats

### Reconciliation Management
- **Reconciliation Report**: Generate detailed reconciliation reports for specified dates and organizations
- **Multiple Data Sources**: Support real-time generation or pre-generated file retrieval
- **Format Options**: View data in table format or Markdown format
- **Export Functionality**: Download reconciliation data in Markdown format
- **Automatic Generation**: Schedule automatic daily reconciliation report generation

### Settings Management
- **Theme Switching**: Support light/dark mode
- **User Preferences**: Save user interface preferences
- **Account Management**: Manage user account information
- **Notification Settings**: Configure system notification options

## Technology Stack

- **Frontend Framework**: React 19, Next.js 15
- **State Management**: Zustand
- **UI Components**: Tailwind CSS, Radix UI
- **Data Visualization**: Recharts
- **Data Querying**: TanStack Query
- **Table Processing**: TanStack Table
- **Icon Library**: Lucide React
- **Date Handling**: date-fns
- **Database Connection**: MySQL2

## Quick Start

### System Requirements
- Node.js 18.0+ 
- MySQL database

### Installation Steps

1. Clone the project code
```bash
git clone https://github.com/yourusername/openv.git
cd openv
```

2. Install dependencies
```bash
npm install
```

3. Environment configuration
Copy the `.env.local.example` file to `.env.local` and fill in the necessary environment variables:
```bash
cp .env.local.example .env.local
```

4. Start the development server
```bash
npm run dev
```

5. Build the production version
```bash
npm run build
npm start
```

## Project Structure

```
/src
  /app              # Application page routes
    /api            # API routes
      /billing      # Billing API routes
      /reconciliation # Reconciliation API routes
    /dashboard      # Dashboard page
    /billing        # Billing page
    /reconciliation # Reconciliation page
    /settings       # Settings page
  /components       # Reusable components
    /dashboard      # Dashboard components
    /billing        # Billing components
    /reconciliation # Reconciliation components
    /layout         # Layout components
    /ui             # UI common components
  /hooks            # Custom hooks
  /lib              # Utility function library
  /services         # API services
  /types            # TypeScript type definitions
/scripts            # Utility scripts
  /reconciliation-exporter.ts # Script for exporting reconciliation data
  /setup-reconciliation-cron.sh # Script for setting up cron jobs
/docs               # Documentation
```

## Feature Highlights

### 1. Responsive Design
The system fully adapts to different screen sizes, providing an excellent user experience on both desktop and mobile devices.

### 2. Theme Modes
Support for light and dark themes, easily switchable via the top navigation bar.

### 3. 3D Data Visualization
Using modern 3D bar charts to display data, enhancing data readability and visual appeal.

### 4. Real-time Data Processing
Using TanStack Query for efficient data fetching and caching, providing a smooth user experience.

### 5. Flexible Bill Generation
Offering multiple billing configuration options to meet different business needs.

### 6. Comprehensive Reconciliation System
- Independent reconciliation module with dedicated user interface
- Support for both real-time data generation and pre-generated file retrieval
- Multiple format options: table view and Markdown
- Automated reconciliation report generation via scheduled tasks

## Configuration Options

The system offers extensive configuration options through environment variables in `.env.local`:

### Reconciliation Configuration
- **RECONCILIATION_AUTO_GENERATE_TIME**: Time for automatic report generation (24-hour format)
- **RECONCILIATION_EXPORT_DIR**: Directory for storing generated reconciliation files
- **NEXT_PUBLIC_RECONCILIATION_SOURCE_TYPE**: Data source method (`generate` or `file`)
- **NEXT_PUBLIC_RECONCILIATION_PAGE_SIZE**: Number of records per page

### Database Configuration
- **SERVICE_LOGS_TABLE**: Service logs table name
- **ORGANIZATIONS_TABLE**: Organizations table name
- **COLUMN_MAPPINGS**: Database column name mappings

For more detailed information, please refer to the documentation in the `/docs` directory.

## Contribution Guidelines

We welcome community contributions! If you're interested in participating in project development, please check our contribution guidelines first.

## License

This project is licensed under the MIT License. Please refer to the LICENSE file for details.

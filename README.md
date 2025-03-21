# Revue - API Call Statistics and Authentication Platform

Revue is a Next.js-based platform for monitoring, analyzing, and managing API call data, providing a user-friendly interface to view call statistics, generate reconciliation statements, and analyze statistical data.

## Key Features

### 1. 🔄 Real-time Statistics Dashboard
- Display key metrics like API call volume and success rates
- Statistics by day, month, and year
- Client organization call volume charts
- Automatic data updates and manual refresh

### 2. 📊 Reconciliation Management
- Generate reconciliation statements by organization and date
- Support for Markdown format preview and export
- Detailed call records and success rate statistics

### 3. 💵 Billing Management
- Pricing by authentication mode (two-factor, three-factor authentication)
- Automatic fee calculation and bill generation
- Custom pricing strategies for different clients

### 4. 📱 Responsive Design
- Support for desktop and mobile devices
- Light/dark mode compatibility
- Accessibility compliant interface

## Technology Stack

- **Frontend Framework**: Next.js 15.x
- **Styling**: TailwindCSS
- **State Management**: React Hooks + Context API
- **Data Visualization**: Chart.js
- **Database**: MySQL
- **Deployment Environment**: Node.js

## Installation and Setup

### Prerequisites
- Node.js 18.0+
- MySQL 5.7+

### Installation Steps

1. Clone the repository
```bash
git clone [repository-url]
cd revue
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
Create a `.env.local` file with the following parameters:
```
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=platform_log
DB_USER=your-db-user
DB_PASSWORD=your-db-password
PORT=3000
```

4. Run development server
```bash
npm run dev
```

5. Build production version
```bash
npm run build
npm start
```

## Configuration Options

### Cache Settings
You can configure data cache times (in seconds) in the `.env.local` file:
```
CACHE_TTL=0  # General cache time, 0 means no caching
STATS_CACHE_TTL=0  # Statistics data cache time
ORG_STATS_CACHE_TTL=0  # Organization statistics cache time
```

### Database Table Configuration
```
SERVICE_LOGS_TABLE=t_service_log  # Service logs table name
ORGANIZATIONS_TABLE=t_org_info  # Organization info table name
COLUMN_ORG_NAME=org_name  # Organization name column
COLUMN_ORG_ID=org_id  # Organization ID column
COLUMN_AUTH_MODE=auth_mode  # Authentication mode column
COLUMN_EXEC_START_TIME=exec_start_time  # Execution time column
COLUMN_RESULT_CODE=result_code  # Result code column
COLUMN_RESULT_MSG=result_msg  # Result message column
```

## Project Structure

```
revue/
├── src/
│   ├── app/
│   │   ├── api/  # API routes
│   │   │   ├── analytics/  # Analytics API
│   │   │   ├── billing/  # Billing API
│   │   │   ├── cache/  # Cache management API
│   │   │   ├── reconciliation/  # Reconciliation API
│   │   │   └── service-logs/  # Service logs API
│   │   ├── dashboard/  # Dashboard page
│   │   ├── billing/  # Billing page
│   │   └── reconciliation/  # Reconciliation page
│   ├── components/  # UI components
│   ├── lib/  # Utility libraries
│   ├── services/  # Service layer
│   └── types/  # Type definitions
└── public/  # Static resources
```

## User Guide

### Dashboard
- Access the homepage to view call statistics dashboard
- Use the "Refresh" button to manually update data
- Use the "Clear Cache" button to force retrieval of the latest data from the database

### Reconciliation Statement Generation
1. Navigate to the "Reconciliation" page
2. Select client and date
3. The system automatically generates the reconciliation statement and displays a preview
4. Click the "Download" button to get the Markdown format statement

## Troubleshooting

### Incorrect Data Display
- Try clearing the cache and refreshing the page
- Check if the database connection is working properly
- Look for error messages in the browser console

### Reconciliation Statement Generation Issues
- Ensure you've selected a valid client and date
- Check if there's call data available within the date range
- Make sure the server has permissions to write to the export directory

## Contact

For any questions or suggestions, please contact the system administrator.

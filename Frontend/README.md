# Frontend - Swagger to Postman Converter

React frontend application with Bootstrap UI for converting Swagger/OpenAPI specifications to Postman collections.

## Requirements

- Node.js 16+
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will open at http://localhost:3000

Or use the batch file from project root:
```bash
start-apps.bat
```

## Features

### Screen 1: Swagger Converter
- Load all Swagger files in dropdown
- Show different authorization types (API Key, Bearer Token, Basic Auth)
- Checkboxes for security injections (XSS, SQL, HTML)
- Convert button to start conversion

### Screen 2: Manage Swagger
- List all Swagger files with delete option
- Drag and drop file upload
- File upload button

### Screen 3: Postman Manager
- List all Postman collections
- Show environments for each collection
- Delete icons for collections and environments
- Download collections

## Project Structure

```
Frontend/
├── src/
│   ├── components/
│   │   └── Layout/
│   │       ├── Layout.js
│   │       ├── Sidebar.js
│   │       └── Header.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── SwaggerConverter.js
│   │   ├── ManageSwagger.js
│   │   └── PostmanManager.js
│   ├── services/
│   │   └── api.service.js
│   ├── config/
│   │   └── api.config.js
│   ├── App.js
│   └── index.js
├── public/
├── package.json
└── README.md
```

## Technologies

- React 18.3+
- Bootstrap 5.3+
- React Bootstrap 2.10+
- Bootstrap Icons 1.11+
- React Router DOM 6.26+
- Axios 1.7+

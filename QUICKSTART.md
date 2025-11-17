# Quick Start Guide

## Getting Started with Standalone TSForms Client

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API URL

Before starting, update the API base URL in `.env.development` (for local development) or `.env.production` (for production builds):

**Development** (`.env.development`):
```
REACT_APP_API_BASE=http://localhost:3000
```

**Production** (`.env.production`):
```
REACT_APP_API_BASE=https://your-lambda-function-url.amazonaws.com
```

### 3. Run Development Server

```bash
npm start
```

The application will start at `http://localhost:3001`

### 4. Test the Widget

Open your browser to `http://localhost:3001` or open `test.html` for a standalone test page.

Use the test controls to:
- Set a mock task ID
- Simulate Webex store data
- Test the form functionality

### 5. Build for Production

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

### 6. Test Production Build Locally

```bash
npm run serve
```

This serves the production build at `http://localhost:3001`

## Deployment Options

### Option 1: AWS S3 + CloudFront

1. Build the project: `npm run build`
2. Upload `build/` contents to S3 bucket
3. Configure CloudFront distribution
4. Update API URL in `.env.production` before building

### Option 2: Netlify

1. Connect your Git repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variable: `REACT_APP_API_BASE=your-lambda-url`

### Option 3: Vercel

1. Connect your Git repository to Vercel
2. Framework preset: Create React App
3. Add environment variable: `REACT_APP_API_BASE=your-lambda-url`

### Option 4: Traditional Web Server

1. Build: `npm run build`
2. Copy `build/` contents to your web server
3. Configure web server to serve static files
4. Ensure proper CORS headers if API is on different domain

## Integration with Webex Contact Center

This widget is designed to integrate with Webex Contact Center Desktop. When embedded:

1. The widget receives task information via message events
2. It automatically detects active calls
3. Form data is sent to your Lambda backend for processing

## Troubleshooting

**Widget doesn't load:**
- Check browser console for errors
- Verify React scripts are installed: `npm install`
- Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`

**API connection fails:**
- Verify the API URL in your .env file
- Check CORS configuration on your Lambda function
- Ensure your Lambda function is accessible from the frontend

**Build fails:**
- Clear the build cache: `npm run build -- --reset-cache`
- Delete node_modules and reinstall

**Styles not loading:**
- The widget uses Tailwind CSS via inline styles and shadow DOM
- Check that postcss and tailwindcss are installed

## Next Steps

- Update Lambda function URL in `.env.production`
- Test thoroughly with mock data
- Deploy to your chosen hosting platform
- Integrate with Webex Contact Center Desktop

# TSForms Client - Standalone Hosting

This is a React-based web component application for telephonic signature metadata collection, designed to work with Webex Contact Center.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

```bash
npm install
```

## Development

Run the development server:

```bash
npm start
```

The app will be available at `http://localhost:3001`

## Building for Production

Create a production build:

```bash
npm run build
```

This will create optimized files in the `build/` directory.

## Serving Production Build Locally

To test the production build locally:

```bash
npm run serve
```

This will serve the production build at `http://localhost:3001`

## Configuration

### API Base URL

The application needs to connect to a backend API. Configure the API base URL:

- **Development**: Edit `.env.development` and set `REACT_APP_API_BASE`
- **Production**: Edit `.env.production` and set `REACT_APP_API_BASE` to your Lambda function URL

### Testing the Widget

To test the web component locally, open `test.html` in a browser or use the development server.

## Deployment

### Static Hosting (S3, Netlify, Vercel, etc.)

1. Build the project: `npm run build`
2. Upload the contents of the `build/` directory to your hosting provider
3. Ensure the API base URL is correctly configured in `.env.production` before building

### Lambda Integration

The backend has been moved to AWS Lambda. Update the `REACT_APP_API_BASE` in `.env.production` with your Lambda function URL before building.

## Usage as Web Component

The application exports a custom web element `<webex-tsforms-widget>`. To use it in another application:

```html
<script src="path/to/build/static/js/main.js"></script>
<webex-tsforms-widget taskid="12345"></webex-tsforms-widget>
```

Or set properties programmatically:

```javascript
const widget = document.createElement('webex-tsforms-widget');
widget.taskId = '12345';
widget.store = { agentContact: { selectedTaskId: '12345' } };
document.body.appendChild(widget);
```

## Project Structure

```
client/
├── public/          # Static files
├── src/
│   ├── App.jsx      # Main React application
│   ├── WebexWidget.jsx  # Web component wrapper
│   ├── index.js     # Entry point
│   └── index.css    # Global styles
├── build/           # Production build output
└── package.json     # Dependencies and scripts
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors when connecting to the API, ensure your Lambda function has appropriate CORS headers configured.

### Widget Not Loading

1. Check browser console for errors
2. Verify the API base URL is correct
3. Ensure the Webex SDK is loaded if using in Webex Contact Center context

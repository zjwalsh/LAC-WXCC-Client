import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './WebexWidget';
import App from './App';

console.log('[TSForms] index.js loaded');

// For standalone testing
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

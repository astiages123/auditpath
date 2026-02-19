import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/providers';
import App from './App';
import '@/styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);

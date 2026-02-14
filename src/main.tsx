import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/providers';
import App from './App';
import '@/styles/index.css';

import { subjectKnowledgeService } from '@/features/quiz/services';
import { logger } from '@/utils/logger';

// Start preloading subject guidelines
subjectKnowledgeService
  .preload()
  .catch((err: any) =>
    logger.error('Failed to preload subject knowledge', err)
  );

ReactDOM.createRoot(document.getElementById('root')!).render(
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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/providers';
import App from './App';
import '@/styles/index.css';

import { subjectKnowledgeService } from '@/features/quiz/services/core/subjectKnowledgeService';
import { logger } from '@/utils/logger';

// Start preloading subject guidelines
subjectKnowledgeService
  .preload()
  .catch((err: unknown) =>
    logger.error('Failed to preload subject knowledge', err as Error)
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

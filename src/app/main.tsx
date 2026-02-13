import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import App from './App';
import '@/styles/index.css';

import { subjectKnowledgeService } from '@/shared/services/knowledge/subject-knowledge.service';
import { logger } from '@/shared/lib/core/utils/logger';

// Start preloading subject guidelines
subjectKnowledgeService
  .preload()
  .catch((err) => logger.error('Failed to preload subject knowledge', err));

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

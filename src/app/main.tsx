import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import App from './App';
import '@/styles/index.css';

import { subjectKnowledgeService } from '@/shared/services/knowledge/subject-knowledge.service';

// Start preloading subject guidelines
subjectKnowledgeService.preload().catch(console.error);

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

import React, { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuizSessionProvider } from '@/features/quiz/hooks/context/QuizSessionProvider';
import { QuizView } from '@/features/quiz/components/execution/QuizView';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/utils/routes';

export const QuizPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  if (!courseId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Kurs bulunamadı.</p>
        <Button onClick={() => navigate(ROUTES.HOME)}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <ErrorBoundary>
        <QuizSessionProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
          >
            <QuizView courseId={courseId} />
          </Suspense>
        </QuizSessionProvider>
      </ErrorBoundary>
    </div>
  );
};

export default QuizPage;

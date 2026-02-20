import { useEffect, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuizView } from '@/features/quiz/components';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/utils/routes';
import { preloadSubjectKnowledge } from '@/features/quiz/services/quizInfoService';
import { logger } from '@/utils/logger';

export const QuizPage: FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Preload subject knowledge when QuizPage mounts
  useEffect(() => {
    preloadSubjectKnowledge().catch((err: unknown) =>
      logger.error('Failed to preload subject knowledge', err as Error)
    );
  }, []);

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
        <QuizView courseId={courseId} />
      </ErrorBoundary>
    </div>
  );
};

export default QuizPage;

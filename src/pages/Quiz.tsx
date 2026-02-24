import { useEffect, FC, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/utils/routes';
import { preloadSubjectKnowledge } from '@/features/quiz/services/quizInfoService';
import { logger } from '@/utils/logger';
import {
  useQuizManager,
  QUIZ_PHASE,
} from '@/features/quiz/hooks/useQuizManager';
import { useQuizPersistence } from '@/features/quiz/hooks/useQuizPersistence';
import { TopicSidebar } from '@/features/quiz/components/QuizSideComponents';
import {
  InitialStateView,
  CourseOverview,
} from '@/features/quiz/components/QuizIntroViews';

import { MappingProgressView } from '@/features/quiz/components/MappingProgressView';
import { BriefingView } from '@/features/quiz/components/BriefingView';
import { SmartExamView } from '@/features/quiz/components/SmartExamView';
import { QuizContainer } from '@/features/quiz/components/QuizContainer';
import { cn, slugify } from '@/utils/stringHelpers';
import { getCourseBySlug } from '@/features/courses/services/courseService';
import {
  type Course,
  type TopicWithCounts,
} from '@/features/courses/types/courseTypes';

export const QuizPage: FC = () => {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [isResolvingCourse, setIsResolvingCourse] = useState(true);

  // Fetch course data by slug
  useEffect(() => {
    async function resolveCourse() {
      if (!courseSlug) {
        setIsResolvingCourse(false);
        return;
      }

      try {
        const course = await getCourseBySlug(courseSlug);
        setCourseData(course);
      } catch (err) {
        logger.error('Failed to resolve course by slug:', err as Error);
      } finally {
        setIsResolvingCourse(false);
      }
    }

    resolveCourse();
  }, [courseSlug]);

  const { clear } = useQuizPersistence(courseData?.id || '');

  const {
    topics,
    selectedTopic,
    setSelectedTopic,
    targetChunkId,
    loading,
    completionStatus,
    isQuizActive,
    isGeneratingExam,
    quizPhase,
    examLogs,
    examProgress,
    handleStartQuiz,
    handleGenerate,
    handleFinishQuiz,
    handleStartSmartExam,
    courseProgress,
  } = useQuizManager({
    isOpen: true,
    courseId: courseData?.id || '',
    courseName: courseData?.name || '',
  });

  // Sync selectedTopic with topicSlug from URL
  useEffect(() => {
    if (topics.length > 0) {
      if (topicSlug) {
        const topic = topics.find((t) => slugify(t.name) === topicSlug);
        if (topic && (!selectedTopic || selectedTopic.name !== topic.name)) {
          setSelectedTopic(topic);
        }
      } else if (selectedTopic) {
        // If no topicSlug but we have a selectedTopic, it means we are at overview
        setSelectedTopic(null);
      }
    }
  }, [topicSlug, topics, setSelectedTopic, selectedTopic]);

  // Preload subject knowledge when QuizPage mounts
  useEffect(() => {
    preloadSubjectKnowledge().catch((err: unknown) =>
      logger.error('Failed to preload subject knowledge', err as Error)
    );
  }, []);

  const handleTopicSelect = (topic: TopicWithCounts) => {
    if (topic) {
      navigate(`${ROUTES.QUIZ}/${courseSlug}/${slugify(topic.name)}`);
    } else {
      navigate(`${ROUTES.QUIZ}/${courseSlug}`);
    }
  };

  const handleBack = async () => {
    await handleFinishQuiz();
    clear();
    navigate(`${ROUTES.QUIZ}/${courseSlug}`);
  };

  if (isResolvingCourse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin size-8 text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">
          Ders bilgileri alınıyor...
        </p>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Kurs bulunamadı.</p>
        <Button onClick={() => navigate(ROUTES.HOME)}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          'flex-1 min-h-0 flex overflow-hidden',
          isQuizActive ? 'flex flex-col' : 'grid lg:grid-cols-[280px_1fr] gap-6'
        )}
      >
        {/* Sidebar */}
        {!isQuizActive && (
          <div className="flex flex-col min-h-0 border rounded-xl bg-card/40 overflow-hidden h-full">
            <TopicSidebar
              loading={loading}
              topics={topics}
              selectedTopic={selectedTopic}
              onSelectTopic={handleTopicSelect}
              onStartSmartExam={handleStartSmartExam}
              isGeneratingExam={isGeneratingExam}
            />
          </div>
        )}

        {/* Work Area */}
        <div className="flex flex-col min-h-0 flex-1 bg-card/40 rounded-xl border overflow-hidden h-full">
          <ErrorBoundary>
            {isQuizActive && selectedTopic ? (
              <QuizContainer
                chunkId={targetChunkId || undefined}
                courseId={courseData.id}
                onClose={handleBack}
              />
            ) : selectedTopic ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10 shrink-0 ">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {selectedTopic.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {quizPhase === QUIZ_PHASE.NOT_ANALYZED &&
                        'Henüz analiz edilmedi'}
                      {quizPhase === QUIZ_PHASE.MAPPING && 'Analiz ediliyor...'}
                      {quizPhase === QUIZ_PHASE.BRIEFING && 'Hazır'}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-0 p-6 flex flex-col">
                  <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
                    {quizPhase === QUIZ_PHASE.NOT_ANALYZED && (
                      <InitialStateView onGenerate={handleGenerate} />
                    )}

                    {quizPhase === QUIZ_PHASE.MAPPING && (
                      <MappingProgressView
                        examProgress={examProgress}
                        examLogs={examLogs}
                      />
                    )}

                    {quizPhase === QUIZ_PHASE.BRIEFING && completionStatus && (
                      <BriefingView
                        completionStatus={completionStatus}
                        onStartQuiz={handleStartQuiz}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : isGeneratingExam ? (
              <div className="flex-1 p-6 flex items-center justify-center">
                <SmartExamView
                  examProgress={examProgress}
                  examLogs={examLogs}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center items-center">
                <CourseOverview
                  courseName={courseData.name}
                  progress={courseProgress}
                />
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;

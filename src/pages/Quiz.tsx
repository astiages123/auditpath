import { useEffect, FC, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen, PanelLeftClose } from 'lucide-react';
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
    <div className="flex flex-col h-[calc(100vh-96px)] lg:h-[calc(100vh-128px)] overflow-hidden">
      <div
        className={cn(
          'flex-1 min-h-0 flex px-2 lg:px-4 h-full overflow-hidden',
          isQuizActive ? 'flex flex-col' : 'grid lg:grid-cols-[240px_1fr] gap-4'
        )}
      >
        {/* Sidebar */}
        {!isQuizActive && (
          <aside className="flex flex-col shrink-0 border rounded-xl bg-card/40 h-[400px] lg:h-full overflow-hidden transition-all duration-300 ease-in-out z-20">
            <div className="min-w-[240px] h-full flex flex-col">
              <TopicSidebar
                loading={loading}
                topics={topics}
                selectedTopic={selectedTopic}
                onSelectTopic={handleTopicSelect}
                onStartSmartExam={handleStartSmartExam}
                isGeneratingExam={isGeneratingExam}
              />
            </div>
          </aside>
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
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Sticky Header */}
                <div
                  id="notes-sticky-header"
                  className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 px-6 py-4">
                    <button
                      data-slot="button"
                      data-variant="ghost"
                      data-size="icon"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent/50 size-9 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <PanelLeftClose className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {selectedTopic ? selectedTopic.name : courseData.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                          Sınav Merkezi
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3"></div>
                  </div>
                </div>

                {/* Scroll Container */}
                <div
                  id="notes-scroll-container"
                  className="flex-1 min-h-0 p-4 lg:p-6 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar mx-auto w-full"
                >
                  <div className="w-full flex-1 flex flex-col min-h-0 mx-auto transition-all duration-300 max-w-6xl">
                    {selectedTopic ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        {quizPhase === QUIZ_PHASE.NOT_ANALYZED && (
                          <InitialStateView onGenerate={handleGenerate} />
                        )}

                        {quizPhase === QUIZ_PHASE.MAPPING && (
                          <MappingProgressView
                            examProgress={examProgress}
                            examLogs={examLogs}
                          />
                        )}

                        {quizPhase === QUIZ_PHASE.BRIEFING &&
                          completionStatus && (
                            <BriefingView
                              completionStatus={completionStatus}
                              onStartQuiz={handleStartQuiz}
                            />
                          )}
                      </div>
                    ) : isGeneratingExam ? (
                      <div className="flex-1 flex items-center justify-center">
                        <SmartExamView
                          examProgress={examProgress}
                          examLogs={examLogs}
                        />
                      </div>
                    ) : (
                      <CourseOverview
                        courseName={courseData.name}
                        progress={courseProgress}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;

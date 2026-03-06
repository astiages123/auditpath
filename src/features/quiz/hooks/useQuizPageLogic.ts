import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { ROUTES } from '@/utils/routes';
import { slugify } from '@/utils/stringHelpers';
import { getCourseBySlug } from '@/features/courses/services/courseService';
import {
  type Course,
  type TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import {
  QUIZ_PHASE,
  useQuizManager,
} from '@/features/quiz/hooks/useQuizManager';
import { useQuizPersistence } from '@/features/quiz/hooks/useQuizPersistence';

export function useQuizPageLogic() {
  const { courseSlug, topicSlug } = useParams<{
    courseSlug: string;
    topicSlug?: string;
  }>();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [isResolvingCourse, setIsResolvingCourse] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
        logger.error(
          'QuizPage',
          'resolveCourse',
          'Failed to resolve course by slug',
          err as Error
        );
      } finally {
        setIsResolvingCourse(false);
      }
    }

    void resolveCourse();
  }, [courseSlug]);

  const { clear } = useQuizPersistence(courseData?.id || '');
  const quizManager = useQuizManager({
    isOpen: true,
    courseId: courseData?.id || '',
    courseName: courseData?.name || '',
  });

  const {
    topics,
    selectedTopic,
    setSelectedTopic,
    handleFinishQuiz,
    handleStartSmartExam,
  } = quizManager;

  useEffect(() => {
    if (topics.length === 0) return;

    if (topicSlug) {
      const topic = topics.find(
        (topicItem) => slugify(topicItem.name) === topicSlug
      );
      if (topic && (!selectedTopic || selectedTopic.name !== topic.name)) {
        setSelectedTopic(topic);
      }
      return;
    }

    if (selectedTopic) {
      setSelectedTopic(null);
    }
  }, [topicSlug, topics, selectedTopic, setSelectedTopic]);

  const handleTopicSelect = useCallback(
    (topic: TopicWithCounts | null) => {
      if (topic) {
        navigate(`${ROUTES.QUIZ}/${courseSlug}/${slugify(topic.name)}`);
        return;
      }

      navigate(`${ROUTES.QUIZ}/${courseSlug}`);
    },
    [navigate, courseSlug]
  );

  const handleBack = useCallback(async () => {
    await handleFinishQuiz();
    clear();
    navigate(`${ROUTES.QUIZ}/${courseSlug}`);
  }, [handleFinishQuiz, clear, navigate, courseSlug]);

  const handleMobileTopicSelect = useCallback(
    (topic: TopicWithCounts) => {
      handleTopicSelect(topic);
      setIsMobileSidebarOpen(false);
    },
    [handleTopicSelect]
  );

  const handleMobileSmartExamStart = useCallback(() => {
    void handleStartSmartExam();
    setIsMobileSidebarOpen(false);
  }, [handleStartSmartExam]);

  const navigateToLibrary = useCallback(() => {
    navigate(ROUTES.LIBRARY);
  }, [navigate]);

  return {
    courseSlug,
    courseData,
    isResolvingCourse,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleTopicSelect,
    handleBack,
    handleMobileTopicSelect,
    handleMobileSmartExamStart,
    navigateToLibrary,
    quizPhaseOptions: QUIZ_PHASE,
    ...quizManager,
  };
}

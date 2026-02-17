import { useCallback, useEffect, useState } from "react";
import {
    getCourseProgress,
    getCourseTopicsWithCounts,
    getTopicCompletionStatus,
} from "@/features/quiz/services/core/quizStatusService";
import { getFirstChunkIdForTopic } from "@/features/quiz/services/core/quizTopicService";
import {
    TopicCompletionStats,
    TopicWithCounts,
} from "@/features/courses/types/courseTypes";
import { logger } from "@/utils/logger";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useQuizTopics(courseId: string, isOpen: boolean) {
    const { user } = useAuth();
    const [topics, setTopics] = useState<TopicWithCounts[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<TopicWithCounts | null>(
        null,
    );
    const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [completionStatus, setCompletionStatus] = useState<
        TopicCompletionStats | null
    >(null);
    const [courseProgress, setCourseProgress] = useState<
        {
            total: number;
            solved: number;
            percentage: number;
        } | null
    >(null);

    const loadTopics = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const data = await getCourseTopicsWithCounts(courseId);
            setTopics(data);
            if (user) {
                const progress = await getCourseProgress(user.id, courseId);
                setCourseProgress(progress);
            }
        } catch (error) {
            logger.error("Error loading topics", error as Error);
        } finally {
            setLoading(false);
        }
    }, [courseId, user]);

    useEffect(() => {
        if (isOpen) {
            loadTopics();
        }
    }, [isOpen, loadTopics]);

    useEffect(() => {
        let mounted = true;
        if (!selectedTopic || !courseId || !user) {
            setTargetChunkId(null);
            setCompletionStatus(null);
            return;
        }

        async function loadTopicData() {
            if (!selectedTopic || !courseId || !user) return;
            try {
                const chunkRes = await getFirstChunkIdForTopic(
                    courseId,
                    selectedTopic.name,
                );
                const status = await getTopicCompletionStatus(
                    user.id,
                    courseId,
                    selectedTopic.name,
                );

                if (mounted) {
                    setTargetChunkId(chunkRes);
                    setCompletionStatus(status);
                }
            } catch (error) {
                logger.error("Error loading topic data", error as Error);
            }
        }

        loadTopicData();
        return () => {
            mounted = false;
        };
    }, [selectedTopic, courseId, user]);

    return {
        user,
        topics,
        setTopics,
        selectedTopic,
        setSelectedTopic,
        targetChunkId,
        loading,
        completionStatus,
        setCompletionStatus,
        courseProgress,
        loadTopics,
    };
}

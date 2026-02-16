import * as Repository from "@/features/quiz/services/repositories/quizRepository";

export interface SessionContext {
    userId: string;
    courseId: string;
    courseName?: string;
    sessionNumber: number;
    isNewSession: boolean;
}

/**
 * Starts a new quiz session for the given user and course.
 */
export async function startSession(
    userId: string,
    courseId: string,
): Promise<SessionContext> {
    const sessionInfo = await Repository.incrementCourseSession(
        userId,
        courseId,
    );
    const courseName = await Repository.getCourseName(courseId);

    if (!sessionInfo.data) {
        throw new Error(
            sessionInfo.error?.message || "Failed to start session",
        );
    }

    return {
        userId,
        courseId,
        courseName: courseName || "",
        sessionNumber: sessionInfo.data.current_session,
        isNewSession: sessionInfo.data.is_new_session,
    };
}

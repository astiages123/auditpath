/**
 * Quiz Feature Root
 *
 * This is the main entry point for the quiz feature.
 * It exports functionalities from various tasks:
 * - solve-quiz: UI and interaction for answering questions
 * - generate-questions: AI-driven question generation
 * - manage-mastery: SRS logic and mastery statistics
 */

// Tasks
export * from "./tasks/solve-quiz";
export * from "./tasks/generate-questions";
export * from "./tasks/manage-mastery";

// Shared
export * from "./shared/types";

// Contexts
export { QuizSessionContext } from "./contexts/QuizSessionContext";
export { QuizSessionProvider } from "./contexts/QuizSessionProvider";

// Background tasks
export { checkAndTriggerBackgroundGeneration } from "./tasks/generate-questions/background-orchestrator";

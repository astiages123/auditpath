import { AnalysisTask, type AnalysisTaskInput } from "../tasks/analysis";
import {
    DraftingTask,
    type DraftingTaskInput,
    type GeneratedQuestion,
} from "../tasks/drafting";
import { ValidationTask, type ValidationTaskInput } from "../tasks/validation";
import { RevisionTask, type RevisionTaskInput } from "../tasks/revision";
import { PromptArchitect } from "../core/prompt/prompt-architect";

export interface PipelineOptions {
    onLog?: (message: string, details?: any) => void;
    onQuestionApproved?: (
        question: GeneratedQuestion,
        index: number,
    ) => Promise<void>;
}

export class GenerationPipeline {
    private analysisTask = new AnalysisTask();
    private draftingTask = new DraftingTask();
    private validationTask = new ValidationTask();
    private revisionTask = new RevisionTask();

    constructor(private options: PipelineOptions = {}) {}

    private log(msg: string, details?: any) {
        if (this.options.onLog) {
            this.options.onLog(msg, details);
        } else {
            console.log(`[Pipeline] ${msg}`, details || "");
        }
    }

    async run(
        content: string,
        courseName: string,
        sectionTitle: string,
        wordCount: number,
        usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
        guidelines: any = null,
        chunkId?: string, // Used for future "previous diagnoses" if we add DB calls here
    ): Promise<GeneratedQuestion[]> {
        // 1. Analyze Content
        const analysisResult = await this.analysisTask.run({
            content,
            wordCount,
        }, { logger: this.options.onLog });
        if (!analysisResult.success || !analysisResult.data) {
            this.log("Analysis failed, aborting.");
            return [];
        }

        const concepts = analysisResult.data.concepts;
        this.log(`Analysis complete. Identified ${concepts.length} concepts.`);

        // Pre-build shared context
        const cleanContent = PromptArchitect.cleanReferenceImages(content);
        const sharedContextPrompt = PromptArchitect.buildContext(
            cleanContent,
            courseName,
            sectionTitle,
            guidelines,
        );

        const results: GeneratedQuestion[] = [];
        const MAX_REVISION_ATTEMPTS = 2;

        // 2. Loop through concepts
        for (let i = 0; i < concepts.length; i++) {
            const concept = concepts[i];
            const globalIndex = i; // Simplified index

            this.log(
                `Processing concept ${
                    i + 1
                }/${concepts.length}: ${concept.baslik}`,
            );

            // A. Draft
            const draftInput: DraftingTaskInput = {
                concept,
                index: globalIndex,
                wordCount,
                courseName,
                usageType,
                sharedContextPrompt,
            };

            const draftResult = await this.draftingTask.run(draftInput, {
                logger: this.options.onLog,
            });

            if (!draftResult.success || !draftResult.data) {
                this.log(`Drafting failed for ${concept.baslik}, skipping.`);
                continue;
            }

            let question = draftResult.data;

            // B. Validate
            let validationInput: ValidationTaskInput = {
                question,
                content: cleanContent,
            };

            let validationResult = await this.validationTask.run(
                validationInput,
                { logger: this.options.onLog },
            );

            // C. Revise Loop
            let revisionAttempt = 0;
            while (
                validationResult.success &&
                validationResult.data?.decision === "REJECTED" &&
                revisionAttempt < MAX_REVISION_ATTEMPTS
            ) {
                revisionAttempt++;
                this.log(
                    `Validation rejected. Attempting revision ${revisionAttempt}...`,
                    validationResult.data.critical_faults,
                );

                const revisionInput: RevisionTaskInput = {
                    originalQuestion: question,
                    validationResult: validationResult.data,
                    sharedContextPrompt,
                };

                const revisionTaskResult = await this.revisionTask.run(
                    revisionInput,
                    { logger: this.options.onLog },
                );

                if (!revisionTaskResult.success || !revisionTaskResult.data) {
                    this.log("Revision creation failed, aborting revisions.");
                    break;
                }

                question = revisionTaskResult.data;

                // Re-validate
                validationInput = { question, content: cleanContent };
                validationResult = await this.validationTask.run(
                    validationInput,
                    { logger: this.options.onLog },
                );
            }

            // D. Final Decision
            if (
                validationResult.success &&
                validationResult.data?.decision === "APPROVED"
            ) {
                this.log(`Question APPROVED for ${concept.baslik}`);
                results.push(question);
                if (this.options.onQuestionApproved) {
                    await this.options.onQuestionApproved(question, i);
                }
            } else {
                this.log(
                    `Question REJECTED for ${concept.baslik} after revisions.`,
                );
            }
        }

        return results;
    }

    /**
     * Run the generation loop with pre-calculated concepts (bypassing AnalysisTask)
     */
    async runWithConcepts(
        content: string,
        courseName: string,
        sectionTitle: string,
        wordCount: number,
        concepts: any[], // Type explicitly if needed
        startIndex: number,
        usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
        guidelines: any = null,
    ): Promise<GeneratedQuestion[]> {
        // Pre-build shared context
        const cleanContent = PromptArchitect.cleanReferenceImages(content);
        const sharedContextPrompt = PromptArchitect.buildContext(
            cleanContent,
            courseName,
            sectionTitle,
            guidelines,
        );

        const results: GeneratedQuestion[] = [];
        const MAX_REVISION_ATTEMPTS = 2;

        // Loop through concepts starting from startIndex (though logic usually implies batch is the slice)
        // If 'concepts' is already sliced, we iterate from 0.
        // Assuming 'concepts' passed here is the batch to process.

        for (let i = 0; i < concepts.length; i++) {
            const concept = concepts[i];
            const globalIndex = startIndex + i;

            this.log(
                `Processing concept ${
                    i + 1
                }/${concepts.length}: ${concept.baslik}`,
            );

            // A. Draft
            const draftInput: DraftingTaskInput = {
                concept,
                index: globalIndex,
                wordCount,
                courseName,
                usageType,
                sharedContextPrompt,
            };

            const draftResult = await this.draftingTask.run(draftInput, {
                logger: this.options.onLog,
            });

            if (!draftResult.success || !draftResult.data) {
                this.log(`Drafting failed for ${concept.baslik}, skipping.`);
                continue;
            }

            let question = draftResult.data;

            // B. Validate
            let validationInput: ValidationTaskInput = {
                question,
                content: cleanContent,
            };

            let validationResult = await this.validationTask.run(
                validationInput,
                { logger: this.options.onLog },
            );

            // C. Revise Loop
            let revisionAttempt = 0;
            while (
                validationResult.success &&
                validationResult.data?.decision === "REJECTED" &&
                revisionAttempt < MAX_REVISION_ATTEMPTS
            ) {
                revisionAttempt++;
                this.log(
                    `Validation rejected. Attempting revision ${revisionAttempt}...`,
                    validationResult.data.critical_faults,
                );

                const revisionInput: RevisionTaskInput = {
                    originalQuestion: question,
                    validationResult: validationResult.data,
                    sharedContextPrompt,
                };

                const revisionTaskResult = await this.revisionTask.run(
                    revisionInput,
                    { logger: this.options.onLog },
                );

                if (!revisionTaskResult.success || !revisionTaskResult.data) {
                    this.log("Revision creation failed, aborting revisions.");
                    break;
                }

                question = revisionTaskResult.data;

                // Re-validate
                validationInput = { question, content: cleanContent };
                validationResult = await this.validationTask.run(
                    validationInput,
                    { logger: this.options.onLog },
                );
            }

            // D. Final Decision
            if (
                validationResult.success &&
                validationResult.data?.decision === "APPROVED"
            ) {
                this.log(`Question APPROVED for ${concept.baslik}`);
                results.push(question);
                if (this.options.onQuestionApproved) {
                    await this.options.onQuestionApproved(question, i);
                }
            } else {
                this.log(
                    `Question REJECTED for ${concept.baslik} after revisions.`,
                );
            }
        }

        return results;
    }
}

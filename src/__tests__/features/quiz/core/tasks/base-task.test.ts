import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BaseTask,
  TaskContext,
  TaskResult,
} from '@/features/quiz/core/tasks/base-task';
import { logger } from '@/shared/lib/core/utils/logger';

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withPrefix: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

class TestableBaseTask extends BaseTask<{ input: string }, { output: string }> {
  async run(
    input: { input: string },
    context?: TaskContext
  ): Promise<TaskResult<{ output: string }>> {
    this.log(context, 'Test task running', { input: input.input });

    if (input.input.startsWith('error:')) {
      return { success: false, error: input.input.substring(6) };
    }

    return {
      success: true,
      data: { output: `processed: ${input.input}` },
      metadata: { processedAt: new Date().toISOString() },
    };
  }
}

describe('BaseTask', () => {
  let task: TestableBaseTask;

  beforeEach(() => {
    vi.clearAllMocks();
    task = new TestableBaseTask();
  });

  describe('Abstract Class Structure', () => {
    it('should be instantiable through concrete implementation', () => {
      expect(task).toBeInstanceOf(BaseTask);
      expect(task).toBeInstanceOf(TestableBaseTask);
    });

    it('should execute run method and return TaskResult', async () => {
      const result = await task.run({ input: 'test input' });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('TaskResult Structure', () => {
    it('should return success:true with data when input is valid', async () => {
      const result = await task.run({ input: 'valid input' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ output: 'processed: valid input' });
      expect(result.error).toBeUndefined();
    });

    it('should return success:false with error when input signals error', async () => {
      const result = await task.run({ input: 'error:something went wrong' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('something went wrong');
      expect(result.data).toBeUndefined();
    });

    it('should include metadata in successful results', async () => {
      const result = await task.run({ input: 'test' });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.processedAt).toBeDefined();
    });
  });

  describe('log Method', () => {
    it('should use context.logger when provided', async () => {
      const contextLogger = vi.fn();
      const context: TaskContext = {
        jobId: 'job-123',
        traceId: 'trace-456',
        logger: contextLogger,
      };

      await task.run({ input: 'test' }, context);

      expect(contextLogger).toHaveBeenCalledWith('Test task running', {
        input: 'test',
      });
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should fallback to global logger when context.logger is not provided', async () => {
      const context: TaskContext = {
        jobId: 'job-123',
        traceId: 'trace-456',
      };

      await task.run({ input: 'test' }, context);

      expect(logger.debug).toHaveBeenCalledWith('[Task] Test task running', {
        details: { input: 'test' },
      });
    });

    it('should handle undefined context gracefully', async () => {
      await task.run({ input: 'test' }, undefined);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle context without logger property', async () => {
      const context = { jobId: 'job-123' } as TaskContext;

      await task.run({ input: 'test' }, context);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle log calls without details', async () => {
      const contextLogger = vi.fn();
      const context: TaskContext = { logger: contextLogger };

      const taskWithoutDetails = new (class extends TestableBaseTask {
        async run(input: { input: string }, ctx?: TaskContext) {
          this.log(ctx, 'Simple message without details');
          return { success: true, data: { output: '' } };
        }
      })();

      await taskWithoutDetails.run({ input: 'test' }, context);

      expect(contextLogger).toHaveBeenCalledWith(
        'Simple message without details',
        undefined
      );
    });
  });

  describe('TaskContext', () => {
    it('should preserve jobId and traceId in context', async () => {
      const contextLogger = vi.fn();
      const context: TaskContext = {
        jobId: 'job-999',
        traceId: 'trace-888',
        logger: contextLogger,
      };

      await task.run({ input: 'test' }, context);

      expect(contextLogger).toHaveBeenCalledWith('Test task running', {
        input: 'test',
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce input and output types', async () => {
      const result = await task.run({ input: 'typed test' });

      expect(result.data?.output).toBe('processed: typed test');
    });
  });
});

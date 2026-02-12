import { describe, expect, it } from 'vitest';
import {
  calculateAdvancedScore,
  calculateNextReviewSession,
  calculateScoreChange,
  calculateShelfStatus,
  calculateTMax,
} from '@/features/quiz/algoritma/srs';
import {
  calculateMasteryChains,
  type MasteryNode,
  processGraphForAtlas,
} from '@/shared/lib/core/utils/mastery-logic';
import type { ConceptMapItem } from '@/features/quiz/core/types';

describe('SRS Logic (Shelf System)', () => {
  describe('calculateShelfStatus (3-Strike Rule)', () => {
    it('should increment successCount by 0.5 for correct but slow answers', () => {
      const result = calculateShelfStatus(0, true, false); // isCorrect=true, isFast=false
      expect(result.newStatus).toBe('pending_followup'); // 0.5 < 3
      expect(result.newSuccessCount).toBe(0.5);
    });

    it('should increment successCount by 1.0 for correct and fast answers', () => {
      const result = calculateShelfStatus(0, true, true); // isCorrect=true, isFast=true
      // Logic: if < 3 and >= 0.5 -> pending_followup.
      expect(result.newSuccessCount).toBe(1.0);
      expect(result.newStatus).toBe('pending_followup');
    });

    it('should archive item when successCount reaches 3', () => {
      const result = calculateShelfStatus(2.5, true, false); // 2.5 + 0.5 = 3.0
      expect(result.newSuccessCount).toBe(3.0);
      expect(result.newStatus).toBe('archived');
    });

    it('should reset successCount to 0 and set status to pending_followup on incorrect answer', () => {
      const result = calculateShelfStatus(2.5, false, false); // Incorrect
      expect(result.newStatus).toBe('pending_followup');
      expect(result.newSuccessCount).toBe(0);
    });

    it('should handle mixed increments correctly', () => {
      // Start 0 -> Slow Correct -> 0.5
      let result = calculateShelfStatus(0, true, false);
      expect(result.newSuccessCount).toBe(0.5);

      // 0.5 -> Fast Correct -> 1.5
      result = calculateShelfStatus(result.newSuccessCount, true, true);
      expect(result.newSuccessCount).toBe(1.5);

      // 1.5 -> Slow Correct -> 2.0
      result = calculateShelfStatus(result.newSuccessCount, true, false);
      expect(result.newSuccessCount).toBe(2.0);
    });
  });

  describe('calculateNextReviewSession', () => {
    // SESSION_GAPS = [1, 2, 5, 10, 20]
    it('should return correct gaps for success counts', () => {
      // gapIndex = Math.floor(successCount) - 1
      // fail (< 1) -> index 0 (gap 1)
      expect(calculateNextReviewSession(100, 0)).toBe(101); // gap 1
      expect(calculateNextReviewSession(100, 0.5)).toBe(101); // gap 1

      // successCount 1.0 -> index 0 (1-1=0) -> gap 1
      expect(calculateNextReviewSession(100, 1.0)).toBe(101); // gap 1

      // successCount 2.0 -> index 1 (2-1=1) -> gap 2
      expect(calculateNextReviewSession(100, 2.0)).toBe(102); // gap 2

      // successCount 3.0 -> index 2 (3-1=2) -> gap 5
      expect(calculateNextReviewSession(100, 3.0)).toBe(105); // gap 5

      // successCount 4.0 -> index 3 (4-1=3) -> gap 10
      expect(calculateNextReviewSession(100, 4.0)).toBe(110); // gap 10

      // successCount 5.0 -> index 4 (5-1=4) -> gap 20
      expect(calculateNextReviewSession(100, 5.0)).toBe(120); // gap 20
    });

    it('should cap at max gap for higher success counts', () => {
      // successCount 10.0 -> index 9 -> max index 4 -> gap 20
      expect(calculateNextReviewSession(100, 10.0)).toBe(120);
    });
  });

  describe('calculateAdvancedScore (Bloom & Time)', () => {
    it('should apply Bloom coefficients correctly', () => {
      // Base Delta = 10 (Standard Correct)
      // Time Ratio = 1.0 (Assume exact target time)

      // Knowledge: 1.0
      const knowledge = calculateAdvancedScore(10, 'knowledge', 20_000); // 20s is target for knowledge
      expect(knowledge.bloomCoeff).toBe(1.0);
      expect(knowledge.finalScore).toBe(10);

      // Application: 1.3
      const application = calculateAdvancedScore(10, 'application', 35_000); // 35s is target for application
      expect(application.bloomCoeff).toBe(1.3);
      expect(application.finalScore).toBe(13);

      // Analysis: 1.6
      const analysis = calculateAdvancedScore(10, 'analysis', 50_000); // 50s is target for analysis
      expect(analysis.bloomCoeff).toBe(1.6);
      expect(analysis.finalScore).toBe(16);
    });

    it('should cap timeRatio between 0.5 and 2.0', () => {
      const baseDelta = 10;
      const bloom = 'knowledge';

      // Fast answer (0.5x target time) -> ratio 2.0
      // tTarget = 20,000. tActual = 10,000. Ratio = 2.0
      const fast = calculateAdvancedScore(baseDelta, bloom, 10_000);
      expect(fast.timeRatio).toBe(2.0);
      expect(fast.finalScore).toBe(20); // 10 * 1.0 * 2.0

      // Very fast answer (0.1x target time) -> ratio capped at 2.0
      const veryFast = calculateAdvancedScore(baseDelta, bloom, 1_000);
      expect(veryFast.timeRatio).toBe(2.0);
      expect(veryFast.finalScore).toBe(20);

      // Slow answer (2x target time) -> ratio 0.5
      // tActual = 40,000. Ratio = 20,000 / 40,000 = 0.5
      const slow = calculateAdvancedScore(baseDelta, bloom, 40_000);
      expect(slow.timeRatio).toBe(0.5);
      expect(slow.finalScore).toBe(5); // 10 * 1.0 * 0.5

      // Very slow answer (10x target time) -> ratio capped at 0.5
      const verySlow = calculateAdvancedScore(baseDelta, bloom, 200_000);
      expect(verySlow.timeRatio).toBe(0.5);
      expect(verySlow.finalScore).toBe(5);
    });
  });
});

describe('Mastery Logic (Graph)', () => {
  // Mock concept map items
  const mockConcepts: ConceptMapItem[] = [
    {
      baslik: 'Root A',
      odak: 'Focus A',
      seviye: 'Bilgi',
      gorsel: null,
      prerequisites: [],
    },
    {
      baslik: 'Root B',
      odak: 'Focus B',
      seviye: 'Bilgi',
      gorsel: null,
      prerequisites: [],
    },
    {
      baslik: 'Child A1',
      odak: 'Focus A1',
      seviye: 'Uygulama',
      gorsel: null,
      prerequisites: ['Root A'],
    },
    {
      baslik: 'Child A2',
      odak: 'Focus A2',
      seviye: 'Analiz',
      gorsel: null,
      prerequisites: ['Root A'],
    },
  ];

  describe('calculateMasteryChains', () => {
    it('should evaluate Root nodes as chain complete if mastery >= 80', () => {
      const masteryMap = {
        'Root A': 85,
        'Root B': 50,
      };

      const nodes = calculateMasteryChains(mockConcepts, masteryMap);

      const rootA = nodes.find((n) => n.id === 'Root A');
      const rootB = nodes.find((n) => n.id === 'Root B');

      expect(rootA?.isChainComplete).toBe(true); // >= 80 and no prereqs -> considered complete for root (assuming prereq logic holds empty array as true)
      expect(rootB?.isChainComplete).toBe(false); // < 80
    });

    it('should verify chain formatting rule: Node >= 80 AND Prerequisites >= 85', () => {
      const masteryMap = {
        'Root A': 90, // Prereq for Child A1 (>= 85)
        'Child A1': 80, // Self (>= 80)
      };

      const nodes = calculateMasteryChains(mockConcepts, masteryMap);
      const childA1 = nodes.find((n) => n.id === 'Child A1');

      expect(childA1?.isChainComplete).toBe(true);
    });

    it('should fail chain if prerequisite is below 85 (even if node is mastered)', () => {
      const masteryMap = {
        'Root A': 82, // Prereq < 85 (but >=80 so it's mastered itself)
        'Child A1': 90, // Self >= 80
      };

      const nodes = calculateMasteryChains(mockConcepts, masteryMap);

      const rootA = nodes.find((n) => n.id === 'Root A');
      const childA1 = nodes.find((n) => n.id === 'Child A1');

      expect(rootA?.isChainComplete).toBe(true); // Root A is mastered (82 >= 80)
      expect(childA1?.isChainComplete).toBe(false); // Prereq (Root A) is 82, needs 85
    });

    it('should fail chain if node itself is below 80 (even if prereq is perfect)', () => {
      const masteryMap = {
        'Root A': 100,
        'Child A1': 75,
      };

      const nodes = calculateMasteryChains(mockConcepts, masteryMap);
      const childA1 = nodes.find((n) => n.id === 'Child A1');

      expect(childA1?.isChainComplete).toBe(false);
    });
  });

  describe('resilienceBonusDays', () => {
    const mockNodes: MasteryNode[] = [
      {
        id: 'A',
        label: 'A',
        mastery: 90,
        status: 'mastered',
        prerequisites: [],
        isChainComplete: true,
        depth: 0,
        data: { focus: '' },
      },
      {
        id: 'B',
        label: 'B',
        mastery: 90,
        status: 'mastered',
        prerequisites: ['A'],
        isChainComplete: true,
        depth: 1,
        data: { focus: '' },
      },
      {
        id: 'C',
        label: 'C',
        mastery: 90,
        status: 'mastered',
        prerequisites: ['A'],
        isChainComplete: true,
        depth: 1,
        data: { focus: '' },
      },
      {
        id: 'D',
        label: 'D',
        mastery: 60,
        status: 'in-progress',
        prerequisites: ['B'],
        isChainComplete: false,
        depth: 2,
        data: { focus: '' },
      },
    ];

    it('should calculate bonus days based on completed chains', () => {
      // Logic in processGraphForAtlas:
      // if (node.isChainComplete && node.prerequisites.length > 0) chainCount++
      // bonus = chainCount * 2

      // In mockNodes:
      // A: isChainComplete=true, prereqs=[] -> Not counted (Root)
      // B: isChainComplete=true, prereqs=["A"] -> Counted (+1)
      // C: isChainComplete=true, prereqs=["A"] -> Counted (+1)
      // D: isChainComplete=false -> Not counted

      // Total chains = 2
      // Expected bonus = 4 days

      const stats = processGraphForAtlas(mockNodes);

      expect(stats.totalChains).toBe(2);
      expect(stats.resilienceBonusDays).toBe(4);
    });
  });
});

describe('SRS Stress Tests (Edge Cases)', () => {
  describe('The Snail - Slow Success Accumulation', () => {
    it('should archive question after 6 consecutive slow correct answers', () => {
      // 6 slow corrects * 0.5 = 3.0 success points
      let successCount = 0;
      let status: 'active' | 'pending_followup' | 'archived' = 'active';

      // Attempt 1: 0 + 0.5 = 0.5 -> pending_followup
      let result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(0.5);
      expect(status).toBe('pending_followup');

      // Attempt 2: 0.5 + 0.5 = 1.0 -> pending_followup
      result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(1.0);
      expect(status).toBe('pending_followup');

      // Attempt 3: 1.0 + 0.5 = 1.5 -> pending_followup (test specifies this)
      result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(1.5);
      expect(status).toBe('pending_followup');

      // Attempt 4: 1.5 + 0.5 = 2.0 -> pending_followup
      result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(2.0);
      expect(status).toBe('pending_followup');

      // Attempt 5: 2.0 + 0.5 = 2.5 -> pending_followup
      result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(2.5);
      expect(status).toBe('pending_followup');

      // Attempt 6: 2.5 + 0.5 = 3.0 -> archived (test specifies this)
      result = calculateShelfStatus(successCount, true, false);
      successCount = result.newSuccessCount;
      status = result.newStatus;
      expect(successCount).toBe(3.0);
      expect(status).toBe('archived');
    });
  });

  describe('The Bloom Leap - Advanced Score Multiplication', () => {
    it('should give 1.6x higher score for analysis vs knowledge at same base delta', () => {
      const baseDelta = 10;
      const targetTimeKnowledge = 20_000;
      const targetTimeAnalysis = 50_000;

      // Knowledge level (bloomCoeff = 1.0)
      const knowledgeResult = calculateAdvancedScore(
        baseDelta,
        'knowledge',
        targetTimeKnowledge
      );

      // Analysis level (bloomCoeff = 1.6)
      const analysisResult = calculateAdvancedScore(
        baseDelta,
        'analysis',
        targetTimeAnalysis
      );

      // Both should have timeRatio = 1.0 (exact target time)
      expect(knowledgeResult.timeRatio).toBe(1.0);
      expect(analysisResult.timeRatio).toBe(1.0);

      // Verify coefficients
      expect(knowledgeResult.bloomCoeff).toBe(1.0);
      expect(analysisResult.bloomCoeff).toBe(1.6);

      // Analysis should be exactly 1.6x higher
      expect(analysisResult.finalScore).toBe(16); // 10 * 1.6 * 1.0
      expect(knowledgeResult.finalScore).toBe(10); // 10 * 1.0 * 1.0
      expect(analysisResult.finalScore / knowledgeResult.finalScore).toBe(1.6);
    });

    it('should maintain 1.6x multiplier regardless of time ratio', () => {
      const baseDelta = 10;

      // Fast answers
      const knowledgeFast = calculateAdvancedScore(
        baseDelta,
        'knowledge',
        10_000
      ); // 2x ratio
      const analysisFast = calculateAdvancedScore(
        baseDelta,
        'analysis',
        25_000
      ); // 2x ratio

      expect(analysisFast.finalScore / knowledgeFast.finalScore).toBeCloseTo(
        1.6,
        1
      );

      // Slow answers
      const knowledgeSlow = calculateAdvancedScore(
        baseDelta,
        'knowledge',
        40_000
      ); // 0.5x ratio
      const analysisSlow = calculateAdvancedScore(
        baseDelta,
        'analysis',
        100_000
      ); // 0.5x ratio

      expect(analysisSlow.finalScore / knowledgeSlow.finalScore).toBeCloseTo(
        1.6,
        1
      );
    });
  });

  describe('Penalty Loop - Score Accumulation Floor', () => {
    it('should accumulate penalties correctly and never go below 0', () => {
      let currentScore = 50;

      // First incorrect: -5 points
      let result = calculateScoreChange('incorrect', currentScore, false);
      expect(result.delta).toBe(-5);
      expect(result.newScore).toBe(45);
      currentScore = result.newScore;

      // Second incorrect (repeated): -10 points
      result = calculateScoreChange('incorrect', currentScore, true);
      expect(result.delta).toBe(-10);
      expect(result.newScore).toBe(35);
      currentScore = result.newScore;

      // Blank (not repeated): -2 points
      result = calculateScoreChange('blank', currentScore, false);
      expect(result.delta).toBe(-2);
      expect(result.newScore).toBe(33);
      currentScore = result.newScore;

      // Another blank (repeated): -10 points
      result = calculateScoreChange('blank', currentScore, true);
      expect(result.delta).toBe(-10);
      expect(result.newScore).toBe(23);
      currentScore = result.newScore;

      // Multiple penalties that would go below 0
      result = calculateScoreChange('incorrect', currentScore, true); // -10
      expect(result.newScore).toBe(13);
      currentScore = result.newScore;

      result = calculateScoreChange('incorrect', currentScore, true); // -10
      expect(result.newScore).toBe(3);
      currentScore = result.newScore;

      // This should floor at 0, not go negative
      result = calculateScoreChange('incorrect', currentScore, true); // -10 would be -7
      expect(result.delta).toBe(-10);
      expect(result.newScore).toBe(0); // Floored at 0
    });

    it('should handle rapid penalty accumulation from high score', () => {
      let currentScore = 100;

      // Simulate 20 consecutive repeated penalties
      for (let i = 0; i < 20; i++) {
        const result = calculateScoreChange('incorrect', currentScore, true);
        currentScore = result.newScore;
      }

      // Should be at floor (0)
      expect(currentScore).toBe(0);
    });
  });

  describe('Dynamic Tmax - Fair Time Allocation', () => {
    it('should increase Tmax proportionally with charCount', () => {
      const conceptCount = 0;
      const bloomLevel = 'knowledge';

      const tmax1000 = calculateTMax(1000, conceptCount, bloomLevel);
      const tmax2000 = calculateTMax(2000, conceptCount, bloomLevel);
      const tmax3000 = calculateTMax(3000, conceptCount, bloomLevel);

      // Tmax should increase linearly with character count
      expect(tmax2000).toBeGreaterThan(tmax1000);
      expect(tmax3000).toBeGreaterThan(tmax2000);

      // Verify exact values (Assuming Knowledge difficultyMultiplier = 1.0)
      // ReadingComponent = (char / 780) * 60 + (15 + concept*2)*1.0 + 10
      const expected1000 = Math.round(((1000 / 780) * 60 + 15 + 10) * 1000);
      expect(tmax1000).toBe(expected1000);
    });

    it('should apply difficulty multipliers correctly', () => {
      const charCount = 780; // 1 minute reading at base rate
      const conceptCount = 0;

      const tmaxKnowledge = calculateTMax(charCount, conceptCount, 'knowledge');
      const tmaxApplication = calculateTMax(
        charCount,
        conceptCount,
        'application'
      );
      const tmaxAnalysis = calculateTMax(charCount, conceptCount, 'analysis');

      // Higher difficulty = more time
      expect(tmaxApplication).toBeGreaterThan(tmaxKnowledge);
      expect(tmaxAnalysis).toBeGreaterThan(tmaxApplication);

      // Verify exact values
      // Knowledge: reading(60s) + complexity((15+0)*1.0=15s) + buffer(10s) = 85s = 85000ms
      expect(tmaxKnowledge).toBe(85000);

      // Application: reading(60s) + complexity((15+0)*1.2=18s) + buffer(10s) = 88s = 88000ms
      expect(tmaxApplication).toBe(88000);

      // Analysis: reading(60s) + complexity((15+0)*1.5=22.5s) + buffer(10s) = 92.5s = 92500ms
      expect(tmaxAnalysis).toBe(92500);
    });

    it('should adjust for concept counts', () => {
      const charCount = 780;
      const bloomLevel = 'knowledge';

      const tmax0 = calculateTMax(charCount, 0, bloomLevel);
      const tmax5 = calculateTMax(charCount, 5, bloomLevel);

      // More concepts = more complex questions = more time
      expect(tmax5).toBeGreaterThan(tmax0);

      // Difference should be (5 * 2) * 1.0 = 10 seconds = 10000ms
      expect(tmax5 - tmax0).toBe(10000);
    });
  });

  describe('Minimum Session Gap Protection', () => {
    it('should guarantee minimum 1 session gap for successCount < 1', () => {
      const currentSession = 100;

      // successCount = 0 (new question or no success yet)
      expect(calculateNextReviewSession(currentSession, 0)).toBe(101); // +1 gap

      // successCount = 0.5 (one slow success)
      expect(calculateNextReviewSession(currentSession, 0.5)).toBe(101); // +1 gap

      // successCount = 0.9 (almost at first threshold)
      expect(calculateNextReviewSession(currentSession, 0.9)).toBe(101); // +1 gap
    });

    it('should use SESSION_GAPS correctly for successCount >= 1', () => {
      const currentSession = 100;

      // SESSION_GAPS = [1, 2, 5, 10, 20]
      expect(calculateNextReviewSession(currentSession, 1.0)).toBe(101); // gap 1
      expect(calculateNextReviewSession(currentSession, 2.0)).toBe(102); // gap 2
      expect(calculateNextReviewSession(currentSession, 3.0)).toBe(105); // gap 5
      expect(calculateNextReviewSession(currentSession, 4.0)).toBe(110); // gap 10
      expect(calculateNextReviewSession(currentSession, 5.0)).toBe(120); // gap 20
    });

    it('should cap at max gap for very high success counts', () => {
      const currentSession = 100;

      // Anything >= 5 should use gap 20 (max index in SESSION_GAPS)
      expect(calculateNextReviewSession(currentSession, 10)).toBe(120);
      expect(calculateNextReviewSession(currentSession, 100)).toBe(120);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  calculateMasteryChains,
  MasteryNode,
  processGraphForAtlas,
} from '@/shared/lib/core/utils/mastery-logic';
import { ConceptMapItem } from '@/shared/types/quiz';

describe('mastery-logic', () => {
  const mockConcepts: ConceptMapItem[] = [
    {
      baslik: 'RootNode',
      odak: 'Focus1',
      prerequisites: [],
      seviye: 'Bilgi',
      gorsel: null,
    },
    {
      baslik: 'ChildNode',
      odak: 'Focus2',
      prerequisites: ['RootNode'],
      seviye: 'Bilgi',
      gorsel: null,
    },
  ];

  describe('calculateMasteryChains', () => {
    it('should assign status correctly based on score', () => {
      const masteryMap = { RootNode: 40, ChildNode: 60 };
      const nodes = calculateMasteryChains(mockConcepts, masteryMap);

      expect(nodes.find((n) => n.id === 'RootNode')?.status).toBe('weak');
      expect(nodes.find((n) => n.id === 'ChildNode')?.status).toBe(
        'in-progress'
      );

      const masteredMap = { RootNode: 80 };
      const masteredNodes = calculateMasteryChains(
        [mockConcepts[0]],
        masteredMap
      );
      expect(masteredNodes[0].status).toBe('mastered');
    });

    it('should calculate isChainComplete based on self and prerequisites', () => {
      // ChildNode needs RootNode >= 85 and self >= 80
      const masteryMap = { RootNode: 85, ChildNode: 80 };
      const nodes = calculateMasteryChains(mockConcepts, masteryMap);

      expect(nodes.find((n) => n.id === 'ChildNode')?.isChainComplete).toBe(
        true
      );

      // If RootNode is 80 (>=80 but <85), ChildNode chain is not complete
      const failPrereqMap = { RootNode: 80, ChildNode: 80 };
      const failNodes = calculateMasteryChains(mockConcepts, failPrereqMap);
      expect(failNodes.find((n) => n.id === 'ChildNode')?.isChainComplete).toBe(
        false
      );
    });

    it('should treat nodes with no prereqs as chain complete if self >= 80', () => {
      const masteryMap = { RootNode: 80 };
      const nodes = calculateMasteryChains([mockConcepts[0]], masteryMap);
      expect(nodes[0].isChainComplete).toBe(true);
    });
  });

  describe('processGraphForAtlas', () => {
    const rawNodes: MasteryNode[] = [
      {
        id: 'RootNode',
        label: 'RootNode',
        mastery: 90,
        status: 'mastered',
        prerequisites: [],
        isChainComplete: true,
        depth: 0,
        data: { focus: 'F1' },
      },
      {
        id: 'ChildNode',
        label: 'ChildNode',
        mastery: 80,
        status: 'mastered',
        prerequisites: ['RootNode'],
        isChainComplete: true,
        depth: 1,
        data: { focus: 'F2' },
      },
    ];

    it('should create edges and detect strong links', () => {
      const stats = processGraphForAtlas(rawNodes);

      expect(stats.edges).toHaveLength(1);
      expect(stats.edges[0]).toEqual({
        source: 'RootNode',
        target: 'ChildNode',
        isStrong: true, // Root is 90 (>=85) and Child is 80 (>=80)
      });
    });

    it('should count total chains correctly (chain complete + has prereqs)', () => {
      const stats = processGraphForAtlas(rawNodes);
      // Only ChildNode counts as a chain in processGraphForAtlas because it has prereqs
      expect(stats.totalChains).toBe(1);
      expect(stats.resilienceBonusDays).toBe(2);
    });

    it('should handle missing prerequisite nodes gracefully', () => {
      const orphanNodes: MasteryNode[] = [
        {
          id: 'Orphan',
          label: 'Orphan',
          mastery: 90,
          status: 'mastered',
          prerequisites: ['NonExistent'],
          isChainComplete: false,
          depth: 0,
          data: { focus: 'F' },
        },
      ];
      const stats = processGraphForAtlas(orphanNodes);
      expect(stats.edges).toHaveLength(1);
      expect(stats.edges[0].isStrong).toBe(false);
    });
  });
});

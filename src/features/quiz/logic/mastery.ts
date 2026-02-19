import { ConceptMapItem } from '@/features/quiz/types';

export interface MasteryNode {
  id: string;
  label: string;
  mastery: number;
  status: 'mastered' | 'in-progress' | 'weak';
  prerequisites: string[];
  isChainComplete: boolean;
  depth: number;
  data: {
    focus: string;
    aiInsight?: string;
  };
}

/**
 * Calculate mastery chains from concept map items and their scores
 */
export function calculateMasteryChains(
  concepts: ConceptMapItem[],
  conceptScoreMap: Record<string, number>
): MasteryNode[] {
  const nodes: MasteryNode[] = concepts.map((concept, index) => {
    const score = conceptScoreMap[concept.baslik] || 0;
    let status: MasteryNode['status'] = 'weak';

    if (score >= 80) {
      status = 'mastered';
    } else if (score >= 50) {
      status = 'in-progress';
    }

    return {
      id: `node-${index}`,
      label: concept.baslik,
      mastery: score,
      status,
      prerequisites: concept.prerequisites || [],
      isChainComplete: score >= 80,
      depth: 0, // Will be calculated
      data: {
        focus: concept.odak,
        aiInsight: undefined,
      },
    };
  });

  // Calculate depth based on prerequisites
  const calculateDepth = (
    node: MasteryNode,
    visited: Set<string> = new Set()
  ): number => {
    if (visited.has(node.id)) return 0;
    visited.add(node.id);

    if (!node.prerequisites || node.prerequisites.length === 0) return 0;

    const prereqDepths = node.prerequisites.map((prereqLabel) => {
      const prereqNode = nodes.find((n) => n.label === prereqLabel);
      if (prereqNode) {
        return calculateDepth(prereqNode, new Set(visited)) + 1;
      }
      return 0;
    });

    return Math.max(...prereqDepths, 0);
  };

  // Update depths
  nodes.forEach((node) => {
    node.depth = calculateDepth(node);
  });

  return nodes;
}

/**
 * Process nodes for Atlas visualization
 */
export function processGraphForAtlas(nodes: MasteryNode[]): {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
} {
  const edges: { source: string; target: string; isStrong: boolean }[] = [];

  nodes.forEach((node) => {
    node.prerequisites.forEach((prereqLabel) => {
      const prereqNode = nodes.find((n) => n.label === prereqLabel);
      if (prereqNode) {
        edges.push({
          source: prereqNode.id,
          target: node.id,
          isStrong: prereqNode.mastery >= 80 && node.mastery >= 80,
        });
      }
    });
  });

  // Calculate chains (simple approach: connected components)
  const visited = new Set<string>();
  let totalChains = 0;

  const visitNode = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .forEach((e) => {
        visitNode(e.source === nodeId ? e.target : e.source);
      });
  };

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      totalChains++;
      visitNode(node.id);
    }
  });

  // Calculate resilience bonus (mastered chains)
  const masteredChains = edges.filter((e) => e.isStrong).length;
  const resilienceBonusDays = Math.floor(masteredChains * 0.5);

  return {
    totalChains,
    resilienceBonusDays,
    nodes,
    edges,
  };
}

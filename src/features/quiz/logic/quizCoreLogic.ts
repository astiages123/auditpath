import { QUIZ_CONFIG } from '../utils/constants';
import type { ConceptMapItem, MasteryNode } from '../types';

// Use standard SRP: delegate to sub-modules
export * from './quizCalculations';

// ============================================================================
// Mastery Nodes & Atlas Processing
// ============================================================================

export function calculateMasteryChains(
  concepts: ConceptMapItem[],
  conceptScoreMap: Record<string, number>
): MasteryNode[] {
  const nodes: MasteryNode[] = concepts.map((concept, index) => {
    const score = conceptScoreMap[concept.baslik] || 0;
    let status: MasteryNode['status'] = 'weak';
    if (score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT) status = 'mastered';
    else if (score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.GOOD) {
      status = 'in-progress';
    }

    return {
      id: `node-${index}`,
      label: concept.baslik,
      mastery: score,
      status,
      prerequisites: concept.prerequisites || [],
      isChainComplete: score >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT,
      depth: 0,
      data: { focus: concept.odak, aiInsight: undefined },
    };
  });

  // Optimize lookup: Map label to MasteryNode
  const nodeMap = new Map<string, MasteryNode>();
  nodes.forEach((n) => nodeMap.set(n.label, n));

  const calculateDepth = (
    node: MasteryNode,
    visited: Set<string> = new Set()
  ): number => {
    if (visited.has(node.id)) return 0;
    visited.add(node.id);
    if (!node.prerequisites || node.prerequisites.length === 0) return 0;

    const prereqDepths = node.prerequisites.map((prereqLabel) => {
      const prereqNode = nodeMap.get(prereqLabel);
      return prereqNode ? calculateDepth(prereqNode, new Set(visited)) + 1 : 0;
    });
    return Math.max(...prereqDepths, 0);
  };

  nodes.forEach((node) => {
    node.depth = calculateDepth(node);
  });
  return nodes;
}

export function processGraphForAtlas(nodes: MasteryNode[]): {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
} {
  const edges: { source: string; target: string; isStrong: boolean }[] = [];
  const nodeMap = new Map<string, MasteryNode>();
  nodes.forEach((n) => nodeMap.set(n.label, n));

  nodes.forEach((node) => {
    node.prerequisites.forEach((prereqLabel) => {
      const prereqNode = nodeMap.get(prereqLabel);
      if (prereqNode) {
        edges.push({
          source: prereqNode.id,
          target: node.id,
          isStrong:
            prereqNode.mastery >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT &&
            node.mastery >= QUIZ_CONFIG.MASTERY_THRESHOLDS.EXCELLENT,
        });
      }
    });
  });

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

  const masteredChains = edges.filter((e) => e.isStrong).length;
  const resilienceBonusDays = Math.floor(masteredChains * 0.5);

  return { totalChains, resilienceBonusDays, nodes, edges };
}

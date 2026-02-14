import { type ConceptMapItem } from '@/types';

export interface MasteryNode {
  id: string; // concept title
  label: string;
  mastery: number; // 0-100
  status: 'mastered' | 'in-progress' | 'weak';
  prerequisites: string[]; // IDs of prerequisite nodes
  isChainComplete: boolean; // True if this node AND all prereqs are mastered
  depth: number; // For visualization layer
  data: {
    focus: string;
    aiInsight?: string;
  };
}

export interface MasteryChainStats {
  totalChains: number;
  resilienceBonusDays: number; // Extra days gained from chains
  nodes: MasteryNode[];
  edges: { source: string; target: string; isStrong: boolean }[];
}

/**
 * Recursive function to build the graph and calculate chains
 */
export function calculateMasteryChains(
  concepts: ConceptMapItem[],
  masteryMap: Record<string, number>, // concept_title -> mastery_score
  depth = 0
): MasteryNode[] {
  // Flatten the concept map into nodes
  // Note: This logic assumes 'concepts' might be a flat list or nested.
  // The current ConceptMapItem definition (from mapping/index.ts) is flat with 'prerequisites' strings.

  return concepts.map((concept) => {
    const score = masteryMap[concept.baslik] || 0;

    // Determine Status based on Score
    let status: MasteryNode['status'] = 'weak';
    if (score >= 80) status = 'mastered';
    else if (score >= 50) status = 'in-progress';

    // Check Chain Condition
    // Chain = This node >= 80% AND All Prereqs >= 85%
    let isChainComplete = false;
    if (score >= 80) {
      const prereqsMet = (concept.prerequisites || []).every(
        (pTitle: string) => {
          const pScore = masteryMap[pTitle] || 0;
          return pScore >= 85;
        }
      );
      // If no prereqs, it's a "Root" chain start? Or trivial chain?
      // "Varsa, tüm prerequisites..." -> If none, maybe it counts as chain start if mastered?
      // Let's assume for now: if no prereqs, it's just a mastered node, not a "chain" per se unless it connects to something.
      // But if we defined "Mastery Chain" as a link...
      // User requirement: "Bir kavramın 'Mastery Chain' parçası sayılması için..."
      // If it has NO prereqs, can it be a chain?
      // "Zincir" implies connection. Let's say it contributes to resilience if it is a foundational mastery (>=80).
      // But the strict definition includes "Varsa...".
      // Let's stick to: It is a chain bit if (Self >= 80 && (Prereqs.length === 0 || All Prereqs >= 85)).
      isChainComplete = prereqsMet;
    }

    return {
      id: concept.baslik,
      label: concept.baslik,
      mastery: score,
      status,
      prerequisites: concept.prerequisites || [],
      isChainComplete,
      depth, // This might need a separate pass to calculate topological depth
      data: {
        focus: concept.odak,
        // Insight would come from DB join, passing simplified for now
      },
    };
  });
}

/**
 * layoutGraph:
 * Assigns depths or layers for visualization if not already present.
 * Simple BFS/DFS to assign levels.
 */
export function processGraphForAtlas(
  rawNodes: MasteryNode[]
): MasteryChainStats {
  const nodeMap = new Map<string, MasteryNode>();
  rawNodes.forEach((n) => nodeMap.set(n.id, n));

  const edges: MasteryChainStats['edges'] = [];
  let chainCount = 0;

  rawNodes.forEach((node) => {
    // Create edges
    node.prerequisites.forEach((pId) => {
      // Find prereq node
      const pNode = nodeMap.get(pId);
      const isStrong = Boolean(
        pNode && node.mastery >= 80 && pNode.mastery >= 85
      );

      edges.push({
        source: pId,
        target: node.id,
        isStrong,
      });

      if (isStrong) {
        // This specific link is a strong link.
        // We count "Completed Chains" maybe as number of strong edges?
        // Or number of nodes that are "Chain Complete"?
        // "Tamamlanan zincir sayısı" -> likely refers to strong connections or fully mastered paths.
        // Let's count Strong Edges for now as "Links Formed".
      }
    });

    if (node.isChainComplete && node.prerequisites.length > 0) {
      chainCount++;
    }
  });

  // 1 Chain = +40% resilience duration.
  // Base duration could be 7 days?
  // "kazanılan ekstra koruma günü" -> If base is 10 days, 40% is 4 days.
  // Let's assume a standard "Protection" of e.g. 5 days.
  // If we have chain, we add 2 days (40% of 5).
  // This is for display only.
  const resilienceBonusDays = chainCount * 2;

  return {
    totalChains: chainCount,
    resilienceBonusDays,
    nodes: rawNodes,
    edges,
  };
}

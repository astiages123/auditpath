export const FLOW_STATE_CONFIG = {
    optimal: { color: "text-emerald-400", label: "Optimal Akış / Denge" },
    deep: { color: "text-amber-400", label: "Yoğun ve Derin İnceleme" },
    speed: { color: "text-amber-400", label: "Seri Tarama / Hızlı İlerleme" },
    stuck: { color: "text-rose-500", label: "Yüksek Zaman Maliyeti / Takılma" },
    shallow: { color: "text-rose-500", label: "Çok Hızlı / Olası Yüzeysellik" },
} as const;

// Helper functions for flow state
export const getFlowColor = (flowState: string) =>
    FLOW_STATE_CONFIG[flowState as keyof typeof FLOW_STATE_CONFIG]?.color ||
    "text-rose-500";

export const getFlowStatusLabel = (flowState: string) =>
    FLOW_STATE_CONFIG[flowState as keyof typeof FLOW_STATE_CONFIG]?.label || "";

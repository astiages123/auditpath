import { FlowState } from '../types';

// ==========================================
// === TYPES ===
// ==========================================

/** Represents the ui configuration for a specific flow state */
export interface FlowStateConfiguration {
  color: string;
  label: string;
}

// ==========================================
// === CONFIGURATION ===
// ==========================================

/** The master configuration object mapping FlowState to UI rendering details */
export const FLOW_STATE_CONFIG: Record<FlowState, FlowStateConfiguration> = {
  optimal: { color: 'text-emerald-400', label: 'Optimal Akış ve Denge' },
  deep: { color: 'text-amber-400', label: 'Yoğun ve Derin İnceleme' },
  speed: { color: 'text-amber-400', label: 'Seri Tarama ve Hızlı İlerleme' },
  stuck: { color: 'text-rose-500', label: 'Zaman Kaybı ve Takılma' },
  shallow: { color: 'text-rose-500', label: 'Çok Hızlı ve Yüzeysellik' },
};

// ==========================================
// === HELPERS ===
// ==========================================

/**
 * Safely fetches the color string for a given flow state
 *
 * @param stateName - The flow state string
 * @returns Tailwind CSS color class
 */
export const getFlowColor = (stateName: string): string => {
  try {
    const configuration = FLOW_STATE_CONFIG[stateName as FlowState];
    return configuration ? configuration.color : 'text-rose-500';
  } catch (error) {
    console.error('[flowStateConfig][getFlowColor] Hata:', error);
    return 'text-rose-500';
  }
};

/**
 * Safely fetches the descriptive label for a given flow state
 *
 * @param stateName - The flow state string
 * @returns Readable label for the UI
 */
export const getFlowStatusLabel = (stateName: string): string => {
  try {
    const configuration = FLOW_STATE_CONFIG[stateName as FlowState];
    return configuration ? configuration.label : 'Bilinmeyen Durum';
  } catch (error) {
    console.error('[flowStateConfig][getFlowStatusLabel] Hata:', error);
    return 'Bilinmeyen Durum';
  }
};

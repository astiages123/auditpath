import { FlowState } from '../types';

/** Represents the ui configuration for a specific flow state */
export interface FlowStateConfiguration {
  color: string;
  label: string;
}

/** The master configuration object mapping FlowState to UI rendering details */
export const FLOW_STATE_CONFIG: Record<FlowState, FlowStateConfiguration> = {
  optimal: { color: 'text-emerald-400', label: 'Optimal Akış ve Denge' },
  deep: { color: 'text-amber-400', label: 'Yoğun ve Derin İnceleme' },
  speed: { color: 'text-amber-400', label: 'Seri Tarama ve Hızlı İlerleme' },
  stuck: { color: 'text-rose-500', label: 'Zaman Kaybı ve Takılma' },
  shallow: { color: 'text-rose-500', label: 'Çok Hızlı ve Yüzeysellik' },
};

/**
 * Safely fetches the color string for a given flow state
 *
 * @param stateName - The flow state string
 * @returns Tailwind CSS color class
 */
export const getFlowColor = (stateName: string): string => {
  const configuration = FLOW_STATE_CONFIG[stateName as FlowState];

  if (!configuration) {
    return 'text-rose-500';
  }

  return configuration.color;
};

/**
 * Safely fetches the descriptive label for a given flow state
 *
 * @param stateName - The flow state string
 * @returns Readable label for the UI
 */
export const getFlowStatusLabel = (stateName: string): string => {
  const configuration = FLOW_STATE_CONFIG[stateName as FlowState];

  if (!configuration) {
    return 'Bilinmeyen Durum';
  }

  return configuration.label;
};

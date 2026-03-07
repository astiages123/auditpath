/** Standart günlük çalışma hedefi (dakika) */
export const DAILY_GOAL_MINUTES: number = 200;

/** Eşik değerleri için arayüz tanımlaması */
export interface EfficiencyThresholds {
  readonly STUCK: number;
  readonly DEEP: number;
  readonly OPTIMAL_MAX: number;
  readonly SPEED: number;
  readonly ALARM_THRESHOLD: number;
}

/** Verimlilik ve akış durumlarını belirleyen eşik sınırları */
export const EFFICIENCY_THRESHOLDS: EfficiencyThresholds = {
  STUCK: 0.3,
  DEEP: 0.7,
  OPTIMAL_MAX: 1.3,
  SPEED: 1.7,
  ALARM_THRESHOLD: 2.5,
};

/** Genel verimlilik ayarları objesi için arayüz */
export interface EfficiencyConfiguration {
  readonly DAILY_GOAL_MINUTES: number;
  readonly THRESHOLDS: EfficiencyThresholds;
}

/** Özelliğin ihtiyacı olan ayarları barındıran obje */
export const EFFICIENCY_CONFIG: EfficiencyConfiguration = {
  DAILY_GOAL_MINUTES,
  THRESHOLDS: EFFICIENCY_THRESHOLDS,
};

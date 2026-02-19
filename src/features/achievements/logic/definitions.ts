import { type Achievement } from '../types/achievementsTypes';
import { LAW_ACHIEVEMENTS } from './law';
import { ECONOMY_ACHIEVEMENTS } from './economy';
import { ACCOUNTING_ACHIEVEMENTS } from './accounting';
import { GENERAL_ACHIEVEMENTS } from './general';
import { HYBRID_ACHIEVEMENTS } from './hybrid';
import { SPECIAL_ACHIEVEMENTS } from './special';
import { TITLE_ACHIEVEMENTS } from './titles';

export const ACHIEVEMENTS: Achievement[] = [
  ...LAW_ACHIEVEMENTS,
  ...ECONOMY_ACHIEVEMENTS,
  ...ACCOUNTING_ACHIEVEMENTS,
  ...GENERAL_ACHIEVEMENTS,
  ...HYBRID_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
  ...TITLE_ACHIEVEMENTS,
];

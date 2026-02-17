import { type Achievement } from "../types/achievementsTypes";
import { LAW_ACHIEVEMENTS } from "./data/law";
import { ECONOMY_ACHIEVEMENTS } from "./data/economy";
import { ACCOUNTING_ACHIEVEMENTS } from "./data/accounting";
import { GENERAL_ACHIEVEMENTS } from "./data/general";
import { HYBRID_ACHIEVEMENTS } from "./data/hybrid";
import { SPECIAL_ACHIEVEMENTS } from "./data/special";
import { TITLE_ACHIEVEMENTS } from "./data/titles";

export const ACHIEVEMENTS: Achievement[] = [
  ...LAW_ACHIEVEMENTS,
  ...ECONOMY_ACHIEVEMENTS,
  ...ACCOUNTING_ACHIEVEMENTS,
  ...GENERAL_ACHIEVEMENTS,
  ...HYBRID_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
  ...TITLE_ACHIEVEMENTS,
];

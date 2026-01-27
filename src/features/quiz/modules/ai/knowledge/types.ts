/**
 * Subject Knowledge Module Interface
 * Each KPSS subject exports a constant conforming to this interface.
 */
export interface SubjectKnowledge {
  /** Unique identifier in snake_case (e.g., "ceza_hukuku") */
  id: string;
  /** "Anayasa" - Core rules and constraints for question generation */
  constitution: string;
  /** "Altın Örnek" - Example question with full feedback architecture */
  fewShot: string;
}

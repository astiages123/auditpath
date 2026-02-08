/**
 * EvidenceCard Component
 * 
 * Displayed when user answers incorrectly.
 * Shows the source evidence quote and provides navigation to the note.
 */

import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EvidenceCardProps {
  /** Evidence quote from source text */
  evidence: string;
  /** Course ID for navigation */
  courseId: string;
  /** Optional section title for context */
  sectionTitle?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

export function EvidenceCard({ 
  evidence, 
  courseId, 
  sectionTitle,
  onDismiss 
}: EvidenceCardProps) {
  const navigate = useNavigate();

  const handleViewInNote = () => {
    // Navigate to note page with highlight query param
    const encodedEvidence = encodeURIComponent(evidence.slice(0, 100));
    navigate(`/notes/${courseId}?highlight=${encodedEvidence}`);
    onDismiss?.();
  };

  if (!evidence) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="w-full max-w-2xl mx-auto bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Quote className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-400">Kaynak Metinden Kanıt</h3>
          {sectionTitle && (
            <p className="text-xs text-muted-foreground">{sectionTitle}</p>
          )}
        </div>
      </div>

      {/* Evidence Quote */}
      <div className="relative bg-muted/30 rounded-lg p-4 border-l-4 border-amber-500">
        <Quote className="absolute top-2 left-2 w-4 h-4 text-amber-500/30" />
        <p className="text-sm text-foreground/90 pl-4 italic leading-relaxed">
          "{evidence}"
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleViewInNote}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg font-medium transition-colors border border-amber-500/20"
        >
          <BookOpen className="w-4 h-4" />
          <span>Metinde Gör</span>
          <ExternalLink className="w-3 h-3" />
        </button>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-4 py-3 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            Kapat
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default EvidenceCard;

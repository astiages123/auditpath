import { FC, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Brain,
  X,
  Search,
  Menu,
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface CurrentChunkMetadata {
  /** Bölüm Ana Başlığı */
  section_title: string;
  /** Bölüm Ham İçeriği (Kelime sayımı vs için) */
  content: string;
}

export interface NotesHeaderProps {
  /** Mobil panel (sol menü) açma fonksiyonu */
  onOpenMenu: () => void;
  /** Seçili olan yığın belirteci kimliği */
  activeChunkId: string;
  /** Mevcut seçili olan konu meta verileri */
  currentChunk?: CurrentChunkMetadata;
  /** Güncel ders adı */
  courseName: string;
  /** Güncel ders slug'ı */
  courseSlug: string;
  /** Kullanıcının scroll okuma ilerlemesinin anlık hesaplanması (%) */
  displayProgress: number;
  /** Arama modal paneli açık mı? */
  isSearchOpen: boolean;
  /** Mevcut değerlikli arama metni */
  searchQuery: string;
  /** Arama metnini set etme işlevi */
  setSearchQuery: (val: string) => void;
  /** Arama modunu Aç/Kapat */
  toggleSearch: () => void;
  isLeftPanelVisible?: boolean;
  setIsLeftPanelVisible?: (visible: boolean) => void;
  isRightPanelVisible?: boolean;
  setIsRightPanelVisible?: (visible: boolean) => void;
}

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

/**
 * Notlar sayfasının en üstünde yer alan durum başlığı, mobil hamburger menü
 * giriş kapısı ile ilerleme barını (progress bar) bünyesinde barındırır.
 *
 * @param {NotesHeaderProps} props
 * @returns {React.ReactElement}
 */
export const NotesHeader: FC<NotesHeaderProps> = ({
  onOpenMenu,
  activeChunkId,
  currentChunk,
  courseName,
  courseSlug,
  displayProgress,
  isSearchOpen,
  searchQuery,
  setSearchQuery,
  toggleSearch,
  isLeftPanelVisible,
  setIsLeftPanelVisible,
  isRightPanelVisible,
  setIsRightPanelVisible,
}: NotesHeaderProps): React.ReactElement => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // === EFEKTLER (EFFECTS) ===

  useEffect(() => {
    try {
      if (isSearchOpen) {
        searchInputRef.current?.focus();
      }
    } catch (error: unknown) {
      console.error('[NotesHeader][searchFocusEffect] Hata:', error);
    }
  }, [isSearchOpen]);

  // === UI RENDER ===

  return (
    <div
      id="notes-sticky-header"
      className="group flex flex-col border-b border-border/10 shrink-0 bg-card/80 backdrop-blur-md z-10 transition-all duration-300"
    >
      <div className="flex items-center gap-2 px-3 md:px-6 py-3 md:py-4">
        {/* Mobil Menü Butonu */}
        <button
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          onClick={onOpenMenu}
        >
          <Menu className="w-5 h-5" />
        </button>

        {!isLeftPanelVisible && setIsLeftPanelVisible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLeftPanelVisible(true)}
            className="hidden lg:flex h-9 w-9 p-0 bg-transparent hover:bg-transparent transition-all group/trigger shrink-0 shadow-none border-none"
            title="Konuları Aç"
          >
            <PanelLeftOpen className="w-5 h-5 text-muted-foreground group-hover/trigger:text-primary group-hover/trigger:scale-125 transition-all duration-300" />
          </Button>
        )}

        <div className="w-8 h-8 bg-primary/10 rounded-lg hidden lg:flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <BookOpen className="w-4 h-4" />
        </div>

        {/* Ana Başlık Kapsayıcısı */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">
            {activeChunkId === ''
              ? courseName || 'Ders Notları'
              : currentChunk?.section_title || 'Konu İçeriği'}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              Ders Notları
            </p>
            {currentChunk && (
              <>
                <span className="text-muted-foreground/30 text-[10px]">•</span>
                <div className="flex items-center gap-1 text-primary/80">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-bold">
                    {Math.max(
                      1,
                      Math.ceil(currentChunk.content.split(/\s+/).length / 200)
                    )}{' '}
                    dk
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sağ Düğme / Aksiyon Grubu */}
        <div className="flex items-center gap-3">
          {currentChunk && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-muted-foreground line-clamp-1">
                %{displayProgress}
              </span>
            </div>
          )}

          {activeChunkId !== '' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors font-black text-[11px] uppercase tracking-wider"
                onClick={() =>
                  navigate(`${ROUTES.QUIZ}/${courseSlug}/${activeChunkId}`)
                }
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sınava Gir</span>
              </Button>

              <div className="flex items-center">
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0, x: 20 }}
                      animate={{ width: 'auto', opacity: 1, x: 0 }}
                      exit={{ width: 0, opacity: 0, x: 20 }}
                      transition={{
                        type: 'spring',
                        damping: 20,
                        stiffness: 300,
                      }}
                      className="overflow-hidden mr-1"
                    >
                      <Input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSearchQuery(e.target.value)
                        }
                        placeholder="Ara..."
                        className="h-9 w-[120px] sm:w-[170px] bg-background border-border rounded-sm text-[13px] border focus:ring-0 focus-visible:ring-0 focus:border-primary/50 transition-colors shadow-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'shrink-0 transition-colors',
                    isSearchOpen
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-primary'
                  )}
                  onClick={toggleSearch}
                  title="Arama Aç/Kapat"
                >
                  {isSearchOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {!isRightPanelVisible && setIsRightPanelVisible && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRightPanelVisible(true)}
                  className="hidden lg:flex h-9 w-9 p-0 bg-transparent hover:bg-transparent transition-all group/trigger shrink-0 shadow-none border-none"
                  title="Bu Sayfada Aç"
                >
                  <PanelRightOpen className="w-5 h-5 text-muted-foreground group-hover/trigger:text-primary group-hover/trigger:scale-125 transition-all duration-300" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress Bar Alt Çizgisi */}
      {currentChunk && (
        <div className="h-0.5 w-full bg-primary/5">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: `${displayProgress}%`,
            }}
            transition={{
              type: 'spring',
              bounce: 0,
              duration: 0.5,
            }}
          />
        </div>
      )}
    </div>
  );
};

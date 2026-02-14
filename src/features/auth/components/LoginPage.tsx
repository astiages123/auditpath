import { motion } from 'framer-motion';
import { AuthForms } from './AuthForms';

export function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-60 z-0" />
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--tw-gradient-stops))] from-accent/20 via-background to-background opacity-60 z-0" />

      {/* Floating Shapes for extra depth (optional, keeping it minimal for performance) */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10 animate-pulse"
        style={{ animationDuration: '6s' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="backdrop-blur-xl bg-card/40 border border-white/10 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
          {/* Glassmorphism shine effect */}
          <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner ring-1 ring-white/10">
              <img
                src="/logo.svg"
                alt="AuditPath Logo"
                className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl font-heading font-bold tracking-tight bg-linear-to-br from-white to-white/70 bg-clip-text text-transparent">
                Tekrar Hoşgeldiniz
              </h1>
              <p className="text-muted-foreground text-sm">
                Devam etmek için hesabınıza giriş yapın.
              </p>
            </div>

            <div className="w-full pt-4">
              <AuthForms />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
          &copy; {new Date().getFullYear()} AuditPath. Tüm hakları saklıdır.
        </p>
      </motion.div>
    </div>
  );
}

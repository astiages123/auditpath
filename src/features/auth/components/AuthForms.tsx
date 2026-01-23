"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/shared/lib/core/supabase";
import { toast } from "sonner";
import { env } from "@/config/env";

interface AuthFormProps {
  onSuccess?: () => void;
  view: "signin" | "signup";
  onToggleView: () => void;
}

export function AuthForms({ onSuccess, view, onToggleView }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const supabase = getSupabase();

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Giriş başarılı!");
        onSuccess?.();
      } else {
        const siteUrl = env.app.siteUrl;
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/`,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Hesap oluşturuldu ve giriş yapıldı!");
          onSuccess?.();
        } else {
          toast.success(
            "Doğrulama maili gönderildi. Lütfen e-postanızı kontrol edin."
          );
        }
      }
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bir hata oluştu.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="E-Mail Adresiniz"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              placeholder="******"
              type="password"
              autoComplete={
                view === "signin" ? "current-password" : "new-password"
              }
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {view === "signin" ? "Giriş Yap" : "Kayıt Ol"}
          </Button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        disabled={loading}
        onClick={handleGoogleLogin}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            ></path>
          </svg>
        )}
        Google ile devam et
      </Button>

      <div className="text-center text-sm text-muted-foreground mt-2">
        {view === "signin" ? (
          <>
            Hesabınız yok mu?{" "}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
              onClick={onToggleView}
            >
              Kayıt Ol
            </button>
          </>
        ) : (
          <>
            Zaten hesabınız var mı?{" "}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-primary transition-colors font-medium"
              onClick={onToggleView}
            >
              Giriş Yap
            </button>
          </>
        )}
      </div>
    </div>
  );
}

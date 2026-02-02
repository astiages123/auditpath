"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/shared/lib/core/supabase";
import { toast } from "sonner";
import { env } from "@/config/env";



export function AuthForms({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabase();

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = email;

      // Basit email regex kontrolü
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isEmail) {
        // Kullanıcı adı ile email bulmaya çalış
        const { data: emailData, error: emailError } = await (supabase as any)
          .rpc('get_email_by_username', { username_input: email });

        if (emailError || !emailData) {
          throw new Error("Kullanıcı bulunamadı.");
        }
        loginEmail = emailData as string;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;
      toast.success("Giriş başarılı!");
      onSuccess?.();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bir hata oluştu.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Kullanıcı Adı veya Email</Label>
            <Input
              id="email"
              placeholder="Kullanıcı Adı veya Email"
              type="text"
              autoCapitalize="none"
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
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Giriş Yap
          </Button>
        </div>
      </form>
    </div>
  );
}

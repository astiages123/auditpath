"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/shared/lib/core/supabase";
import { toast } from "sonner";

// Zod şeması tanımı
const authSchema = z.object({
  identifier: z.string().min(1, "Bu alan zorunludur.").refine((val) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (isEmail) return true;
    return val.length >= 3;
  }, {
    message: "Geçerli bir e-posta girin veya kullanıcı adınız en az 3 karakter olmalıdır."
  }),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForms({ onSuccess }: { onSuccess?: () => void }) {
  const supabase = getSupabase();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      let loginEmail = data.identifier;

      // Basit email regex kontrolü (zod içindekine benzer)
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.identifier);

      if (!isEmail) {
        // Kullanıcı adı ile email bulmaya çalış
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_email_by_username', { username_input: data.identifier });

        if (emailError || !emailData) {
          throw new Error("Kullanıcı bulunamadı.");
        }
        loginEmail = emailData as string;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password,
      });

      if (error) throw error;
      toast.success("Giriş başarılı!");
      onSuccess?.();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Bir hata oluştu.";
      toast.error(message);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="identifier">Kullanıcı Adı veya Email</Label>
            <Input
              id="identifier"
              placeholder="Kullanıcı Adı veya Email"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isSubmitting}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive">{errors.identifier.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              placeholder="******"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Giriş Yap
          </Button>
        </div>
      </form>
    </div>
  );
}


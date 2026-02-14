import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Zod şeması tanımı
const authSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Bu alan zorunludur.')
    .refine(
      (val) => {
        const isEmail = EMAIL_REGEX.test(val);
        if (isEmail) return true;
        return val.length >= 3;
      },
      {
        message:
          'Geçerli bir e-posta girin veya kullanıcı adınız en az 3 karakter olmalıdır.',
      }
    ),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
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
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    try {
      let loginEmail = data.identifier;

      // Basit email regex kontrolü (zod içindekine benzer)
      const isEmail = EMAIL_REGEX.test(data.identifier);

      if (!isEmail) {
        const rpcResult = await supabase.rpc('get_email_by_username', {
          username_input: data.identifier,
        });
        const { data: emailData, error: emailError } = rpcResult || {};

        if (emailError || !emailData) {
          throw new Error('Kullanıcı bulunamadı.');
        }
        loginEmail = emailData as string;
      }

      const signInResult = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password,
      });
      const { error } = signInResult || {};

      if (error) throw error;
      toast.success('Giriş başarılı!');
      onSuccess?.();
    } catch (error: unknown) {
      logger.error('Auth form submission error', error as Error);
      const message =
        (error as { message?: string }).message || 'Bir hata oluştu.';
      toast.error(message);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="identifier" className="text-foreground/90">
              Kullanıcı Adı veya Email
            </Label>
            <Input
              id="identifier"
              placeholder="Kullanıcı Adı veya Email"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              disabled={isSubmitting}
              className="input-white-autofill bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 text-white caret-white placeholder:text-white/70"
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="text-sm text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-md">
                {errors.identifier.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-foreground/90">
              Şifre
            </Label>
            <Input
              id="password"
              placeholder="******"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              className="input-white-autofill bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 text-white caret-white placeholder:text-white/70"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive font-medium bg-destructive/10 px-2 py-1 rounded-md">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button
            disabled={isSubmitting}
            type="submit"
            size="lg"
            className="w-full font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Giriş Yap
          </Button>
        </div>
      </form>
    </div>
  );
}

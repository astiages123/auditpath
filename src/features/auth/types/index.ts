import { AuthError, Session, User } from '@supabase/supabase-js';

/**
 * Authentication context state and methods.
 */
export interface AuthContextType {
  /** The current user object, if logged in. */
  user: User | null;
  /** The current session object, if active. */
  session: Session | null;
  /** Loading state of the authentication process. */
  loading: boolean;
  /** Any authentication error that occurred. */
  error: AuthError | null;
  /** Signs out the current user. */
  signOut: () => Promise<void>;
  /** Clears the current authentication error. */
  clearError: () => void;
}

/**
 * Properties for the AuthModal component.
 */
export interface AuthModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Callback fired when the modal open state changes. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Authentication form field errors.
 */
export interface AuthFormErrors {
  /** Error message for the email or username field. */
  identifier?: string;
  /** Error message for the password field. */
  password?: string;
}

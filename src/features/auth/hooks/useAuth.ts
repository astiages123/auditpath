import { createContext, useContext } from 'react';

import { type AuthContextType } from '../types';

/**
 * Context for authentication state.
 */
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/**
 * Custom hook to access authentication context.
 * @throws {Error} If used outside of an AuthProvider.
 * @returns {AuthContextType} The authentication context.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

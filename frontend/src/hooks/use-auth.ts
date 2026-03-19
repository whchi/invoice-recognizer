import { AuthContext } from '@frontend/contexts/auth-context';
import { useContext } from 'react';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

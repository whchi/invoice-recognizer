import type { SessionUser } from '@frontend/lib/api';
import { signIn as apiSignIn, signOut as apiSignOut, getSession } from '@frontend/lib/api';
import { createContext, useEffect, useState } from 'react';

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(session => {
        setUser(session.user ?? null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    await apiSignIn(email, password);
    const session = await getSession();
    setUser(session.user ?? null);
  };

  const signOut = async (): Promise<void> => {
    await apiSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        isLoading,
        signIn,
        signOut,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

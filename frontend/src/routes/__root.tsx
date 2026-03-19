import { AppLayout } from '@frontend/components/layout/app-layout';
import { AuthProvider } from '@frontend/contexts/auth-context';
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthProvider>
  ),
});

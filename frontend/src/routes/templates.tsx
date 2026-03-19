import { getSession } from '@frontend/lib/api';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/templates')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: TemplatesPage,
});

function TemplatesPage() {
  return <Outlet />;
}

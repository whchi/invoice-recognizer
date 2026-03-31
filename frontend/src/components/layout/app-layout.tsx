import { Header } from '@frontend/components/layout/header';
import { Sidebar } from '@frontend/components/layout/sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background antialiased">
      <Sidebar />
      <div className="flex flex-1 flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

import { Link } from '@tanstack/react-router';
import { Code2, LayoutTemplate, Upload } from 'lucide-react';

const navItems = [
  {
    href: '/',
    icon: Upload,
    title: 'Upload',
    description: 'Extract invoice data',
  },
  {
    href: '/templates',
    icon: LayoutTemplate,
    title: 'Templates',
    description: 'Manage extraction rules',
  },
  {
    href: '/dev-center',
    icon: Code2,
    title: 'Developer Center',
    description: 'API keys & docs',
  },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-border/50 bg-sidebar-background/50 md:flex">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="InvoiceAI logo">
            <title>InvoiceAI Logo</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-foreground">InvoiceAI</span>
          <span className="text-xs text-muted-foreground">Intelligent extraction</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-6 px-3">
        <nav className="space-y-1">
          {navItems.map((item, index) => (
            <Link
              activeOptions={{ exact: item.href === '/' }}
              activeProps={{
                className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
              }}
              className="group flex items-start gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground spring-transition"
              key={item.href}
              to={item.href}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50 transition-all duration-300 group-hover:shadow-md group-hover:ring-primary/20 group-hover:scale-105">
                <item.icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="flex flex-col pt-0.5">
                <span className="text-sm font-medium leading-tight">{item.title}</span>
                <span className="text-xs text-muted-foreground/80 mt-0.5">{item.description}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border/50 p-4">
        <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground/80">All services operational. API response time: 47ms</p>
        </div>
      </div>
    </aside>
  );
}

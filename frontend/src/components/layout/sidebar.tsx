import { Link } from '@tanstack/react-router';
import { Code2, LayoutTemplate, Upload } from 'lucide-react';

const navItems = [
  {
    href: '/',
    icon: Upload,
    title: 'Upload',
  },
  {
    href: '/templates',
    icon: LayoutTemplate,
    title: 'Templates',
  },
  {
    href: '/dev-center',
    icon: Code2,
    title: 'Developer Center',
  },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
      <div className="flex-1 overflow-auto py-6">
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
          {navItems.map(item => (
            <Link
              activeOptions={{ exact: item.href === '/' }}
              activeProps={{
                className: 'bg-muted text-primary',
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              key={item.href}
              to={item.href}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

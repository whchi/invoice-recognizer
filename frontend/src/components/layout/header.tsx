import { CreditWallet } from '@frontend/components/layout/credit-wallet';
import { Avatar, AvatarFallback } from '@frontend/components/ui/avatar';
import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import { useAuth } from '@frontend/hooks/use-auth';
import { Link } from '@tanstack/react-router';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { isAuthenticated, signOut, user } = useAuth();

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 sticky top-0 z-30">
      <div className="flex flex-1 items-center gap-4 md:hidden">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="text-lg font-bold tracking-tight">InvoiceAI</span>
        </Link>
      </div>
      <div className="hidden md:flex md:flex-1 items-center gap-2">
        <span className="text-sm text-muted-foreground">Welcome back</span>
        <span className="text-sm font-medium">{user?.name || 'Guest'}</span>
      </div>
      <div className="flex items-center gap-3">
        <CreditWallet />
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-full h-10 w-10 p-0 ring-2 ring-border/50 hover:ring-primary/30 transition-all duration-300"
                size="icon"
                variant="ghost"
                data-testid="user-avatar"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                  {user?.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void signOut()}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default" className="gap-2">
            <Link to="/login">
              <User className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

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
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
      <div className="flex flex-1 items-center gap-4 md:hidden">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="text-lg font-bold tracking-tight">InvoiceAI</span>
        </Link>
      </div>
      <div className="hidden md:flex md:flex-1">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <span className="text-lg font-bold tracking-tight">InvoiceAI</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <CreditWallet />
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-full" size="icon" variant="ghost" data-testid="user-avatar">
                <Avatar className="size-8">
                  <AvatarFallback>
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              {user?.email && (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOut className="mr-2 size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default">
            <Link to="/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

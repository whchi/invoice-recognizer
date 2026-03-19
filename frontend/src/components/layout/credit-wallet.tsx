import { Badge } from '@frontend/components/ui/badge';
import { getWallet, type WalletResponse } from '@frontend/lib/api';
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';

// Simple cache to avoid refetching on every mount if we already have data
let cachedWallet: WalletResponse | null = null;

export function CreditWallet() {
  const [wallet, setWallet] = useState<WalletResponse | null>(cachedWallet);
  const [isLoading, setIsLoading] = useState(!cachedWallet);

  useEffect(() => {
    const mounted = true;

    async function fetchWallet() {
      try {
        const data = await getWallet();
        if (mounted) {
          cachedWallet = data;
          setWallet(data);
        }
      } catch (error) {
        console.error('Failed to fetch wallet:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    if (!cachedWallet) {
      fetchWallet();
    }
  }, []);

  if (isLoading) {
    return (
      <Badge className="h-9 animate-pulse px-4 py-2" variant="secondary">
        <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
      </Badge>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <Badge className="h-9 px-4 py-2 text-sm font-medium gap-2" variant="secondary">
      <CreditCard className="size-4 text-muted-foreground" />
      <span>
        {wallet.dailyRemaining} free today / {wallet.balance} credits
      </span>
    </Badge>
  );
}

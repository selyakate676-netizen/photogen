'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

type CrystalWalletState = {
  user: User | null;
  balance: number | null;
  isLoading: boolean;
};

export function useCrystalWallet(): CrystalWalletState {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<CrystalWalletState>({
    user: null,
    balance: null,
    isLoading: true,
  });

  const loadWallet = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ user: null, balance: null, isLoading: false });
      return;
    }

    const { data } = await supabase
      .from('wallets')
      .select('balance_crystals')
      .eq('user_id', user.id)
      .maybeSingle();

    setState({ user, balance: data?.balance_crystals ?? 0, isLoading: false });
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (isMounted) void loadWallet(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) void loadWallet(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadWallet, supabase]);

  return state;
}

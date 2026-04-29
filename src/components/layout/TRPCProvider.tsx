'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc, makeQueryClient } from '@/lib/trpc/client';

/**
 * Mounts the tRPC + React Query providers for Client Components.
 * Place this as close to the root as possible.
 *
 * @kind client
 * @feature layout
 */
export function TRPCProvider({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  const [queryClient] = useState(() => makeQueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

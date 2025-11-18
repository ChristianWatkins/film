'use client';

import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, useMemo } from 'react';

export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl || convexUrl.includes('placeholder')) {
      // Create a dummy client that won't cause errors but won't work
      // This allows hooks to be called without errors, but they'll be skipped
      // Use a valid-looking URL format to avoid parsing errors
      return new ConvexReactClient('https://disabled.convex.cloud');
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>;
}


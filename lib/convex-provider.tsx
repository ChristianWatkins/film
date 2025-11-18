'use client';

import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, useMemo } from 'react';

export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn('NEXT_PUBLIC_CONVEX_URL not set. Convex sync will not work.');
      // Return a dummy client that won't work but won't crash
      return new ConvexReactClient('https://placeholder.convex.cloud');
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>;
}


'use client';

import { ConvexReactClient } from "convex/react";

let convexClient: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (typeof window === 'undefined') {
    throw new Error('Convex client can only be used on the client side');
  }

  if (!convexClient) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set');
    }
    convexClient = new ConvexReactClient(convexUrl);
  }

  return convexClient;
}


import { useEffect, useState } from 'react';
import { ConvexClient } from 'convex/browser';

export function useConvexSubscription<T>(
  convexClient: ConvexClient,
  query: any,
  args: any,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = convexClient.onUpdate(
      query,
      args,
      (result) => {
        setData(result);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [convexClient, query, args, enabled]);

  return { data, loading, error };
}
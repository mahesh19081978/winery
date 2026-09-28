import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has mounted on the client.
 * Server snapshot is false, client snapshot is true.
 * This is the React 18/19 recommended pattern that avoids cascading renders and hydration mismatches.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

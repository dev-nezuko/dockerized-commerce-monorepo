import useSWR from 'swr';

import { apiFetch } from '../lib/api';

/** SWR keyed by the API path, so a server-rendered fallback under the same key is reused. */
export function useApiSWR<T>(path: string | null) {
  return useSWR<T>(path, (key: string) => apiFetch<T>(key), { revalidateOnFocus: false });
}

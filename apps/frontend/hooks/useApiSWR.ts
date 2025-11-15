import useSWR from 'swr';
import { apiFetch } from '../lib/api';

export function useApiSWR<T>(key: string | null, url: string | null) {
  return useSWR<T>(key, () => {
    if (!url) throw new Error('No URL');
    return apiFetch<T>(url);
  }, {
    revalidateOnFocus: false,
  });
}

import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

interface LegacyCatalogSearch {
  tab?: string;
  id?: string;
  status?: string;
  q?: string;
}

/**
 * Back-compat shim for older `/catalog?...` links. Artifact surfaces now live
 * at `/issues` and `/formulas`, but existing deep links should keep working.
 */
export function CatalogRedirect() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as LegacyCatalogSearch;

  useEffect(() => {
    if (search.tab === 'formulas') {
      void navigate({
        to: '/formulas',
        replace: true,
        search: { q: typeof search.q === 'string' ? search.q : undefined },
      });
      return;
    }

    void navigate({
      to: '/issues',
      replace: true,
      search: {
        id: typeof search.id === 'string' ? search.id : undefined,
        status: typeof search.status === 'string' ? search.status : undefined,
        q: typeof search.q === 'string' ? search.q : undefined,
      },
    });
  }, [navigate, search.id, search.q, search.status, search.tab]);

  return null;
}

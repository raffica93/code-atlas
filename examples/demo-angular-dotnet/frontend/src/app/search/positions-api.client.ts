// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: application
// @atlas summary: Traduce il caso d'uso frontend nella chiamata HTTP al backend.

import type { SearchCriteria } from './search-page.component';

export interface HttpClient {
  post<T>(url: string, body: unknown): Promise<T>;
}

export class PositionsApiClient {
  constructor(private readonly http: HttpClient) {}

  search(criteria: SearchCriteria): Promise<unknown> {
    return this.http.post('/api/positions/search', criteria);
  }
}

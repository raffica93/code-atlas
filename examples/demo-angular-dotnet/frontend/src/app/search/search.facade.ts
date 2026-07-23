// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: application
// @atlas summary: Coordina stato UI, caricamento e accesso al client API.

import { PositionsApiClient } from './positions-api.client';
import type { SearchCriteria } from './search-page.component';

export class SearchFacade {
  loading = false;

  constructor(private readonly api: PositionsApiClient) {}

  search(criteria: SearchCriteria): void {
    this.loading = true;
    this.api.search(criteria);
  }
}

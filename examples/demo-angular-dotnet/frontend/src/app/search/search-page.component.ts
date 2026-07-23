// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: presentation
// @atlas summary: Pagina Angular che raccoglie i criteri e avvia la ricerca.

import { SearchFacade } from './search.facade';

export interface SearchCriteria {
  matricola?: string;
  codiceFiscale?: string;
}

export class SearchPageComponent {
  constructor(private readonly facade: SearchFacade) {}

  // @atlas summary: Normalizza i filtri inseriti dall'utente e avvia il caso d'uso.
  onSearch(criteria: SearchCriteria): void {
    this.facade.search(criteria);
  }
}

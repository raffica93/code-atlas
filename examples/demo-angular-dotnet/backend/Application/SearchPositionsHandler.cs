// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: application
// @atlas summary: Applica il caso d'uso, valida la richiesta e orchestra il repository.

public class SearchPositionsHandler
{
    private readonly PositionsRepository _repository;

    public SearchPositionsHandler(PositionsRepository repository)
    {
        _repository = repository;
    }

    public async Task<PagedResult<PositionDto>> HandleAsync(SearchPositionsQuery query)
    {
        SearchSpecification specification = SearchSpecification.From(query);
        return await _repository.SearchAsync(specification);
    }
}

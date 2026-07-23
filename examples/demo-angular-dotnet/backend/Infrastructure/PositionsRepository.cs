// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: infrastructure
// @atlas summary: Accede al database e materializza i risultati paginati.

public class PositionsRepository
{
    private readonly PositionsDbContext _db;

    public PositionsRepository(PositionsDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<PositionDto>> SearchAsync(SearchSpecification specification)
    {
        return await _db.Positions.SearchAsync(specification);
    }
}

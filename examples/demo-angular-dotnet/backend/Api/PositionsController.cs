// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: application
// @atlas summary: Endpoint ASP.NET che riceve i criteri e delega l'esecuzione all'handler.

using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/positions")]
public class PositionsController : ControllerBase
{
    private readonly SearchPositionsHandler _handler;

    public PositionsController(SearchPositionsHandler handler)
    {
        _handler = handler;
    }

    [HttpPost("search")]
    public async Task<PagedResult<PositionDto>> Search(SearchPositionsQuery query)
    {
        return await _handler.HandleAsync(query);
    }
}

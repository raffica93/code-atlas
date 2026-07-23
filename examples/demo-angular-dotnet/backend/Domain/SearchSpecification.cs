// @atlas capability: Ricerca posizioni
// @atlas use-case: Eseguire ricerca posizioni
// @atlas layer: domain
// @atlas summary: Incapsula le regole di dominio usate per filtrare le posizioni.

public class SearchSpecification
{
    public string? Matricola { get; init; }
    public string? CodiceFiscale { get; init; }

    public static SearchSpecification From(SearchPositionsQuery query)
    {
        return new SearchSpecification
        {
            Matricola = query.Matricola?.Trim(),
            CodiceFiscale = query.CodiceFiscale?.Trim()
        };
    }
}

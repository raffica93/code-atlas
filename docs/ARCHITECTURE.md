# Architettura dell'MVP

```text
Repository sorgente
      │
      ├── TypeScript AST analyzer
      ├── C# structural analyzer
      ├── @atlas semantic annotations
      └── HTTP/ASP.NET route bridge
                    │
                    ▼
             Unified AtlasGraph
       nodes + edges + flows + evidence
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       JSON API        HTML interactive report
```

## Modello

Nodi principali:

- `Capability`
- `UseCase`
- `Layer`
- `File`
- `Class`
- `Method`
- `Endpoint`
- `ExternalSystem`

Relazioni principali:

- `IMPLEMENTS`
- `REALIZED_BY`
- `CONTAINS`
- `BELONGS_TO`
- `CALLS`
- `EXPOSES`
- `DISPATCHES_TO`
- `READS`
- `WRITES`

Ogni relazione contiene `confidence` ed `evidence`, così il viewer può distinguere dati dichiarati, inferenze affidabili ed euristiche.

## Decisione progettuale

Il viewer non renderizza l'intero grafo in una volta. Seleziona una vista coerente con la domanda corrente e mantiene una breadcrumb semantica:

```text
Capability → Use case → Execution flow → Layer → Symbol → Source
```

Questo evita il classico problema dei dependency graph con migliaia di nodi privi di significato operativo.

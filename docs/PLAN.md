# Piano di sviluppo

## Obiettivo prodotto

Consentire a uno sviluppatore di partire da una capability di business e scendere progressivamente fino al file, alla classe e al metodo che la implementano, senza perdere il contesto funzionale e architetturale.

## Vertical slice MVP — completata

1. **Semantic annotations**: `@atlas capability`, `use-case`, `layer`, `summary`.
2. **TypeScript analyzer**: classi, metodi, constructor injection e chiamate HTTP.
3. **C# analyzer iniziale**: classi, metodi, field injection, route ASP.NET e accesso `DbContext`.
4. **Unified graph schema**: nodi, relazioni, confidence ed evidence.
5. **Cross-stack execution flow**: Angular → HTTP → ASP.NET → handler → repository → database.
6. **Viewer HTML self-contained**: capability, use case, flow, architettura e inspector.
7. **CLI e public library API**.
8. **Fixture end-to-end e test automatici**.

## Fase 2 — accuratezza industriale

- Sostituire il parser C# euristico con un **Roslyn sidecar**.
- Risolvere simboli TypeScript tramite `Program` e `TypeChecker`, non soltanto AST locale.
- Interpretare dependency injection Angular e ASP.NET tramite provider/service collection.
- Importare contratti OpenAPI e correlare DTO frontend/backend.
- Esporre unresolved references e ambiguity score nel viewer.

## Fase 3 — change impact

- Analizzare `git diff` e calcolare blast radius.
- Collegare metodi a test, endpoint, DTO, tabelle e consumer.
- Evidenziare breaking change e architectural violations.
- Aggiungere ownership e churn ricavati dalla Git history.

## Fase 4 — runtime overlay

- Importare trace OpenTelemetry.
- Distinguere relazioni `STATICALLY_INFERRED` da `OBSERVED_AT_RUNTIME`.
- Mostrare latenza, error rate e frequenza sui flow.

## Fase 5 — semantic query

- Query in linguaggio naturale sopra il grafo.
- Risposte con explanation, percorso visuale, source references e confidence.
- Plugin IDE per VS Code e Visual Studio.

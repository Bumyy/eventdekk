# EventDekk Frontend

## Run the app

Start these services in separate terminals:

```bash
frontend: npm run dev
api: npm run dev
spacetime: spacetime start
```

## SpacetimeDB commands

Generate SDK bindings:

```bash
spacetime generate --lang typescript --out-dir frontend/src/module_bindings --module-path eventdekk
```

Publish the server module:

```bash
spacetime publish eventdekk
```

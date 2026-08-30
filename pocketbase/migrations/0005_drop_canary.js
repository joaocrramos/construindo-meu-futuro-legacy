migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('_canary_check')
      app.delete(col)
    } catch (_) {}
  },
  (app) => {},
)

migrate(
  (app) => {
    // 1. Adicionar due_date e indexer_rate em assets
    const assetsCol = app.findCollectionByNameOrId('assets')
    if (!assetsCol.fields.getByName('due_date')) {
      assetsCol.fields.add(
        new DateField({
          name: 'due_date',
          required: false,
        }),
      )
    }
    if (!assetsCol.fields.getByName('indexer_rate')) {
      assetsCol.fields.add(
        new TextField({
          name: 'indexer_rate',
          required: false,
        }),
      )
    }
    app.save(assetsCol)

    // 2. Adicionar due_date e indexer_rate em movements
    const movementsCol = app.findCollectionByNameOrId('movements')
    if (!movementsCol.fields.getByName('due_date')) {
      movementsCol.fields.add(
        new DateField({
          name: 'due_date',
          required: false,
        }),
      )
    }
    if (!movementsCol.fields.getByName('indexer_rate')) {
      movementsCol.fields.add(
        new TextField({
          name: 'indexer_rate',
          required: false,
        }),
      )
    }
    app.save(movementsCol)
  },
  (app) => {
    // Reverter campos de movements
    try {
      const movementsCol = app.findCollectionByNameOrId('movements')
      if (movementsCol.fields.getByName('due_date')) {
        movementsCol.fields.removeByName('due_date')
      }
      if (movementsCol.fields.getByName('indexer_rate')) {
        movementsCol.fields.removeByName('indexer_rate')
      }
      app.save(movementsCol)
    } catch (_) {}

    // Reverter campos de assets
    try {
      const assetsCol = app.findCollectionByNameOrId('assets')
      if (assetsCol.fields.getByName('due_date')) {
        assetsCol.fields.removeByName('due_date')
      }
      if (assetsCol.fields.getByName('indexer_rate')) {
        assetsCol.fields.removeByName('indexer_rate')
      }
      app.save(assetsCol)
    } catch (_) {}
  },
)

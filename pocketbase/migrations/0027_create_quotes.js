// Migration 0027: Criação da collection quotes para integração com brapi.dev
// Armazena cotações de ativos e pares cambiais (USD/BRL, EUR/BRL)
migrate(
  (app) => {
    if (app.hasTable('quotes')) {
      return
    }

    const collection = new Collection({
      name: 'quotes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'ticker', type: 'text', required: true, min: 1, max: 30 },
        { name: 'price_cents', type: 'number', required: true, onlyInt: true },
        { name: 'currency', type: 'text', required: true, min: 3, max: 10 },
        { name: 'quoted_at', type: 'date', required: false },
        { name: 'change_percent', type: 'number', required: false },
        { name: 'source', type: 'text', required: false },
        { name: 'raw_data', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_quotes_ticker ON quotes (ticker)'],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('quotes')
      app.delete(collection)
    } catch (_) {}
  },
)

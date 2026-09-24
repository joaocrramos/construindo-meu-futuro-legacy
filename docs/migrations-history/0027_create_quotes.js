migrate(
  (app) => {
    // Idempotência: não recriar se a collection quotes já existir
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
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'ticker',
          type: 'text',
          required: true,
        },
        {
          name: 'price_cents',
          type: 'number',
          required: true,
        },
        {
          name: 'currency',
          type: 'text',
          required: true,
        },
        {
          name: 'quoted_at',
          type: 'date',
          required: false,
        },
        {
          name: 'change_percent',
          type: 'number',
          required: false,
        },
        {
          name: 'source',
          type: 'text',
          required: false,
        },
        {
          name: 'raw_data',
          type: 'json',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
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

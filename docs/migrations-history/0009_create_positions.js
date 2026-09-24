migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('positions')) {
      return
    }

    const accountsCollection = app.findCollectionByNameOrId('accounts')
    const assetsCollection = app.findCollectionByNameOrId('assets')

    const collection = new Collection({
      name: 'positions',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: accountsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'asset_id',
          type: 'relation',
          required: true,
          collectionId: assetsCollection.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'quantity_e8',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'average_price_cents',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'total_cost_cents',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'current_price_cents',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'total_market_value_cents',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'maturity_date',
          type: 'date',
          required: false,
        },
        {
          name: 'indexer',
          type: 'text',
          required: false,
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
        },
        {
          name: 'last_recalculated_at',
          type: 'date',
          required: true,
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
      indexes: [
        'CREATE UNIQUE INDEX idx_positions_user_acc_asset ON positions (user_id, account_id, asset_id)',
        'CREATE INDEX idx_positions_user_maturity ON positions (user_id, maturity_date)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('positions')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

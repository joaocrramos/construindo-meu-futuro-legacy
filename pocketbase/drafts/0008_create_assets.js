migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('assets')) {
      return
    }

    const collection = new Collection({
      name: 'assets',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
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
          name: 'ticker',
          type: 'text',
          required: true,
          min: 1,
          max: 30,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          min: 1,
          max: 150,
        },
        {
          name: 'asset_class',
          type: 'select',
          required: true,
          values: [
            'fixed_income',
            'equities',
            'real_estate_funds',
            'mutual_funds',
            'crypto',
            'cash_equivalent',
            'other',
          ],
          maxSelect: 1,
        },
        {
          name: 'sub_type',
          type: 'text',
          required: false,
        },
        {
          name: 'currency',
          type: 'text',
          required: true,
          min: 3,
          max: 3,
        },
        {
          name: 'cnpj_issuer',
          type: 'text',
          required: false,
          max: 18,
        },
        {
          name: 'is_active',
          type: 'bool',
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
      indexes: [
        'CREATE UNIQUE INDEX idx_assets_user_ticker ON assets (user_id, ticker)',
        'CREATE INDEX idx_assets_user_class ON assets (user_id, asset_class)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('assets')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

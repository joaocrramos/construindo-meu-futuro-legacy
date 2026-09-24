migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('portfolios')) {
      return
    }

    const collection = new Collection({
      name: 'portfolios',
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
          name: 'name',
          type: 'text',
          required: true,
          min: 1,
          max: 100,
        },
        {
          name: 'description',
          type: 'text',
          required: false,
          max: 500,
        },
        {
          name: 'color',
          type: 'text',
          required: false,
        },
        {
          name: 'is_archived',
          type: 'bool',
          required: false,
        },
        {
          name: 'target_amount_cents',
          type: 'number',
          required: false,
          onlyInt: true,
          min: 0,
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
        'CREATE INDEX idx_portfolios_user_archived ON portfolios (user_id, is_archived)',
        'CREATE UNIQUE INDEX idx_portfolios_user_name ON portfolios (user_id, name)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('portfolios')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

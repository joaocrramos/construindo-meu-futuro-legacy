migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('institutions')) {
      return
    }

    const collection = new Collection({
      name: 'institutions',
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
          name: 'code',
          type: 'text',
          required: false,
        },
        {
          name: 'institution_type',
          type: 'select',
          required: true,
          values: ['bank', 'broker', 'crypto_exchange', 'international', 'other'],
          maxSelect: 1,
        },
        {
          name: 'website',
          type: 'url',
          required: false,
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
        'CREATE INDEX idx_institutions_user_active ON institutions (user_id, is_active)',
        'CREATE UNIQUE INDEX idx_institutions_user_name ON institutions (user_id, name)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('institutions')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('accounts')) {
      return
    }

    const institutionsCollection = app.findCollectionByNameOrId('institutions')

    const collection = new Collection({
      name: 'accounts',
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
          name: 'institution_id',
          type: 'relation',
          required: true,
          collectionId: institutionsCollection.id,
          cascadeDelete: false,
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
          name: 'account_type',
          type: 'select',
          required: true,
          values: ['checking', 'investment', 'savings', 'international_checking', 'cash', 'other'],
          maxSelect: 1,
        },
        {
          name: 'currency',
          type: 'text',
          required: true,
          min: 3,
          max: 3,
        },
        {
          name: 'account_number',
          type: 'text',
          required: false,
        },
        {
          name: 'agency',
          type: 'text',
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
        'CREATE INDEX idx_accounts_user_institution ON accounts (user_id, institution_id)',
        'CREATE INDEX idx_accounts_user_active ON accounts (user_id, is_active)',
        'CREATE UNIQUE INDEX idx_accounts_user_name ON accounts (user_id, name)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('accounts')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

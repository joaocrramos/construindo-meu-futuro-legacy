migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('account_balances')) {
      return
    }

    const accountsCollection = app.findCollectionByNameOrId('accounts')

    // Nota: last_movement_id apontará para 'movements' quando esta for criada (0010_create_movements.js)
    // Inicialmente a collection é criada com os campos essenciais sem a FK cruzada para collection posterior.
    const collection = new Collection({
      name: 'account_balances',
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
          name: 'currency',
          type: 'text',
          required: true,
          min: 3,
          max: 3,
        },
        {
          name: 'balance_cents',
          type: 'number',
          required: true,
          onlyInt: true,
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
        'CREATE UNIQUE INDEX idx_account_balances_user_acc_curr ON account_balances (user_id, account_id, currency)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('account_balances')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

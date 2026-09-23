migrate(
  (app) => {
    // Idempotência: não recriar se a collection alerts já existir
    if (app.hasTable('alerts')) {
      return
    }

    const collection = new Collection({
      name: 'alerts',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: null,
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
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
          name: 'type',
          type: 'select',
          required: true,
          values: ['maturity_upcoming', 'maturity_today', 'balance_negative', 'system'],
          maxSelect: 1,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'message',
          type: 'text',
          required: true,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['info', 'warn', 'critical'],
          maxSelect: 1,
        },
        {
          name: 'reference_id',
          type: 'text',
          required: false,
        },
        {
          name: 'due_date',
          type: 'date',
          required: false,
        },
        {
          name: 'is_read',
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
        'CREATE INDEX idx_alerts_user_read_created ON alerts (user_id, is_read, created DESC)',
        'CREATE INDEX idx_alerts_user_type ON alerts (user_id, type)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('alerts')
      app.delete(collection)
    } catch (_) {}
  },
)

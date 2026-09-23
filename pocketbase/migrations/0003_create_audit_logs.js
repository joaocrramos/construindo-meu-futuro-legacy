migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('audit_logs')) {
      return
    }

    const collection = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
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
          name: 'event_type',
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
          name: 'ip_address',
          type: 'text',
          required: false,
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
          max: 255,
        },
        {
          name: 'entity',
          type: 'text',
          required: false,
        },
        {
          name: 'entity_id',
          type: 'text',
          required: false,
        },
        {
          name: 'summary',
          type: 'text',
          required: true,
          max: 500,
        },
        {
          name: 'details',
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
      indexes: [
        'CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created DESC)',
        'CREATE INDEX idx_audit_logs_type_created ON audit_logs (event_type, created DESC)',
        'CREATE INDEX idx_audit_logs_retention ON audit_logs (created)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('audit_logs')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

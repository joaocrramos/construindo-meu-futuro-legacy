migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('invitations')) {
      return
    }

    const collection = new Collection({
      name: 'invitations',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
        {
          name: 'token_hash',
          type: 'text',
          required: true,
        },
        {
          name: 'token_public_id',
          type: 'text',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['admin', 'user'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'accepted', 'expired', 'revoked'],
          maxSelect: 1,
        },
        {
          name: 'invited_by',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'expires_at',
          type: 'date',
          required: true,
        },
        {
          name: 'accepted_at',
          type: 'date',
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
        'CREATE UNIQUE INDEX idx_invitations_token_hash ON invitations (token_hash)',
        'CREATE UNIQUE INDEX idx_invitations_public_id ON invitations (token_public_id)',
        'CREATE INDEX idx_invitations_email_status ON invitations (email, status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('invitations')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

// Migration 0001: baseline do schema do Construindo Meu Futuro (v0.0.126).
//
// Consolida em uma única migration o estado final das antigas migrations 0001–0010, 0020, 0022 e
// 0025 (arquivadas em docs/migrations-history/). Cada collection é criada já na forma final, na
// ordem de dependência. O schema foi conferido campo a campo contra o espelho do banco vivo
// (src/lib/pocketbase/schema.json, gerado em 2026-09-24T13:40:12Z), com uma única diferença
// intencional: 'international' em assets.asset_class, valor que o frontend oferece e o banco
// antigo não aceitava.
//
// Fora da baseline, de propósito:
//   - quotes (antiga 0027): a integração brapi.dev será retomada com uma migration própria.
//   - reparo de posição (antiga 0023) e limpeza total (antiga 0024): operam sobre dados, não
//     sobre schema. A limpeza passa a ser a rota POST /backend/v1/admin/reset-data
//     (pocketbase/hooks/admin_reset.js), executável quantas vezes for necessário.
migrate(
  (app) => {
    const USERS = '_pb_users_auth_'
    const autodates = [
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]
    const ownerRule = "@request.auth.id != '' && user_id = @request.auth.id"
    const ownerCreateRule = "@request.auth.id != '' && @request.body.user_id = @request.auth.id"
    const userRelation = (cascadeDelete) => ({
      name: 'user_id',
      type: 'relation',
      required: true,
      collectionId: USERS,
      cascadeDelete,
      maxSelect: 1,
    })
    const createIfMissing = (definition) => {
      if (!app.hasTable(definition.name)) {
        app.save(new Collection(definition))
      }
      return app.findCollectionByNameOrId(definition.name)
    }

    // 1. users (auth nativa): campos de papel, status e perfil e regras de acesso
    const users = app.findCollectionByNameOrId(USERS)
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({ name: 'role', required: true, values: ['admin', 'user'], maxSelect: 1 }),
      )
    }
    if (!users.fields.getByName('status')) {
      users.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          values: ['active', 'suspended', 'pending'],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('must_change_password')) {
      users.fields.add(new BoolField({ name: 'must_change_password', required: false }))
    }
    if (!users.fields.getByName('phone')) {
      users.fields.add(new TextField({ name: 'phone', required: false, max: 30 }))
    }
    if (!users.fields.getByName('last_login')) {
      users.fields.add(new DateField({ name: 'last_login', required: false }))
    }
    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.createRule = "@request.auth.role = 'admin'"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.deleteRule = "@request.auth.role = 'admin'"
    app.save(users)

    // 2. invitations
    createIfMissing({
      name: 'invitations',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'token_hash', type: 'text', required: true },
        { name: 'token_public_id', type: 'text', required: true },
        { name: 'role', type: 'select', required: true, values: ['admin', 'user'], maxSelect: 1 },
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
          collectionId: USERS,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'accepted_at', type: 'date', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE UNIQUE INDEX idx_invitations_token_hash ON invitations (token_hash)',
        'CREATE UNIQUE INDEX idx_invitations_public_id ON invitations (token_public_id)',
        'CREATE INDEX idx_invitations_email_status ON invitations (email, status)',
      ],
    })

    // 3. audit_logs
    createIfMissing({
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
          collectionId: USERS,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'event_type', type: 'text', required: true },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['info', 'warn', 'critical'],
          maxSelect: 1,
        },
        { name: 'ip_address', type: 'text', required: false },
        { name: 'user_agent', type: 'text', required: false, max: 255 },
        { name: 'entity', type: 'text', required: false },
        { name: 'entity_id', type: 'text', required: false },
        { name: 'summary', type: 'text', required: true, max: 500 },
        { name: 'details', type: 'json', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created DESC)',
        'CREATE INDEX idx_audit_logs_type_created ON audit_logs (event_type, created DESC)',
        'CREATE INDEX idx_audit_logs_retention ON audit_logs (created)',
      ],
    })

    // 4. portfolios
    createIfMissing({
      name: 'portfolios',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerCreateRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      fields: [
        userRelation(true),
        { name: 'name', type: 'text', required: true, min: 1, max: 100 },
        { name: 'description', type: 'text', required: false, max: 500 },
        { name: 'color', type: 'text', required: false },
        { name: 'is_archived', type: 'bool', required: false },
        { name: 'target_amount_cents', type: 'number', required: false, onlyInt: true, min: 0 },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_portfolios_user_archived ON portfolios (user_id, is_archived)',
        'CREATE UNIQUE INDEX idx_portfolios_user_name ON portfolios (user_id, name)',
      ],
    })

    // 5. institutions
    const institutions = createIfMissing({
      name: 'institutions',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerCreateRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      fields: [
        userRelation(true),
        { name: 'name', type: 'text', required: true, min: 1, max: 100 },
        { name: 'code', type: 'text', required: false },
        {
          name: 'institution_type',
          type: 'select',
          required: true,
          values: ['bank', 'broker', 'crypto_exchange', 'international', 'other'],
          maxSelect: 1,
        },
        { name: 'website', type: 'url', required: false },
        { name: 'is_active', type: 'bool', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_institutions_user_active ON institutions (user_id, is_active)',
        'CREATE UNIQUE INDEX idx_institutions_user_name ON institutions (user_id, name)',
      ],
    })

    // 6. accounts (currency como select BRL/USD/EUR, estado final da antiga 0025)
    const accounts = createIfMissing({
      name: 'accounts',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerCreateRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      fields: [
        userRelation(true),
        {
          name: 'institution_id',
          type: 'relation',
          required: true,
          collectionId: institutions.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, min: 1, max: 100 },
        {
          name: 'account_type',
          type: 'select',
          required: true,
          values: ['checking', 'investment', 'savings', 'international_checking', 'cash', 'other'],
          maxSelect: 1,
        },
        {
          name: 'currency',
          type: 'select',
          required: true,
          values: ['BRL', 'USD', 'EUR'],
          maxSelect: 1,
        },
        { name: 'account_number', type: 'text', required: false },
        { name: 'agency', type: 'text', required: false },
        { name: 'is_active', type: 'bool', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_accounts_user_institution ON accounts (user_id, institution_id)',
        'CREATE INDEX idx_accounts_user_active ON accounts (user_id, is_active)',
        'CREATE UNIQUE INDEX idx_accounts_user_name ON accounts (user_id, name)',
      ],
    })

    // 7. account_balances (last_movement_id é adicionado após movements, no passo 10)
    const accountBalances = createIfMissing({
      name: 'account_balances',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        userRelation(true),
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: accounts.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'currency', type: 'text', required: true, min: 3, max: 3 },
        { name: 'balance_cents', type: 'number', required: true, onlyInt: true },
        { name: 'last_recalculated_at', type: 'date', required: true },
      ].concat(autodates),
      indexes: [
        'CREATE UNIQUE INDEX idx_account_balances_user_acc_curr ON account_balances (user_id, account_id, currency)',
      ],
    })

    // 8. assets (due_date e indexer_rate da antiga 0020; 'international' alinhado ao frontend)
    const assets = createIfMissing({
      name: 'assets',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerCreateRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      fields: [
        userRelation(true),
        { name: 'ticker', type: 'text', required: true, min: 1, max: 30 },
        { name: 'name', type: 'text', required: true, min: 1, max: 150 },
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
            'international',
            'other',
          ],
          maxSelect: 1,
        },
        { name: 'sub_type', type: 'text', required: false },
        { name: 'currency', type: 'text', required: true, min: 3, max: 3 },
        { name: 'cnpj_issuer', type: 'text', required: false, max: 18 },
        { name: 'is_active', type: 'bool', required: false },
        { name: 'due_date', type: 'date', required: false },
        { name: 'indexer_rate', type: 'text', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE UNIQUE INDEX idx_assets_user_ticker ON assets (user_id, ticker)',
        'CREATE INDEX idx_assets_user_class ON assets (user_id, asset_class)',
      ],
    })

    // 9. positions
    createIfMissing({
      name: 'positions',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        userRelation(true),
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: accounts.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'asset_id',
          type: 'relation',
          required: true,
          collectionId: assets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'quantity_e8', type: 'number', required: true, onlyInt: true },
        { name: 'average_price_cents', type: 'number', required: true, onlyInt: true },
        { name: 'total_cost_cents', type: 'number', required: true, onlyInt: true },
        { name: 'current_price_cents', type: 'number', required: false, onlyInt: true },
        { name: 'total_market_value_cents', type: 'number', required: false, onlyInt: true },
        { name: 'maturity_date', type: 'date', required: false },
        { name: 'indexer', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'last_recalculated_at', type: 'date', required: true },
      ].concat(autodates),
      indexes: [
        'CREATE UNIQUE INDEX idx_positions_user_acc_asset ON positions (user_id, account_id, asset_id)',
        'CREATE INDEX idx_positions_user_maturity ON positions (user_id, maturity_date)',
      ],
    })

    // 10. movements (due_date e indexer_rate da antiga 0020)
    const movements = createIfMissing({
      name: 'movements',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        userRelation(true),
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: accounts.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'asset_id',
          type: 'relation',
          required: false,
          collectionId: assets.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'movement_type',
          type: 'select',
          required: true,
          values: [
            'deposit',
            'withdrawal',
            'buy',
            'sell',
            'dividend',
            'interest_on_capital',
            'amortization',
            'fee',
            'tax',
            'reversal',
          ],
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'quantity_e8', type: 'number', required: false, onlyInt: true },
        { name: 'unit_price_cents', type: 'number', required: false, onlyInt: true },
        { name: 'gross_amount_cents', type: 'number', required: true, onlyInt: true },
        { name: 'fees_cents', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'taxes_cents', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'net_amount_cents', type: 'number', required: true, onlyInt: true },
        { name: 'idempotency_key', type: 'text', required: false },
        { name: 'is_reversed', type: 'bool', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'due_date', type: 'date', required: false },
        { name: 'indexer_rate', type: 'text', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_movements_user_acc_date ON movements (user_id, account_id, date DESC)',
        'CREATE INDEX idx_movements_user_asset_date ON movements (user_id, asset_id, date DESC)',
        "CREATE UNIQUE INDEX idx_movements_user_idempotency ON movements (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''",
      ],
    })

    // Relações que dependem de movements já existir: estorno auto-referencial e último lançamento
    if (!movements.fields.getByName('reversal_of_id')) {
      movements.fields.add(
        new RelationField({
          name: 'reversal_of_id',
          required: false,
          collectionId: movements.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      movements.indexes.push(
        "CREATE UNIQUE INDEX idx_movements_reversal_unique ON movements (reversal_of_id) WHERE movement_type = 'reversal' AND reversal_of_id IS NOT NULL",
      )
      app.save(movements)
    }
    if (!accountBalances.fields.getByName('last_movement_id')) {
      accountBalances.fields.add(
        new RelationField({
          name: 'last_movement_id',
          required: false,
          collectionId: movements.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(accountBalances)
    }

    // 11. alerts
    createIfMissing({
      name: 'alerts',
      type: 'base',
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: null,
      updateRule: ownerRule,
      deleteRule: null,
      fields: [
        userRelation(true),
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['maturity_upcoming', 'maturity_today', 'balance_negative', 'system'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['info', 'warn', 'critical'],
          maxSelect: 1,
        },
        { name: 'reference_id', type: 'text', required: false },
        { name: 'due_date', type: 'date', required: false },
        { name: 'is_read', type: 'bool', required: false },
      ].concat(autodates),
      indexes: [
        'CREATE INDEX idx_alerts_user_read_created ON alerts (user_id, is_read, created DESC)',
        'CREATE INDEX idx_alerts_user_type ON alerts (user_id, type)',
      ],
    })
  },
  (app) => {
    // Ordem inversa de dependência: quem referencia é removido antes de quem é referenciado
    const collections = [
      'alerts',
      'account_balances',
      'movements',
      'positions',
      'assets',
      'accounts',
      'institutions',
      'portfolios',
      'audit_logs',
      'invitations',
    ]
    for (const name of collections) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    for (const fieldName of ['role', 'status', 'must_change_password', 'phone', 'last_login']) {
      if (users.fields.getByName(fieldName)) {
        users.fields.removeByName(fieldName)
      }
    }
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)

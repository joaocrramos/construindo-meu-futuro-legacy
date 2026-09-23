migrate(
  (app) => {
    // Idempotência: não recriar se a collection já existir
    if (app.hasTable('movements')) {
      return
    }

    const accountsCollection = app.findCollectionByNameOrId('accounts')
    const assetsCollection = app.findCollectionByNameOrId('assets')

    // 1. Criar a collection movements
    const collection = new Collection({
      name: 'movements',
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
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'asset_id',
          type: 'relation',
          required: false,
          collectionId: assetsCollection.id,
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
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'quantity_e8',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'unit_price_cents',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'gross_amount_cents',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'fees_cents',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 0,
        },
        {
          name: 'taxes_cents',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 0,
        },
        {
          name: 'net_amount_cents',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'idempotency_key',
          type: 'text',
          required: false,
        },
        {
          name: 'is_reversed',
          type: 'bool',
          required: false,
        },
        {
          name: 'notes',
          type: 'text',
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
        'CREATE INDEX idx_movements_user_acc_date ON movements (user_id, account_id, date DESC)',
        'CREATE INDEX idx_movements_user_asset_date ON movements (user_id, asset_id, date DESC)',
        "CREATE UNIQUE INDEX idx_movements_user_idempotency ON movements (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''",
      ],
    })

    app.save(collection)

    // 2. Adicionar campo auto-referencial reversal_of_id e seu índice condicional de não-duplicação
    const savedMovements = app.findCollectionByNameOrId('movements')
    if (!savedMovements.fields.getByName('reversal_of_id')) {
      savedMovements.fields.add(
        new RelationField({
          name: 'reversal_of_id',
          required: false,
          collectionId: savedMovements.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      savedMovements.indexes.push(
        "CREATE UNIQUE INDEX idx_movements_reversal_unique ON movements (reversal_of_id) WHERE movement_type = 'reversal' AND reversal_of_id IS NOT NULL",
      )
      app.save(savedMovements)
    }

    // 3. Adicionar cross-reference last_movement_id em account_balances (se account_balances existir)
    try {
      const balancesCol = app.findCollectionByNameOrId('account_balances')
      if (!balancesCol.fields.getByName('last_movement_id')) {
        balancesCol.fields.add(
          new RelationField({
            name: 'last_movement_id',
            required: false,
            collectionId: savedMovements.id,
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
        app.save(balancesCol)
      }
    } catch (_) {
      // Ignora se account_balances não existir no contexto
    }
  },
  (app) => {
    // 1. Remover campo last_movement_id de account_balances se existir
    try {
      const balancesCol = app.findCollectionByNameOrId('account_balances')
      if (balancesCol.fields.getByName('last_movement_id')) {
        balancesCol.fields.removeByName('last_movement_id')
        app.save(balancesCol)
      }
    } catch (_) {}

    // 2. Remover a collection movements
    try {
      const collection = app.findCollectionByNameOrId('movements')
      app.delete(collection)
    } catch (_) {
      // Já não existe ou já removida
    }
  },
)

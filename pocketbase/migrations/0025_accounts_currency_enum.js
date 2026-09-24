migrate(
  (app) => {
    // 1. Modificar o campo currency da collection accounts para SelectField com valores ['BRL', 'USD', 'EUR']
    const accountsCol = app.findCollectionByNameOrId('accounts')
    if (accountsCol.fields.getByName('currency')) {
      accountsCol.fields.removeByName('currency')
    }

    accountsCol.fields.add(
      new SelectField({
        name: 'currency',
        required: true,
        values: ['BRL', 'USD', 'EUR'],
        maxSelect: 1,
      }),
    )

    app.save(accountsCol)

    // 2. Normalizar e restaurar os dados existentes em accounts.currency para 'BRL', 'USD' ou 'EUR'
    app
      .db()
      .newQuery(`
      UPDATE accounts
      SET currency = CASE
        WHEN UPPER(TRIM(COALESCE(currency, ''))) = 'USD' THEN 'USD'
        WHEN UPPER(TRIM(COALESCE(currency, ''))) = 'EUR' THEN 'EUR'
        ELSE 'BRL'
      END
    `)
      .execute()
  },
  (app) => {
    // Reverter campo currency para TextField
    try {
      const accountsCol = app.findCollectionByNameOrId('accounts')
      if (accountsCol.fields.getByName('currency')) {
        accountsCol.fields.removeByName('currency')
      }

      accountsCol.fields.add(
        new TextField({
          name: 'currency',
          required: true,
          min: 3,
          max: 3,
        }),
      )

      app.save(accountsCol)
    } catch (_) {}
  },
)

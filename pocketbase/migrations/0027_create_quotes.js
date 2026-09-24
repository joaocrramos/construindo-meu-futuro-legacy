// Migration 0027: collection quotes (cache global de cotações brapi.dev e câmbio USDBRL/EURBRL).
// Cotação é dado de mercado compartilhado por ticker, sem vínculo com usuário: o hook
// pocketbase/hooks/quotes.js grava e busca registros apenas por ticker.
//
// Convergente: cria a collection se não existir; se já existir (criada por uma versão anterior
// desta migration ou pela antiga 0028_create_quotes.js, removida), garante o índice único em
// ticker sem apagar dados.
migrate(
  (app) => {
    const fields = [
      { name: 'ticker', type: 'text', required: true, min: 1, max: 30 },
      { name: 'price_cents', type: 'number', required: true, onlyInt: true },
      { name: 'currency', type: 'text', required: true, min: 3, max: 10 },
      { name: 'quoted_at', type: 'date', required: false },
      { name: 'change_percent', type: 'number', required: false },
      { name: 'source', type: 'text', required: false },
      { name: 'raw_data', type: 'json', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (!app.hasTable('quotes')) {
      const collection = new Collection({
        name: 'quotes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields,
        indexes: ['CREATE UNIQUE INDEX idx_quotes_ticker ON quotes (ticker)'],
      })
      app.save(collection)
      return
    }

    // Todas as versões anteriores (0027 original e a 0028 removida) criaram os mesmos campos;
    // a única divergência possível é a ausência do índice único em ticker.
    const collection = app.findCollectionByNameOrId('quotes')
    const hasTickerIndex = (collection.indexes || []).some((idx) => /idx_quotes_ticker/i.test(idx))
    if (!hasTickerIndex) {
      collection.addIndex('idx_quotes_ticker', true, 'ticker', '')
      app.save(collection)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('quotes')
      app.delete(collection)
    } catch (_) {}
  },
)

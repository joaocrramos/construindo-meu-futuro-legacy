# Especificação e Catálogo de Tipos de Ativos

Este documento detalha todos os tipos e subtipos de ativos e instrumentos financeiros suportados pelo sistema **Construindo Meu Futuro**, os campos associados a cada classe, as regras contábeis de movimentação e o respectivo impacto no livro-razão contábil e no saldo de caixa das contas de custódia.

---

## 1. Classes de Ativos Suportadas

O sistema categoriza os investimentos sob a enumeração `AssetClass`, alinhada aos padrões de mercado financeiro brasileiro (B3, Anbima e plataformas como Investidor10):

| Chave (`asset_class`) | Nome de Exibição          | Descrição                                                                                   |
| :-------------------- | :------------------------ | :------------------------------------------------------------------------------------------ |
| `equities`            | Ações / Ações Globais     | Ações ordinárias (ON), preferenciais (PN), Units e BDRs listados em bolsa de valores.       |
| `real_estate_funds`   | Fundos Imobiliários (FII) | Fundos de investimento imobiliário (tijolo, papel, Fiagro, FoF) listados na B3.             |
| `fixed_income`        | Renda Fixa                | Títulos públicos (Tesouro Direto) e privados (bancários, securitários e corporativos).      |
| `mutual_funds`        | Fundos de Investimento    | Fundos multimercado, fundos de ações abertos, fundos cambiais e de renda fixa não listados. |
| `crypto`              | Criptoativos              | Criptomoedas (BTC, ETH) e tokens negociados em exchanges ou custódia própria.               |
| `cash_equivalent`     | Equivalente de Caixa      | Reservas de emergência e fundos DI com liquidez diária imediata.                            |
| `other`               | Outro                     | Bens tangíveis, ativos alternativos ou investimentos internacionais não classificados.      |

---

## 2. Renda Fixa: Subtipos, Campos e Comportamento Contábil

Os títulos de Renda Fixa contam com modelagem dedicada para refletir com precisão contratos privados, indexadores bancários e títulos do Tesouro Nacional.

### 2.1 Subtipos Padronizados de Renda Fixa

- **CDB**: Certificado de Depósito Bancário
- **LCI**: Letra de Crédito Imobiliário (isenta de IR para pessoa física)
- **LCA**: Letra de Crédito do Agronegócio (isenta de IR para pessoa física)
- **CRI**: Certificado de Recebíveis Imobiliários (isento de IR para PF)
- **CRA**: Certificado de Recebíveis do Agronegócio (isento de IR para PF)
- **Tesouro Selic**: Título público federal pós-fixado indexado à taxa básica Selic
- **Tesouro IPCA+**: Título público federal híbrido (inflação + juros reais)
- **Tesouro Prefixado**: Título público federal com taxa prefixada garantida no vencimento
- **Tesouro RendA+ / Educa+**: Títulos para aposentadoria e renda educacional
- **Debênture / Debênture Incentivada**: Título de dívida corporativa privada (incentivadas possuem isenção de IR)
- **LC / RDB / Outros**: Letras de Câmbio, Recibos de Depósito Bancário e outros instrumentos

### 2.2 Aplicação por VALOR (não quantidade de cotas)

Diferente de ações e FIIs negociados em lotes e quantidades inteiras de cotas, títulos bancários de balcão (como CDB, LCI, LCA) são aplicados por **valor financeiro (R$)**:

- O usuário informa diretamente o montante em dinheiro aplicado (ex.: R$ 5.000,00).
- No modelo contábil do sistema, a quantidade pode ser mantida como 1 fração inteira representativa da aplicação (escala e8 = 100.000.000).
- O preço unitário contábil equivale ao próprio valor financeiro alocado na emissão/aplicação.

### 2.3 Campos de Vencimento e Indexador/Taxa

Para os ativos de renda fixa, estão disponíveis campos dedicados no catálogo de ativos (`assets`) e no registro das operações (`movements`):

- `due_date`: Data de vencimento e liquidação programada do título (formato ISO `YYYY-MM-DD`). Alimenta automaticamente o cronograma de **Próximos Vencimentos** (`/overview/due-dates`).
- `indexer_rate`: Descrição do indexador e remuneração contratada (ex.: `"120% do CDI"`, `"IPCA + 6,5% a.a."`, `"Prefixado 11,8% a.a."`, `"CDI + 1,2%"`).

### 2.4 Comportamento na Compra / Aplicação

- **Custos adicionais**: Taxas de custódia, emolumentos ou taxas de liquidação são **somadas** ao valor bruto para compor o custo total contábil de aquisição:
  $$\text{Valor Líquido} = \text{Valor Bruto} + \text{Taxas/Emolumentos}$$
- **Tratamento no Dinheiro em Caixa**: O valor líquido total gasto na aquisição é **debitado** imediatamente do saldo em caixa (`account_balances`) da conta de custódia selecionada.

### 2.5 Comportamento no Resgate / Venda

- **Descontos na liquidação**: Em resgates, as taxas de corretagem/emolumentos e o Imposto de Renda (IR retido na fonte) são **subtraídos** do valor bruto da operação:
  $$\text{Valor Líquido} = \text{Valor Bruto} - \text{Taxas/Emolumentos} - \text{IR/Impostos}$$
- **Tratamento no Dinheiro em Caixa**: O valor líquido resultante do resgate é **creditado** no saldo em caixa da respectiva conta.

---

## 3. Ações (Equities), FIIs e Criptoativos

### 3.1 Ações (`equities`)

- **Ticker / Código**: Código de negociação oficial na B3 (ex.: `PETR4`, `VALE3`, `ITUB4`) ou bolsa estrangeira (ex.: `AAPL`, `NVDA`).
- **Classe / Moeda**: Normalmente `BRL` na B3 ou `USD` para ativos no exterior.
- **Negociação**: Por quantidade de ações (lote padrão ou fracionário) e preço unitário por ação.
- **Compra**: Valor Líquido = $(\text{Quantidade} \times \text{Preço Unitário}) + \text{Emolumentos} + \text{Liquidação}$.
- **Venda**: Valor Líquido = $(\text{Quantidade} \times \text{Preço Unitário}) - \text{Emolumentos} - \text{Liquidação} - \text{IR}$.

### 3.2 Fundos Imobiliários (`real_estate_funds`)

- **Ticker / Código**: Geralmente composto por 4 letras seguidas de `11` (ex.: `HGLG11`, `KNIP11`, `MXRF11`).
- **Subtipo / Segmento**: Tijolo (Logística, Shoppings, Lajes Corporativas), Papel (CRIs), Fiagro, Fundos de Fundos (FoF).
- **Rendimentos**: Proventos mensais isentos de IR para pessoa física (tipo de movimentação: `dividend`).

### 3.3 Criptoativos (`crypto`)

- **Ticker / Código**: Sigla da criptomoeda ou token (ex.: `BTC`, `ETH`, `SOL`).
- **Precisão Decimal**: Suporte a até 8 casas decimais (escala e8 interna, permitindo quantias fracionadas como `0,00452300 BTC`).

---

## 4. Tipos de Movimentação Financeira (`MovementType`)

O livro-razão registra cada evento patrimonial em conformidade contábil. A tabela abaixo especifica os tipos de operação suportados e os campos utilizados por cada um:

| Tipo (`movement_type`) | Rótulo em Português               | Ativo Obrigatório? | Campos Relevantes                                                                                                                                                                            | Impacto no Saldo em Caixa                                    |
| :--------------------- | :-------------------------------- | :----------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `deposit`              | Aporte / Depósito                 |        Não         | `account_id`, `date`, `gross_amount_cents`, `notes`                                                                                                                                          | **Crédito (+)** no caixa da conta                            |
| `withdrawal`           | Resgate / Saque                   |        Não         | `account_id`, `date`, `gross_amount_cents`, `notes`                                                                                                                                          | **Débito (-)** no caixa (valida saldo)                       |
| `buy`                  | Compra de Ativo                   |      **Sim**       | `account_id`, `asset_id`, `date`, `quantity_e8`, `unit_price_cents`, `gross_amount_cents`, `fees_cents` (emolumentos+liquidação), `due_date` (se renda fixa), `indexer_rate` (se renda fixa) | **Débito (-)** do valor líquido no caixa                     |
| `sell`                 | Venda / Resgate de Ativo          |      **Sim**       | `account_id`, `asset_id`, `date`, `quantity_e8`, `unit_price_cents`, `gross_amount_cents`, `fees_cents`, `taxes_cents` (IR), `net_amount_cents`                                              | **Crédito (+)** do valor líquido no caixa                    |
| `dividend`             | Dividendo                         |      **Sim**       | `account_id`, `asset_id`, `date`, `gross_amount_cents`, `taxes_cents`, `net_amount_cents`                                                                                                    | **Crédito (+)** no caixa da conta                            |
| `interest_on_capital`  | JCP (Juros sobre Capital Próprio) |      **Sim**       | `account_id`, `asset_id`, `date`, `gross_amount_cents`, `taxes_cents` (IR 15% na fonte), `net_amount_cents`                                                                                  | **Crédito (+)** do líquido no caixa                          |
| `amortization`         | Amortização                       |      **Sim**       | `account_id`, `asset_id`, `date`, `gross_amount_cents`, `net_amount_cents`                                                                                                                   | **Crédito (+)** no caixa e reduz o custo contábil da posição |
| `fee`                  | Taxa / Custódia / Corretagem      |        Não         | `account_id`, `date`, `gross_amount_cents` ou `fees_cents`                                                                                                                                   | **Débito (-)** no caixa                                      |
| `tax`                  | Imposto (DARF / IOF)              |        Não         | `account_id`, `date`, `gross_amount_cents` ou `taxes_cents`                                                                                                                                  | **Débito (-)** no caixa                                      |
| `reversal`             | Estorno / Cancelamento            | Conforme original  | `reversal_of_id`, `account_id`, `date`, `notes`                                                                                                                                              | Reverte o impacto contábil original                          |

---

## 5. Regras de Integridade e Validações Contábeis

1. **Prevenção de Saldo Negativo em Saque**: Saques (`withdrawal`) que resultem em saldo negativo na conta são bloqueados pelo backend com erro `INSUFFICIENT_FUNDS`.
2. **Idempotência**: Cada ordem de compra, venda ou lançamento pode carregar uma chave única (`idempotency_key`), evitando lançamentos duplicados por cliques repetidos ou reenvios de rede.
3. **Imutabilidade de Estornos**: Movimentações marcadas com `is_reversed = true` não podem ser editadas diretamente, garantindo rastreabilidade de auditoria completa em conformidade com as diretrizes do sistema.

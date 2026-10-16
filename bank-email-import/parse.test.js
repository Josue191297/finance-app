import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

// Code.js is an Apps Script file (no exports), so run it in a sandbox and read its functions.
const sandbox = {}
vm.runInNewContext(
  readFileSync(new URL("./Code.js", import.meta.url), "utf8") +
    "\nthis.parseBankEmail = parseBankEmail; this.cleanMerchant = cleanMerchant; this.toFields = toFields;",
  sandbox
)

const email = (amount, extra = "") => `Comercio:\tCANVA* I05034-50629391
Ciudad y país:\tAUSTIN, Pais no Definido
Fecha:\tOct 15, 2026, 17:24
MASTER:\t****************
Autorización:\t532098
Referencia:\t101504532098
Tipo de Transacción:\tCOMPRA
Monto:\t${amount}${extra}`

test("parses a BAC purchase email", () => {
  assert.deepEqual({ ...sandbox.parseBankEmail(email("CRC 4,400.00")) }, {
    name: "Canva",
    merchantKey: "canva",
    bankDescriptor: "CANVA* I05034-50629391",
    date: "2026-10-15",
    currency: "CRC",
    amount: 4400,
    kind: "COMPRA",
  })
})

test("parses USD amounts and labels on separate lines", () => {
  const text = email("USD 12.99").replace(/:\t/g, ":\n")
  const parsed = sandbox.parseBankEmail(text)
  assert.equal(parsed.currency, "USD")
  assert.equal(parsed.amount, 12.99)
  assert.equal(parsed.name, "Canva")
})

test("rejects emails in another format", () => {
  assert.equal(sandbox.parseBankEmail("Hola, su estado de cuenta está listo."), null)
})

test("cleans merchant names so repeat purchases match", () => {
  assert.equal(sandbox.cleanMerchant("UBER *TRIP 8XK2"), "Uber Trip")
  assert.equal(sandbox.cleanMerchant("AUTO MERCADO ESCAZU"), "Auto Mercado Escazu")
  assert.equal(sandbox.cleanMerchant("12345"), "12345")
})

test("encodes values for Firestore", () => {
  const fields = sandbox.toFields({ amount: 4400, price: 12.99, items: [{ category: "" }], savingGoalId: null })
  assert.deepEqual(JSON.parse(JSON.stringify(fields)), {
    amount: { integerValue: "4400" },
    price: { doubleValue: 12.99 },
    items: { arrayValue: { values: [{ mapValue: { fields: { category: { stringValue: "" } } } }] } },
    savingGoalId: { nullValue: null },
  })
})

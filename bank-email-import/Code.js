// Imports BAC Credomatic purchase emails from Gmail into the Finance app as expenses.
// Setup: run setup() once from the Apps Script editor. It asks for permission and then
// checks Gmail every 5 minutes. Only emails received after setup() are imported, so
// purchases you already entered by hand are not duplicated.

const SENDER = "NotificacionBAC@baccredomatic.cr"
const PROJECT_ID = "finance-app-5f72d"
const HOUSEHOLD = "shared-house"
const FAILED_LABEL = "Finance import failed"
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const MONTHS = {
  jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dec: 12, dic: 12,
}

/* ---------- PARSING (pure, tested in parse.test.js) ---------- */

// "CANVA* I05034-50629391" -> "Canva". Reference codes change every purchase, so drop
// every word with a digit; what is left is stable and is used to learn the category.
function cleanMerchant(raw) {
  const words = raw.replace(/\*/g, " ").split(/\s+/).filter((w) => w && !/\d/.test(w))
  if (words.length === 0) return raw.trim()
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

function field(text, label) {
  const match = text.match(new RegExp(label + "\\s*:\\s*([^\\n\\r\\t]+?)\\s*(?:[\\n\\r\\t]|$)", "i"))
  return match ? match[1].trim() : null
}

// Returns null when the email is not in the expected format.
function parseBankEmail(text) {
  const merchant = field(text, "Comercio")
  const dateText = field(text, "Fecha")
  const amountText = field(text, "Monto")
  const kind = field(text, "Tipo de Transacci[oó]n")
  if (!merchant || !dateText || !amountText) return null

  const date = dateText.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/)
  const amount = amountText.match(/(CRC|USD)\s*([\d,]+(?:\.\d+)?)/i)
  if (!date || !amount || !MONTHS[date[1].toLowerCase()]) return null

  const month = String(MONTHS[date[1].toLowerCase()]).padStart(2, "0")
  const name = cleanMerchant(merchant)

  return {
    name,
    merchantKey: name.toLowerCase(),
    bankDescriptor: merchant,
    date: `${date[3]}-${month}-${date[2].padStart(2, "0")}`,
    currency: amount[1].toUpperCase(),
    amount: Number(amount[2].replace(/,/g, "")),
    kind: (kind || "").toUpperCase(),
  }
}

/* ---------- FIRESTORE REST ---------- */

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === "boolean") return { booleanValue: v }
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === "string") return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  return { mapValue: { fields: toFields(v) } }
}

function toFields(obj) {
  const fields = {}
  Object.keys(obj).forEach((key) => (fields[key] = toValue(obj[key])))
  return fields
}

function firestore(method, path, body) {
  const response = UrlFetchApp.fetch(`${FIRESTORE}/households/${HOUSEHOLD}${path}`, {
    method,
    contentType: "application/json",
    // Bill the Firebase project, not Apps Script's hidden default project.
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      "X-Goog-User-Project": PROJECT_ID,
    },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  })
  return { code: response.getResponseCode(), json: JSON.parse(response.getContentText() || "null") }
}

// Category from the most recent earlier transaction at the same store, or "".
function findCategory(parsed) {
  const query = (fieldPath, value) =>
    firestore("post", ":runQuery", {
      structuredQuery: {
        from: [{ collectionId: "expenses" }],
        where: { fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } } },
      },
    }).json || []

  const docs = query("merchantKey", parsed.merchantKey)
    .concat(query("name", parsed.name))
    .map((row) => row.document && row.document.fields)
    .filter(Boolean)
    .map((f) => ({
      date: (f.date && f.date.stringValue) || "",
      category:
        (f.items && f.items.arrayValue.values &&
          f.items.arrayValue.values[0].mapValue.fields.category &&
          f.items.arrayValue.values[0].mapValue.fields.category.stringValue) ||
        (f.category && f.category.stringValue) ||
        "",
    }))
    .filter((d) => d.category)
    .sort((a, b) => b.date.localeCompare(a.date))

  return docs.length ? docs[0].category : ""
}

function saveExpense(messageId, parsed) {
  const isUsd = parsed.currency === "USD"
  // USD charges get 0 until you enter the colones amount from your statement.
  const amount = isUsd ? 0 : parsed.amount
  const category = findCategory(parsed)

  const expense = {
    transactionMode: "detailed",
    type: "expense",
    name: parsed.name,
    date: parsed.date,
    items: [{ name: parsed.name, amount, category }],
    amount,
    category: null,
    savingGoalId: null,
    savingGoalName: null,
    source: "bank-email",
    needsReview: true,
    merchantKey: parsed.merchantKey,
    bankDescriptor: parsed.bankDescriptor,
    currency: parsed.currency,
    originalAmount: parsed.amount,
    createdAt: Date.now(),
  }

  // documentId = Gmail message id: a second import of the same email gets 409 and changes nothing.
  const result = firestore("post", `/expenses?documentId=bank-${messageId}`, { fields: toFields(expense) })
  if (result.code !== 200 && result.code !== 409) {
    throw new Error(`Firestore ${result.code}: ${JSON.stringify(result.json)}`)
  }
}

/* ---------- GMAIL ---------- */

function importBankEmails() {
  const props = PropertiesService.getScriptProperties()
  const since = Number(props.getProperty("since"))
  if (!since) throw new Error("Run setup() first.")

  // Message ids already handled; keeps the last 300 so the list stays small.
  const seen = JSON.parse(props.getProperty("seen") || "[]")

  // shortcut: only looks back 3 days; if the script stops for longer, older emails are skipped.
  const threads = GmailApp.search(`from:${SENDER} newer_than:3d`)
  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      const id = message.getId()
      if (seen.indexOf(id) !== -1 || message.getDate().getTime() < since) return
      if (message.getFrom().toLowerCase().indexOf(SENDER.toLowerCase()) === -1) return

      const parsed = parseBankEmail(message.getPlainBody())
      if (!parsed) {
        // Flag it in Gmail so nothing is lost silently.
        thread.addLabel(GmailApp.getUserLabelByName(FAILED_LABEL) || GmailApp.createLabel(FAILED_LABEL))
      } else if (parsed.kind === "" || parsed.kind === "COMPRA") {
        saveExpense(id, parsed)
      }
      seen.push(id)
    })
  })

  props.setProperty("seen", JSON.stringify(seen.slice(-300)))
}

function setup() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t))
  PropertiesService.getScriptProperties().setProperty("since", String(Date.now()))
  ScriptApp.newTrigger("importBankEmails").timeBased().everyMinutes(5).create()
}

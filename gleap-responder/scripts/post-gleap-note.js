import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Load .env manually
try {
  const envPath = resolve(process.cwd(), '.env')
  const envContent = await readFile(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').replace(/^['"]|['"]$/g, '')
    }
  }
} catch {}

const TICKET_ID = process.argv[2]
const PROJECT_ID = process.argv[3] || '695d175e48ac2b20b647cbfe'
const CONTENT_FILE = process.argv[4]

if (!TICKET_ID || !CONTENT_FILE) {
  console.error('Usage: node post-gleap-note.js <ticket-id> <project-id> <content-file>')
  process.exit(1)
}

const API_KEY = process.env.GLEAP_API_KEY
if (!API_KEY) {
  console.error('Missing GLEAP_API_KEY env var')
  process.exit(1)
}

const content = await readFile(CONTENT_FILE, 'utf8')

const res = await fetch('https://api.gleap.io/v3/messages', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Project: PROJECT_ID,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ticket: TICKET_ID,
    isNote: true,
    data: {
      content: {
        type: 'doc',
        content: textToDoc(content)
      }
    }
  })
})

if (!res.ok) {
  const body = await res.text()
  console.error(`Failed to post note: ${res.status} ${res.statusText}`)
  console.error(body)
  process.exit(1)
}

const result = await res.json()
console.log(`Internal note posted successfully on ticket ${TICKET_ID}`)
console.log(`Message ID: ${result._id || result.id || 'unknown'}`)

function textToDoc (text) {
  const lines = text.split('\n')
  const nodes = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.slice(2) }]
      })
    } else if (line.startsWith('## ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.slice(3) }]
      })
    } else if (line.startsWith('### ')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.slice(4) }]
      })
    } else if (line.startsWith('- ')) {
      nodes.push({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(line.slice(2))
          }]
        }]
      })
    } else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '')
      nodes.push({
        type: 'orderedList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(text)
          }]
        }]
      })
    } else if (line === '---') {
      nodes.push({ type: 'horizontalRule' })
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      nodes.push({
        type: 'paragraph',
        content: parseInlineMarks(line)
      })
    }
  }

  return nodes
}

function parseInlineMarks (text) {
  const nodes = []
  const regex = /\*\*(.+?)\*\*|`(.+?)`|<(https?:\/\/[^>]+)>|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[1]) {
      // bold
      nodes.push({ type: 'text', text: match[1], marks: [{ type: 'bold' }] })
    } else if (match[2]) {
      // code
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'code' }] })
    } else if (match[3]) {
      // <url>
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'link', attrs: { href: match[3] } }] })
    } else if (match[4] && match[5]) {
      // [text](url)
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'link', attrs: { href: match[5] } }] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

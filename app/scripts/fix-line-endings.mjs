import fs from 'node:fs'
import path from 'node:path'

function normalizeFile(file) {
  if (fs.existsSync(file) && /\.(tsx?|css|json|md)$/.test(file)) {
    const content = fs.readFileSync(file, 'utf8')
    if (content.includes('\r\n')) {
      fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8')
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  const stat = fs.statSync(dir)
  if (stat.isFile()) {
    normalizeFile(dir)
    return
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walk(full)
      }
    } else if (entry.isFile()) {
      normalizeFile(full)
    }
  }
}

const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('app/src')
walk(target)
console.log('Normalized line endings to LF in', target)

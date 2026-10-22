import fs from 'node:fs'
import path from 'node:path'

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walk(full)
      }
    } else if (entry.isFile() && /\.(tsx?|css|json|md)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8')
      if (content.includes('\r\n')) {
        fs.writeFileSync(full, content.replace(/\r\n/g, '\n'), 'utf8')
      }
    }
  }
}

const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('app/src')
walk(target)
console.log('Normalized line endings to LF in', target)

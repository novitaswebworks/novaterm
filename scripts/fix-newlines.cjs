const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      const content = fs.readFileSync(p, 'utf8');
      if (content.endsWith('\\n')) {
        fs.writeFileSync(p, content.slice(0, -2) + '\n');
      }
    }
  }
}
walk(path.join(process.cwd(), 'src'));
console.log('Fixed newlines');

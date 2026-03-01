/**
 * Start static server. Uses PORT env var (e.g. on Railway) or defaults to 3000 for local dev.
 */
const { spawn } = require('child_process');
const path = require('path');
const port = process.env.PORT || 3000;
const root = path.join(__dirname, '..');
const child = spawn('npx', ['serve', '.', '-l', String(port)], {
  stdio: 'inherit',
  cwd: root,
});
child.on('exit', (code) => process.exit(code ?? 0));

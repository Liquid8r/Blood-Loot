/**
 * Start static server. Uses PORT env var (e.g. on Railway) or defaults to 3000 for local dev.
 * Runs the local "serve" package via node so npx is not required in PATH.
 */
const { spawn } = require('child_process');
const path = require('path');
const port = process.env.PORT || 3000;
const root = path.join(__dirname, '..');
const serveCli = path.join(root, 'node_modules', 'serve', 'build', 'main.js');
const child = spawn(process.execPath, [serveCli, '.', '-l', String(port)], {
  stdio: 'inherit',
  cwd: root,
});
child.on('exit', (code) => process.exit(code ?? 0));

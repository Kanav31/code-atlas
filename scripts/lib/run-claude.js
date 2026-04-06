/**
 * Pipe a prompt to `claude --print` and return the response as a string.
 * Uses the same authenticated session as your Claude Code CLI install.
 */

const { execFileSync } = require('child_process');
const os               = require('os');
const fs               = require('fs');
const path             = require('path');

/**
 * @param {string} prompt   Full prompt text (can be very long)
 * @param {object} [opts]
 * @param {string} [opts.model]    Claude model slug (default: claude-sonnet-4-6)
 * @param {number} [opts.timeout]  ms before giving up (default: 5 min)
 */
function runClaude(prompt, opts = {}) {
  const {
    model   = 'claude-sonnet-4-6',
    timeout = 5 * 60 * 1000,
  } = opts;

  // Write prompt to a temp file to avoid shell argument length limits
  const tmpFile = path.join(os.tmpdir(), `ca-agent-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf8');

  try {
    const result = execFileSync(
      'claude',
      ['--print', '--model', model, '-p', fs.readFileSync(tmpFile, 'utf8')],
      {
        encoding:  'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50 MB
        timeout,
      },
    );
    return result;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

module.exports = { runClaude };

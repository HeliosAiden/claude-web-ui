/**
 * Secure git authentication helper.
 *
 * Uses GIT_ASKPASS with a temporary shell script instead of embedding
 * tokens in clone URLs.  This keeps tokens out of:
 *   - Process argument lists (visible via `ps aux`)
 *   - Git error / stderr output
 *   - Git config files
 *
 * Usage:
 *   const auth = setupGitAuth(token);
 *   spawn('git', ['clone', url, path], { env: { ...process.env, ...auth.env } });
 *   auth.cleanup();  // remove temp script when done
 */

import { chmodSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function setupGitAuth(token: string): {
  env: Record<string, string>;
  cleanup: () => void;
} {
  const tmpDir = mkdtempSync(join(tmpdir(), 'git-auth-'));
  const helperPath = join(tmpDir, 'askpass.sh');

  // Single quotes prevent shell interpretation of special chars in the token.
  // GitHub tokens match /^gh[a-su]_[a-zA-Z0-9]+$/ so single quotes within
  // the value are not a concern.
  writeFileSync(
    helperPath,
    `#!/bin/sh\ncase "$1" in\n  *Username*) echo "oauth2" ;;\n  *Password*) echo '${token}' ;;\nesac\n`,
  );
  chmodSync(helperPath, 0o755);

  const env: Record<string, string> = {
    GIT_ASKPASS: helperPath,
    GIT_TERMINAL_PROMPT: '0',
  };

  const cleanup = () => {
    try {
      unlinkSync(helperPath);
    } catch {
      // ignore
    }
    try {
      rmdirSync(tmpDir);
    } catch {
      // ignore
    }
  };

  return { env, cleanup };
}

/**
 * Replaces any occurrence of `token` in `text` with `'***'`.
 * Safe to call with null/undefined token — returns text unchanged.
 */
export function maskToken(text: string, token: string | null | undefined): string {
  if (!token || !text) return text;
  return text.replaceAll(token, '***');
}

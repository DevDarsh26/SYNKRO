import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { command, cwd: initialCwd, repoUrl } = await request.json();
    let cwd = initialCwd;

    if (!cwd && repoUrl) {
      // Create a unique temp directory for this repo
      const repoName = repoUrl.split('/').pop().replace('.git', '');
      const uniqueId = crypto.randomBytes(4).toString('hex');
      cwd = path.join(os.tmpdir(), `synkro-${repoName}-${uniqueId}`);
      
      if (!fs.existsSync(cwd)) {
        await execAsync(`git clone ${repoUrl} ${cwd}`);
      }
    }

    if (!command) {
      return NextResponse.json({ cwd, output: '\x1b[1;32mSynkro Terminal initialized.\x1b[0m\r\n' });
    }

    const ALLOWED_COMMANDS = ['npm', 'node', 'git', 'ls', 'dir', 'echo', 'pwd', 'cat', 'type', 'npx'];
    const baseCmd = command.trim().split(' ')[0].toLowerCase();
    if (!ALLOWED_COMMANDS.includes(baseCmd)) {
      return NextResponse.json({ cwd, output: `\x1b[31mError: Command '${baseCmd}' is not allowed for security reasons.\x1b[0m\r\n` });
    }

    // Execution with safe whitelist
    try {
      const { stdout, stderr } = await execAsync(command, { cwd, timeout: 10000 });
      return NextResponse.json({ cwd, output: stdout + (stderr ? '\r\n\x1b[31m' + stderr + '\x1b[0m' : '') });
    } catch (err) {
      return NextResponse.json({ cwd, output: `\x1b[31m${err.message}\x1b[0m` });
    }

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

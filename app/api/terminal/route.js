import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { command, cwd: initialCwd, repoUrl } = await request.json();
    let cwd = initialCwd;

    if (!cwd && repoUrl) {
      // Create a unique temp directory for this repo
      const repoName = repoUrl.split('/').pop().replace('.git', '');
      const uniqueId = Math.random().toString(36).substring(7);
      cwd = path.join(os.tmpdir(), `synkro-${repoName}-${uniqueId}`);
      
      if (!fs.existsSync(cwd)) {
        await execAsync(`git clone ${repoUrl} ${cwd}`);
      }
    }

    if (!command) {
      return NextResponse.json({ cwd, output: '\x1b[1;32mSynkro Terminal initialized.\x1b[0m\r\n' });
    }

    // Dangerous in production, but okay for local dev demonstration
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

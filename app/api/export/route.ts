import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function runPython(scriptPath: string, inputJson: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('python', ['-X', 'utf8', scriptPath], {
      env: { ...process.env, PYTHONUTF8: '1' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf8'); });

    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `exit code ${code}`));
      else resolve(stdout.trim());
    });

    child.on('error', reject);

    child.stdin.write(inputJson, 'utf8');
    child.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tmpOut = path.join(os.tmpdir(), `adplanner_${Date.now()}.xlsx`);
  const scriptPath = path.join(process.cwd(), 'scripts', 'generate_excel.py');

  try {
    await runPython(scriptPath, JSON.stringify({ ...body, outputPath: tmpOut }));

    const buffer = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpOut);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`AdPlanner_시뮬레이션_${body.dateStr}.xlsx`)}`,
      },
    });
  } catch (err) {
    console.error('[export]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

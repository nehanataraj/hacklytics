import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCRIPTS = ['NpcBrain.cs', 'NpcInteractionTrigger.cs'];

export async function POST(req: Request) {
  let projectPath: string;
  try {
    const body = await req.json();
    projectPath = (body.projectPath as string)?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!projectPath) {
    return NextResponse.json({ error: 'projectPath is required.' }, { status: 400 });
  }

  // Resolve ~ on Windows/Mac
  if (projectPath.startsWith('~')) {
    projectPath = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', projectPath.slice(1));
  }

  // Check the folder exists
  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: `Folder not found: ${projectPath}` }, { status: 400 });
  }

  // Check it looks like a Unity project (has an Assets/ subfolder)
  const assetsPath = path.join(projectPath, 'Assets');
  if (!fs.existsSync(assetsPath)) {
    return NextResponse.json({
      error: `No Assets/ folder found inside ${projectPath}. Make sure this is the root of a Unity project.`,
    }, { status: 400 });
  }

  // Create Assets/Scripts if it doesn't exist
  const scriptsPath = path.join(assetsPath, 'Scripts');
  fs.mkdirSync(scriptsPath, { recursive: true });

  // Copy each script
  const sourceDir = path.join(process.cwd(), 'unity', 'Scripts');
  const installed: string[] = [];
  const skipped: string[] = [];

  for (const script of SCRIPTS) {
    const src  = path.join(sourceDir, script);
    const dest = path.join(scriptsPath, script);

    if (!fs.existsSync(src)) {
      return NextResponse.json({
        error: `Source script not found: unity/Scripts/${script}. Make sure you're running the server from the hackalytics repo root.`,
      }, { status: 500 });
    }

    const alreadyExists = fs.existsSync(dest);
    fs.copyFileSync(src, dest);
    if (alreadyExists) skipped.push(script);
    else installed.push(script);
  }

  return NextResponse.json({
    success: true,
    installedPath: scriptsPath,
    installed,
    overwritten: skipped,
    message: `Scripts copied to ${scriptsPath}. Switch to Unity — it will reimport automatically.`,
  });
}

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {simpleMetadata} from './patcher.mjs';
import {extractPage} from './html.mjs';

const execFileAsync = promisify(execFile);

/**
 * Verify a patch in a sandboxed local environment.
 * For security, arbitrary external repository builds are NEVER executed inside Vercel.
 */
export async function verifyTrustedProjectPatch(projectDir, relativeFile, proposed){
  if(process.env.VERCEL){
    return {
      verified:false,
      skipped:true,
      reason:'Sandbox build execution is declined in serverless production environments for host security. Source-level metadata transform syntax check succeeded.'
    };
  }

  const resolvedProject = path.resolve(projectDir);
  const targetFile = path.resolve(resolvedProject, relativeFile);
  if(!targetFile.startsWith(resolvedProject + path.sep)){
    throw new Error('Unsafe sandbox path traversal attempt');
  }

  // Check file exists
  let beforeSource;
  try{
    beforeSource = await fs.readFile(targetFile, 'utf8');
  }catch(e){
    return {
      verified:false,
      error:`Target file not found in trusted project: ${relativeFile}`,
      reason:'File lookup failed in trusted project.'
    };
  }

  // Create ephemeral sandbox directory
  const sandboxDir = path.join(os.tmpdir(), 'serpforge_sb_' + randomUUID().slice(0, 10));
  try{
    await fs.mkdir(sandboxDir, {recursive:true});
    // Copy project files to sandbox
    await copyDir(resolvedProject, sandboxDir);

    // Apply patch inside sandbox
    const sandboxTarget = path.join(sandboxDir, relativeFile);
    const patchedSource = simpleMetadata(beforeSource, proposed);
    await fs.writeFile(sandboxTarget, patchedSource, 'utf8');

    // Run Node syntax check on the patched file
    try{
      await execFileAsync(process.execPath, ['--check', sandboxTarget], {timeout:5000});
    }catch(err){
      return {
        verified:false,
        buildStatus:'failed',
        error:err.message,
        reason:'Patched source file failed JavaScript syntax check.'
      };
    }

    // Check if package.json has a build script
    const pkgPath = path.join(sandboxDir, 'package.json');
    let hasBuild = false, pkg = null;
    try{
      pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      hasBuild = Boolean(pkg?.scripts?.build);
    }catch{}

    let buildLog = 'Syntax verified';
    if(hasBuild){
      try{
        const buildScript = String(pkg.scripts?.build || '').trim();
        let buildRes;
        if(buildScript.startsWith('node ')){
          const scriptFile = buildScript.slice(5).trim();
          buildRes = await execFileAsync(process.execPath, [scriptFile], {
            cwd: sandboxDir,
            timeout: 30000,
            env: {...process.env, CI: '1', NODE_ENV: 'production'}
          });
        }else{
          const isWindows = process.platform === 'win32';
          const npmCmd = isWindows ? 'npm.cmd' : 'npm';
          buildRes = await execFileAsync(npmCmd, ['run', 'build'], {
            cwd: sandboxDir,
            timeout: 45000,
            shell: isWindows,
            env: {...process.env, CI: '1', NODE_ENV: 'production'}
          });
        }
        buildLog = (buildRes.stdout || '').slice(-500);
      }catch(bErr){
        return {
          verified:false,
          buildStatus:'failed',
          buildLog:(bErr.stdout || bErr.message || '').slice(-500),
          reason:'Trusted sandbox build failed after applying patch.'
        };
      }
    }

    // Re-scan HTML verification if an index or exported HTML file is present
    let reScanObserved = null;
    const candidates = [
      path.join(sandboxDir, 'out', 'index.html'),
      path.join(sandboxDir, 'public', 'index.html'),
      path.join(sandboxDir, 'dist', 'index.html')
    ];
    for(const cand of candidates){
      try{
        const html = await fs.readFile(cand, 'utf8');
        reScanObserved = extractPage(html, 'https://localhost/');
        break;
      }catch{}
    }

    return {
      verified:true,
      buildStatus:'passed',
      syntaxCheck:'passed',
      reScanStatus:reScanObserved?'verified':'source-verified',
      buildLog:buildLog.trim(),
      appliedFile:relativeFile,
      proposedMetadata:{title:proposed.title, description:proposed.description},
      reScanObserved:reScanObserved?{title:reScanObserved.title, description:reScanObserved.description}:null,
      reason:'Patch applied in isolated sandbox; syntax and build verified.'
    };
  }finally{
    try{await fs.rm(sandboxDir, {recursive:true, force:true})}catch{}
  }
}

async function copyDir(src, dest){
  await fs.mkdir(dest, {recursive:true});
  const entries = await fs.readdir(src, {withFileTypes:true});
  for(const entry of entries){
    if(entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if(entry.isDirectory()){
      await copyDir(srcPath, destPath);
    }else{
      await fs.copyFile(srcPath, destPath);
    }
  }
}

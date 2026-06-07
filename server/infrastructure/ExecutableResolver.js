import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_GT_FALLBACK_PATHS = [
  '/opt/homebrew/bin/gt',
  '/usr/local/bin/gt',
  '/home/linuxbrew/.linuxbrew/bin/gt',
];

export const DEFAULT_BD_FALLBACK_PATHS = [
  '/opt/homebrew/bin/bd',
  '/usr/local/bin/bd',
  '/home/linuxbrew/.linuxbrew/bin/bd',
];

function hasPathSeparator(value) {
  return value.includes('/') || value.includes('\\');
}

function canExecute(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function executableFromPath(command, env) {
  const pathValue = env.PATH || '';
  const dirs = pathValue.split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, command);
    if (canExecute(candidate)) return candidate;
  }
  return null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildAugmentedPathEnv({
  env = process.env,
  executablePaths = [],
} = {}) {
  const currentPath = env.PATH || '';
  const inferredDirs = executablePaths
    .filter((value) => hasPathSeparator(value))
    .map((value) => path.dirname(value));
  const pathEntries = unique([...inferredDirs, ...currentPath.split(path.delimiter).filter(Boolean)]);
  return {
    ...env,
    PATH: pathEntries.join(path.delimiter),
  };
}

export function resolveExecutable({
  command,
  envVarName,
  fallbackPaths = [],
  env = process.env,
} = {}) {
  if (!command) throw new Error('resolveExecutable requires command');

  const override = envVarName ? String(env[envVarName] || '').trim() : '';
  if (override) {
    if (canExecute(override)) return override;
    throw new Error(`${envVarName} is set but is not executable: ${override}`);
  }

  if (hasPathSeparator(command) && canExecute(command)) {
    return command;
  }

  const fromPath = executableFromPath(command, env);
  if (fromPath) return fromPath;

  for (const candidate of fallbackPaths) {
    if (canExecute(candidate)) return candidate;
  }

  return command;
}

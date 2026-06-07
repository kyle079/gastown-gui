import { describe, expect, it } from 'vitest';

import {
  enrichSessions,
  parsePaneMetadata,
  parseTmuxSessions,
  resolveSafeSpawnCwd,
  staleReasonForCwd,
} from '../../server/routes/terminal.js';

describe('terminal route helpers', () => {
  it('parses tmux ls output into sessions', () => {
    const sessions = parseTmuxSessions(
      'gg-ruby: 1 windows (created Sun Jun 7 12:00:00 2026)\n' +
      'hq-mayor: 1 windows (created Sun Jun 7 12:00:01 2026)\n',
    );

    expect(sessions).toEqual([
      { name: 'gg-ruby', role: 'polecat', rig: 'gg', label: 'gg-ruby' },
      { name: 'hq-mayor', role: 'mayor', rig: 'hq', label: 'hq-mayor' },
    ]);
  });

  it('marks sessions stale when their cwd is missing', () => {
    const metadata = parsePaneMetadata(
      'gg-ruby\t1\t1\t1\t0\t/home/kyle/gt/gastown_gui/polecats/ruby/gastown_gui\n' +
      'gg-stale\t0\t1\t1\t0\t/tmp/gt-terminal-stale-path\n',
      { gtRoot: '/home/kyle/gt' },
    );

    expect(metadata.get('gg-ruby')).toMatchObject({
      cwd: '/home/kyle/gt/gastown_gui/polecats/ruby/gastown_gui',
      cwdExists: true,
      stale: false,
      staleReason: null,
    });
    expect(metadata.get('gg-stale')).toMatchObject({
      cwd: '/tmp/gt-terminal-stale-path',
      cwdExists: false,
      stale: true,
      staleReason: 'missing_cwd',
      cleanupSafe: true,
    });
  });

  it('prefers active pane metadata when multiple panes exist', () => {
    const metadata = parsePaneMetadata(
      'gg-ruby\t1\t1\t0\t0\t/tmp/older\n' +
      'gg-ruby\t1\t1\t1\t0\t/home/kyle/gt/gastown_gui/polecats/ruby/gastown_gui\n',
      { gtRoot: '/home/kyle/gt' },
    );

    expect(metadata.get('gg-ruby')?.cwd).toBe('/home/kyle/gt/gastown_gui/polecats/ruby/gastown_gui');
  });

  it('enriches session list with pane metadata', () => {
    const sessions = [{ name: 'gg-ruby', role: 'polecat', rig: 'gg', label: 'gg-ruby' }];
    const paneMetadata = parsePaneMetadata(
      'gg-ruby\t1\t1\t1\t0\t/home/kyle/gt/gastown_gui/polecats/ruby/gastown_gui\n',
      { gtRoot: '/home/kyle/gt' },
    );

    expect(enrichSessions(sessions, paneMetadata)[0]).toMatchObject({
      name: 'gg-ruby',
      stale: false,
      cwdExists: true,
      attached: true,
    });
  });

  it('classifies missing repo cwd as missing worktree cwd', () => {
    expect(staleReasonForCwd('/home/kyle/gt/gastown_gui/polecats/ghost/worktree', {
      gtRoot: '/home/kyle/gt',
    })).toBe('missing_worktree_cwd');
  });

  it('falls back to a safe existing cwd', () => {
    const cwd = resolveSafeSpawnCwd({ gtRoot: '/home/kyle/gt', home: '/home/kyle' });
    expect(typeof cwd).toBe('string');
    expect(cwd.length).toBeGreaterThan(0);
  });
});

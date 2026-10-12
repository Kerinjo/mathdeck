import { useSyncExternalStore } from 'react';
import { upgradeState, type LogEntry, type SkillState } from './scheduler';
import type { SessionState } from './session';

export interface Settings {
  /** Problems per study session (you can always keep going). */
  sessionLength: number;
  /** Most reviews served in one review session. */
  reviewCap: number;
}

export interface Data {
  version: 2;
  states: Record<string, SkillState>;
  log: LogEntry[];
  /** Saved study sessions by key ("chapter:<id>" or "skill:<id>"), so you can resume. */
  sessions: Record<string, SessionState>;
  /** "Going deeper" sections you switched on. */
  deeper: Record<string, boolean>;
  settings: Settings;
}

const KEY = 'mathdeck:v1';
const MAX_LOG = 50_000;

const empty = (): Data => ({
  version: 2,
  states: {},
  log: [],
  sessions: {},
  deeper: {},
  settings: { sessionLength: 10, reviewCap: 30 },
});

/** Accepts any saved version and returns current-format data. */
function migrate(raw: any): Data {
  const d = empty();
  if (!raw || typeof raw !== 'object' || typeof raw.states !== 'object' || !Array.isArray(raw.log)) {
    throw new Error('Not a mathdeck backup');
  }
  const now = Date.now();
  return {
    ...d,
    states: Object.fromEntries(Object.entries(raw.states).map(([k, v]) => [k, upgradeState(v as Partial<SkillState>, now)])),
    log: raw.log,
    sessions: raw.version >= 2 ? (raw.sessions ?? {}) : {},
    deeper: raw.deeper ?? {},
    settings: { ...d.settings, ...(raw.version >= 2 ? raw.settings : {}) },
  };
}

function load(): Data {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : empty();
  } catch {
    // Never silently overwrite unreadable progress: park a copy before starting fresh.
    try {
      if (raw) localStorage.setItem(`${KEY}:unreadable-${Date.now()}`, raw);
    } catch {
      // ignore
    }
    return empty();
  }
}

let data = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: keep working in memory; export still works.
  }
}

export function update(fn: (d: Data) => Data) {
  data = fn(data);
  if (data.log.length > MAX_LOG) data = { ...data, log: data.log.slice(-MAX_LOG) };
  persist();
  listeners.forEach((l) => l());
}

export const getData = () => data;

export function useData(): Data {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => data,
    () => data,
  );
}

export const exportJson = () => JSON.stringify(data, null, 2);

export function importJson(json: string) {
  const d = migrate(JSON.parse(json));
  update(() => d);
}

export const reset = () => update(() => empty());

import { useSyncExternalStore } from 'react';
import type { LogEntry, SkillState } from './scheduler';

export interface Settings {
  newPerDay: number;
}

export interface Data {
  version: 1;
  states: Record<string, SkillState>;
  log: LogEntry[];
  settings: Settings;
}

const KEY = 'mathdeck:v1';
const MAX_LOG = 50_000;

const empty = (): Data => ({ version: 1, states: {}, log: [], settings: { newPerDay: 3 } });

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const d = JSON.parse(raw) as Data;
    return { ...empty(), ...d, settings: { ...empty().settings, ...d.settings } };
  } catch {
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
  );
}

export function exportJson() {
  return JSON.stringify(data, null, 2);
}

export function importJson(json: string) {
  const d = JSON.parse(json) as Data;
  if (d.version !== 1 || typeof d.states !== 'object' || !Array.isArray(d.log)) throw new Error('Not a mathdeck backup');
  update(() => ({ ...empty(), ...d }));
}

export const reset = () => update(() => empty());

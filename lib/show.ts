import type { Dream, WallSnapshot } from "./contracts";

export type ShowState = {
  generation: number | null;
  seen: string[];
  queue: Dream[];
  active: Dream | null;
};
export const emptyShow: ShowState = { generation: null, seen: [], queue: [], active: null };

// Pure transition shared by the display and round-boundary regression tests.
export function reconcileShow(state: ShowState, snapshot: WallSnapshot, paused = false): ShowState {
  if (state.generation === null) {
    return { generation: snapshot.generation, seen: snapshot.dreams.map(d => d.id), queue: [], active: null };
  }
  if (state.generation !== snapshot.generation) {
    return {
      generation: snapshot.generation,
      seen: snapshot.dreams.map(d => d.id),
      active: paused ? null : snapshot.dreams[0] ?? null,
      queue: paused ? snapshot.dreams : snapshot.dreams.slice(1),
    };
  }
  const visible = new Set(snapshot.dreams.map(d => d.id));
  const seen = new Set(state.seen);
  const queue = [...state.queue.filter(d => visible.has(d.id)), ...snapshot.dreams.filter(d => !seen.has(d.id))];
  const active = state.active && visible.has(state.active.id) ? state.active : paused ? null : queue.shift() ?? null;
  return { generation: state.generation, seen: [...new Set([...state.seen, ...visible])], queue, active };
}

export function advanceShow(state: ShowState): ShowState {
  return { ...state, active: state.queue[0] ?? null, queue: state.queue.slice(1) };
}

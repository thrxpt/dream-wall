import { dreamParts, type Dream, type WallSnapshot } from "./contracts";

export type ShowState = {
  round: number | null;
  seen: string[];
  queue: Dream[];
  active: Dream | null;
  part: number;
};
export const emptyShow: ShowState = { round: null, seen: [], queue: [], active: null, part: 0 };

// Pure transition shared by the display and round-boundary regression tests.
export function reconcileShow(state: ShowState, snapshot: WallSnapshot, paused = false): ShowState {
  if (state.round === null) {
    return { round: snapshot.round, seen: snapshot.dreams.map(d => d.id), queue: [], active: null, part: 0 };
  }
  if (state.round !== snapshot.round) {
    return {
      round: snapshot.round,
      seen: snapshot.dreams.map(d => d.id),
      active: paused ? null : snapshot.dreams[0] ?? null,
      queue: paused ? snapshot.dreams : snapshot.dreams.slice(1),
      part: 0,
    };
  }
  const visible = new Set(snapshot.dreams.map(d => d.id));
  const seen = new Set(state.seen);
  const queue = [...state.queue.filter(d => visible.has(d.id)), ...snapshot.dreams.filter(d => !seen.has(d.id))];
  const active = state.active && visible.has(state.active.id) ? state.active : paused ? null : queue.shift() ?? null;
  return { round: state.round, seen: [...new Set([...state.seen, ...visible])], queue, active, part: active?.id === state.active?.id ? state.part : 0 };
}

export function advanceShow(state: ShowState): ShowState {
  if (state.active && state.part + 1 < dreamParts(state.active.dream).length) {
    return { ...state, part: state.part + 1 };
  }
  return { ...state, active: state.queue[0] ?? null, queue: state.queue.slice(1), part: 0 };
}

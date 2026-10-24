/**
 * Deterministic RNG (mulberry32). The state is a plain number so simulation state can be
 * cloned cheaply; each call returns the next value and the updated state.
 */
export const nextRandom = (state: number): { value: number; state: number } => {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let mixed = nextState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, state: nextState };
};

export const createSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;

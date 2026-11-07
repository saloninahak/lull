import { isError, type MoveResult, type Player } from '../src';

const NAMES = ['ana', 'ben', 'caro', 'dev', 'eli', 'fia', 'gus', 'hal'];

export function players(n: number): Player[] {
  return NAMES.slice(0, n).map((name, i) => ({ id: `p${i + 1}`, name }));
}

/** unwrap a move result, failing loudly if it was rejected */
export function ok<S>(result: MoveResult<S>): S {
  if (isError(result)) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

/** deep-freeze so any accidental mutation throws in strict mode */
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

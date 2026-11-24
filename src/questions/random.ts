export type QuestionSeed = number | string

export interface Random {
  integer(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
}

export function createRandom(seed: QuestionSeed): Random {
  let state = 2166136261
  for (const character of `${typeof seed}:${seed}`) {
    state = Math.imul(state ^ (character.codePointAt(0) ?? 0), 16777619)
  }

  const integer = (min: number, max: number) => {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
      throw new RangeError('Invalid random integer range')
    }
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    const fraction = ((value ^ (value >>> 14)) >>> 0) / 4294967296
    return min + Math.floor(fraction * (max - min + 1))
  }

  return {
    integer,
    pick<T>(items: readonly T[]): T {
      return items[integer(0, items.length - 1)]
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items]
      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = integer(0, index)
        const previous = result[index]
        result[index] = result[target]
        result[target] = previous
      }
      return result
    },
  }
}

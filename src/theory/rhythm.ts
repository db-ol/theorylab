export interface Rational {
  readonly numerator: number
  readonly denominator: number
}

function gcd(left: bigint, right: bigint): bigint {
  return right === 0n ? left : gcd(right, left % right)
}

function normalise(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new RangeError('A duration needs a nonzero denominator')
  const sign = denominator < 0n ? -1n : 1n
  const common = gcd(numerator < 0n ? -numerator : numerator, denominator * sign)
  const top = Number(numerator * sign / common)
  const bottom = Number(denominator * sign / common)
  if (!Number.isSafeInteger(top) || !Number.isSafeInteger(bottom)) {
    throw new RangeError('Duration exceeds the safe integer range')
  }
  return { numerator: top, denominator: bottom }
}

export function rational(numerator: number, denominator = 1): Rational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError('Duration terms must be safe integers')
  }
  return normalise(BigInt(numerator), BigInt(denominator))
}

export function addDuration(left: Rational, right: Rational): Rational {
  const leftDenominator = BigInt(left.denominator)
  const rightDenominator = BigInt(right.denominator)
  return normalise(
    BigInt(left.numerator) * rightDenominator + BigInt(right.numerator) * leftDenominator,
    leftDenominator * rightDenominator,
  )
}

export function multiplyDuration(left: Rational, right: Rational): Rational {
  return normalise(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  )
}

export function compareDuration(left: Rational, right: Rational): number {
  const difference = BigInt(left.numerator) * BigInt(right.denominator)
    - BigInt(right.numerator) * BigInt(left.denominator)
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

export const NOTE_VALUES = {
  breve: rational(2),
  semibreve: rational(1),
  minim: rational(1, 2),
  crotchet: rational(1, 4),
  quaver: rational(1, 8),
  semiquaver: rational(1, 16),
  demisemiquaver: rational(1, 32),
}

export function dottedDuration(duration: Rational, dots: 0 | 1 | 2 = 1): Rational {
  const denominator = 2 ** dots
  return multiplyDuration(duration, rational(2 * denominator - 1, denominator))
}

export function tupletDuration(duration: Rational, count: number, inTimeOf: number): Rational {
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(inTimeOf) || count < 1 || inTimeOf < 1) {
    throw new RangeError('Tuplet counts must be positive integers')
  }
  return multiplyDuration(duration, rational(inTimeOf, count))
}

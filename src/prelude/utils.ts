import type { UnionToIntersection } from "@effect-ts/core/Utils"

export function intersect<As extends any[]>(
  ...as: As
): UnionToIntersection<As[number]> {
  const y = {}
  for (let i = 0; i < as.length; i++) {
    Object.assign(y, as[i])
  }
  // @ts-expect-error
  return y
}

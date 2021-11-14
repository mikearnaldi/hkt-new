import { pipe } from "@effect-ts/core/Function"

import type { HKT, Kind } from "./hkt.js"
import type {
  Applicative,
  Eitherable,
  Failable,
  Monad,
  Semigroup
} from "./typeclasses.js"
import { instance } from "./utils.js"

export interface DoF<F extends HKT> {
  do: Kind<F, unknown, never, {}>
  bind: <N extends string, R, E, A, Scope>(
    name: N extends keyof Scope ? { error: `binding name '${N}' already in use` } : N,
    fn: (_: Scope) => Kind<F, R, E, A>
  ) => <R0, E0>(
    self: Kind<F, R0, E0, Scope>
  ) => Kind<
    F,
    R & R0,
    E | E0,
    {
      readonly [k in N | keyof Scope]: k extends keyof Scope ? Scope[k] : A
    }
  >
}

export function getDo<F extends HKT>(F: Monad<F>): DoF<F> {
  return {
    do: F.of({}),
    bind:
      <N extends string, R, E, A, Scope>(
        name: N extends keyof Scope
          ? { error: `binding name '${N}' already in use` }
          : N,
        fn: (_: Scope) => Kind<F, R, E, A>
      ) =>
      <R0, E0>(self: Kind<F, R0, E0, Scope>) =>
        pipe(
          self,
          F.chain((scope) =>
            pipe(
              fn(scope),
              F.map(
                (a) =>
                  ({ ...scope, [name as string]: a } as {
                    readonly [k in N | keyof Scope]: k extends keyof Scope
                      ? Scope[k]
                      : A
                  })
              )
            )
          )
        )
  }
}

export interface Validation<F extends HKT, E> extends HKT {
  readonly type: Kind<F, this["R"], E, this["A"]>
}

export function getValidation<F extends HKT, Z>(
  F: Monad<F> & Failable<F> & Eitherable<F>,
  S: Semigroup<Z>
) {
  return instance<Applicative<Validation<F, Z>>>({
    of: F.of,
    map: F.map,
    ap: (fa) => (fab) =>
      pipe(
        F.either(fa),
        F.chain((ea) =>
          pipe(
            F.either(fab),
            F.chain((efab) => {
              if (efab._tag === "Left" && ea._tag === "Left") {
                return F.fail(S.concat(ea.left, efab.left))
              } else if (ea._tag === "Left") {
                return F.fail(ea.left)
              } else if (efab._tag === "Left") {
                return F.fail(efab.left)
              } else {
                return F.of(efab.right(ea.right))
              }
            })
          )
        )
      )
  })
}

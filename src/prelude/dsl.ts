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

export function getZip<F extends HKT>(F: Applicative<F>) {
  return <R, E, A, R1, E1, A1>(fa: Kind<F, R, E, A>, fb: Kind<F, R1, E1, A1>) =>
    pipe(
      fb,
      F.map((a1) => (a: A) => [a, a1] as const),
      F.ap(fa)
    )
}

export function getValidation<F extends HKT>(
  M: Monad<F>,
  A: Applicative<F>,
  F: Failable<F>,
  E: Eitherable<F>
) {
  const zip = getZip(A)

  return <Z>(S: Semigroup<Z>) =>
    instance<Applicative<Validation<F, Z>>>({
      of: M.of,
      map: M.map,
      ap: (fa) => (fab) =>
        pipe(
          zip(E.either(fa), E.either(fab)),
          M.chain(([ea, efab]) => {
            if (efab._tag === "Left" && ea._tag === "Left") {
              return F.fail(S.concat(ea.left, efab.left))
            } else if (ea._tag === "Left") {
              return F.fail(ea.left)
            } else if (efab._tag === "Left") {
              return F.fail(efab.left)
            } else {
              return M.of(efab.right(ea.right))
            }
          })
        )
    })
}

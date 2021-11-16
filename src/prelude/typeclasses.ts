import type { Either } from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"

import type * as P from "./hkt.js"
import { instance } from "./utils.js"

export interface Functor<F extends P.HKT> extends P.Typeclass<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K extends F["$K"], R, E>(fa: P.Kind<F, K, R, E, A>) => P.Kind<F, K, R, E, B>
}

export interface Pointed<F extends P.HKT> extends Functor<F> {
  readonly of: <A>(a: A) => P.Kind<F, never, unknown, never, A>
}

export interface Apply<F extends P.HKT> extends Functor<F> {
  readonly ap: <K extends F["$K"], R, E1, A>(
    fa: P.Kind<F, K, R, E1, A>
  ) => <K1 extends F["$K"], R1, E, B>(
    fab: P.Kind<F, K1, R1, E, (a: A) => B>
  ) => P.Kind<F, K, R & R1, E | E1, B>
}

export function getApply<F extends P.HKT>(F: Monad<F>): Apply<F> {
  return instance({
    map: F.map,
    ap:
      <K1 extends F["$K"], R1, E1, A>(fa: P.Kind<F, K1, R1, E1, A>) =>
      <K2 extends F["$K"], R2, E, B>(fab: P.Kind<F, K2, R2, E, (a: A) => B>) =>
        pipe(
          fab,
          F.chain((f) =>
            pipe(
              fa,
              F.map((a) => f(a))
            )
          )
        )
  })
}

export interface Applicative<F extends P.HKT> extends Pointed<F>, Apply<F> {}

export function getApplicative<F extends P.HKT>(F: Monad<F>): Applicative<F> {
  return instance({
    ...getApply(F),
    of: F.of
  })
}

export interface Monad<F extends P.HKT> extends Pointed<F> {
  readonly chain: <A, K1 extends F["$K"], R1, E1, B>(
    f: (a: A) => P.Kind<F, K1, R1, E1, B>
  ) => <K extends F["$K"], R, E>(
    fa: P.Kind<F, K, R, E, A>
  ) => P.Kind<F, K1, R & R1, E | E1, B>
}

export interface Traversable<F extends P.HKT> extends P.Typeclass<F> {
  readonly traverse: <G extends P.HKT>(
    G: Applicative<G>
  ) => <A, B, KG extends G["$K"], RG, EG>(
    f: (a: A) => P.Kind<G, KG, RG, EG, B>
  ) => <KF extends F["$K"], RF, EF>(
    self: P.Kind<F, KF, RF, EF, A>
  ) => P.Kind<G, KG, RG, EG, P.Kind<F, KF, RF, EF, B>>
}

export interface Semigroup<A> {
  readonly concat: (left: A, right: A) => A
}

export interface Eitherable<F extends P.HKT> extends P.Typeclass<F> {
  readonly either: <K extends F["$K"], R, E, A>(
    fa: P.Kind<F, K, R, E, A>
  ) => P.Kind<F, K, R, never, Either<E, A>>
}

export interface Failable<F extends P.HKT> extends P.Typeclass<F> {
  readonly fail: <E>(fa: E) => P.Kind<F, never, unknown, E, never>
}

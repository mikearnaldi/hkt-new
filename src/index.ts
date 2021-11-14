import * as C from "@effect-ts/core/Collections/Immutable/Chunk"
import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as O from "@effect-ts/system/Option"

import * as P from "./prelude.js"

//
// Semigroup
//
export const SemigroupString = P.instance<P.Semigroup<string>>({
  concat: (a, b) => `${a}, ${b}`
})

//
// Identity
//
export interface Identity<A> {
  (a: A): A
}

export interface IdentityF extends P.HKT {
  readonly type: this["A"]
}

export const MonadIdentity = P.instance<P.Monad<IdentityF>>({
  of: (a) => a,
  map: (f) => (a) => f(a),
  chain: (f) => (a) => f(a)
})

//
// Option
//

export interface OptionF extends P.HKT {
  readonly type: O.Option<this["A"]>
}

export function optionT<F extends P.HKT>(F: P.Monad<F>) {
  return P.instance<P.Monad<P.ComposeF<F, OptionF>>>({
    of: (a) => F.of(O.some(a)),
    map: (f) => F.map(O.map(f)),
    chain: (f) => F.chain((o) => (o._tag === "None" ? F.of(O.none) : f(o.value)))
  })
}

export const MonadOption = optionT(MonadIdentity)

export const ApplicativeOption = P.getApplicative(MonadOption)

//
// Either
//

export interface EitherF extends P.HKT {
  readonly type: E.Either<this["E"], this["A"]>
}

export function eitherT<F extends P.HKT>(F: P.Monad<F>) {
  return P.instance<P.Monad<P.ComposeF<F, EitherF>>>({
    of: (a) => F.of(E.right(a)),
    map: (f) => F.map(E.map(f)),
    chain: <A, R1, E1, B>(
      f: (a: A) => P.Kind<F, R1, E1, E.Either<E1, B>>
    ): (<R, E>(
      fa: P.Kind<F, R, E, E.Either<E, A>>
    ) => P.Kind<F, R & R1, E1 | E, E.Either<E1 | E, B>>) =>
      F.chain(
        E.fold(
          (e) => F.of(E.leftW<E1 | typeof e, B>(e)),
          (a) => f(a)
        )
      )
  })
}

export const MonadEither = eitherT(MonadIdentity)

export const ApplicativeEither = P.getApplicative(MonadEither)

export const FailableEither = P.instance<P.Failable<EitherF>>({
  fail: E.left
})

export const EitherableEither = P.instance<P.Eitherable<EitherF>>({
  either: E.right
})

export const getValidationEither = P.getValidation(
  MonadEither,
  ApplicativeEither,
  FailableEither,
  EitherableEither
)

//
// Chunk
//

export interface ChunkF extends P.HKT {
  readonly type: C.Chunk<this["A"]>
}

export const TraversableChunk = P.instance<P.Traversable<ChunkF>>({
  traverse:
    <G extends P.HKT>(G: P.Applicative<G>) =>
    <A, RG, B, EG>(f: (a: A) => P.Kind<G, RG, EG, B>) =>
    (self: C.Chunk<A>) =>
      C.reduce_<A, P.Kind<G, RG, EG, C.Chunk<B>>>(self, G.of(C.empty()), (fbs, a) =>
        pipe(
          fbs,
          G.map((bs) => (b: B) => C.append_(bs, b)),
          G.ap(f(a))
        )
      )
})

export const MonadChunk = P.instance<P.Monad<ChunkF>>({
  of: C.single,
  map: C.map,
  chain: C.chain
})

export function chunkT<F extends P.HKT>(F: P.Monad<F>) {
  const traverse = TraversableChunk.traverse(P.getApplicative(F))
  return P.instance<P.Monad<P.ComposeF<F, ChunkF>>>({
    of: (a) => F.of(C.single(a)),
    map: (f) => F.map(C.map(f)),
    chain: (f) => (fa) => pipe(fa, F.chain(traverse(f)), F.map(C.flatten))
  })
}

export const CEO = pipe(MonadChunk, eitherT, optionT, (monad) =>
  P.intersect(monad, P.getDo(monad))
)

export const res = pipe(
  CEO.do,
  CEO.bind("a", () => C.single(E.right(O.some(1)))),
  CEO.bind("b", () => C.single(E.right(O.some(2)))),
  CEO.bind("c", ({ a, b }) => C.single(E.right(O.some(a + b)))),
  CEO.map(({ c }) => c)
)

//
// Effect
//

export interface EffectF extends P.HKT {
  readonly type: T.Effect<this["R"], this["E"], this["A"]>
}

export const MonadEffect = P.instance<P.Monad<EffectF>>({
  of: T.succeed,
  map: T.map,
  chain: T.chain
})

export const ApplicativeEffect = P.getApplicative(MonadEffect)

export const ApplicativeEffectPar = P.instance<P.Applicative<EffectF>>({
  of: T.succeed,
  map: T.map,
  ap: (fa) => (fab) => T.zipWithPar_(fa, fab, (a, f) => f(a))
})

export const FailableEffect = P.instance<P.Failable<EffectF>>({
  fail: T.fail
})

export const EitherableEffect = P.instance<P.Eitherable<EffectF>>({
  either: T.either
})

export const getValidationEffect = P.getValidation(
  MonadEffect,
  ApplicativeEffect,
  FailableEffect,
  EitherableEffect
)

export const getValidationEffectPar = P.getValidation(
  MonadEffect,
  ApplicativeEffectPar,
  FailableEffect,
  EitherableEffect
)

//
// Reader
//

export interface Reader<R, A> {
  (r: R): A
}

export interface ReaderF extends P.HKT {
  readonly type: Reader<this["R"], this["A"]>
}

export function readerT<F>(F: P.Monad<F>) {
  return P.instance<P.Monad<P.ComposeF<ReaderF, F>>>({
    of: (a) => () => F.of(a),
    map: (f) => (fa) => (r) => pipe(fa(r), F.map(f)),
    chain: (f) => (fa) => (r) =>
      pipe(
        fa(r),
        F.chain((a) => f(a)(r))
      )
  })
}

export const RO = pipe(readerT(MonadOption), (monad) =>
  P.intersect(monad, P.getDo(monad), P.getApplicative(monad))
)

export interface EnvX {
  x: number
}

export interface EnvY {
  y: number
}

export const program = pipe(
  RO.do,
  RO.bind("a", () => (r: EnvX) => O.some(r.x)),
  RO.bind("b", () => (r: EnvY) => O.some(r.y)),
  RO.map(({ a, b }) => a + b)
)

//
// Validation Traversal
//

export const validatedEither = pipe(
  C.many(0, 1, 2, 3),
  TraversableChunk.traverse(getValidationEither(SemigroupString))((n) =>
    n % 2 === 0 ? E.right(n) : E.left(`${n} is not even`)
  )
)

export const validatedEffect = pipe(
  C.many(0, 1, 2, 3),
  TraversableChunk.traverse(getValidationEffect(SemigroupString))((n) =>
    n % 2 === 0 ? T.access((_: { r: number }) => n + _.r) : T.fail(`${n} is not even`)
  )
)

export const validatedEffectPar = pipe(
  C.many(0, 1, 2, 3),
  TraversableChunk.traverse(getValidationEffectPar(SemigroupString))((n) =>
    n % 2 === 0 ? T.access((_: { r: number }) => n + _.r) : T.fail(`${n} is not even`)
  )
)

import { Variance } from "./variance.js"

export declare const URI: unique symbol

export interface Typeclass<F extends HKT> {
  readonly [URI]: F
}

export interface HKT {
  readonly R?: unknown
  readonly E?: unknown
  readonly A?: unknown
  readonly variance: {
    readonly R: Variance
    readonly E: Variance
    readonly A: Variance
  }
  readonly type?: unknown
}

export type Kind<F extends HKT, R, E, A> = F extends { readonly type: unknown }
  ? (F & {
      readonly R: R
      readonly E: E
      readonly A: A
    })["type"]
  : 'Error'
  //   {
  //     readonly _F: F
  //     readonly _R: (_: R) => void
  //     readonly _E: () => E
  //     readonly _A: () => A
  //   }

export interface ComposeF<F extends HKT, G extends HKT> extends HKT {
  readonly type: Kind<F, this["R"], this["E"], Kind<G, this["R"], this["E"], this["A"]>>
}

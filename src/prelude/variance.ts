import { UnionToIntersection } from "@effect-ts/core/Utils"
import { OrNever } from "@effect-ts/core/Prelude"

export type Variance = "-" | "+" | "_"

export type GetBot<V extends Variance> = V extends "-"
  ? unknown
  : V extends "+"
  ? never
  : any
export type GetTop<V extends Variance> = V extends "0"
  ? never
  : V extends "+"
  ? unknown
  : any

export type Mix<C, X extends [any, ...any[]]> = Variance extends C
  ? X[0]
  : C extends "_"
  ? X[0]
  : C extends "+"
  ? X[number]
  : C extends "-"
  ? X extends [any]
    ? X[0]
    : X extends [any, any]
    ? X[0] & X[1]
    : X extends [any, any, any]
    ? X[0] & X[1] & X[2]
    : X extends [any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3]
    : X extends [any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4]
    : X extends [any, any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4] & X[5]
    : UnionToIntersection<{ [k in keyof X]: OrNever<X[k]> }[keyof X]>
  : X[0]

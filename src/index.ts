import '@effect-ts/core/Tracing/Enable'
import * as T from '@effect-ts/core/Effect'
import { runMain } from '@effect-ts/node/Runtime'
import { pipe } from '@effect-ts/core/Function'

const program = T.gen(function* ($) {
  yield* $(T.succeedWith(() => console.log('hello world')))

  const result = yield* $(pipe(
    T.succeed(1),
    T.map(_ => _ * 2),
    T.map(_ => _ * 3) ,
  ))

  yield* $(T.succeedWith(() => console.log({ result })))
})

runMain(program)

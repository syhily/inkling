import 'should'

declare module 'should' {
  interface Assertion {
    prettifyTo(expected: string): Promise<void>
  }
}

declare namespace should {
  interface Assertion {
    prettifyTo(expected: string): Promise<void>
  }
}

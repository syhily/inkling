declare namespace should {
  interface Assertion {
    prettifyTo(expected: string): Promise<void>
  }
}

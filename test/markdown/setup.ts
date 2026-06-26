import should from 'should'

const shouldModule = should as unknown as { noConflict(): typeof should; extend(): void }
Object.defineProperty(globalThis, 'should', {
  value: shouldModule.noConflict(),
  writable: true,
  configurable: true,
})
shouldModule.extend()

import should from 'should'

// should extends Object.prototype; make it a global like the old
// test/utils/overrides.ts did, so test files can use `.should.equal()` etc.
const shouldModule = should as unknown as { noConflict(): typeof should; extend(): void }
Object.defineProperty(globalThis, 'should', {
  value: shouldModule.noConflict(),
  writable: true,
  configurable: true,
})
shouldModule.extend()

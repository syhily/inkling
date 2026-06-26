import { bytesToSize, sizeToBytes } from '@/nodes/base/utils/size-byte-converter'

describe('Utils: size-byte-converter', function () {
  describe('sizeToBytes', function () {
    it('converts sizes to bytes', function () {
      sizeToBytes('0 Bytes').should.equal(0)
      sizeToBytes('1 Bytes').should.equal(1)
      sizeToBytes('1 KB').should.equal(1024)
      sizeToBytes('1 MB').should.equal(1048576)
      sizeToBytes('1 GB').should.equal(1073741824)
      sizeToBytes('1 TB').should.equal(1099511627776)
    })

    it('rounds to nearest byte', function () {
      sizeToBytes('1.5 KB').should.equal(1536)
    })

    it('returns 0 for empty or unknown input', function () {
      sizeToBytes('').should.equal(0)
      sizeToBytes('10 Unknown').should.equal(0)
    })
  })

  describe('bytesToSize', function () {
    it('converts bytes to human-readable sizes', function () {
      bytesToSize(0).should.equal('0 Byte')
      bytesToSize(1).should.equal('1 Bytes')
      bytesToSize(1024).should.equal('1 KB')
      bytesToSize(1048576).should.equal('1 MB')
      bytesToSize(1073741824).should.equal('1 GB')
    })

    it('rounds to nearest whole unit', function () {
      bytesToSize(1536).should.equal('2 KB')
    })
  })
})

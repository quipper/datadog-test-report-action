import assert from 'assert'
import { XMLParser } from 'fast-xml-parser'

export type JunitXml = {
  testsuites?: {
    testsuite?: TestSuite[]
  }
  testsuite?: TestSuite[]
}

function assertJunitXml(x: unknown): asserts x is JunitXml {
  assert(typeof x === 'object')
  assert(x != null)

  if ('testsuites' in x) {
    assert(typeof x.testsuites === 'object')
    assert(x.testsuites != null)

    if ('testsuite' in x.testsuites) {
      assert(Array.isArray(x.testsuites.testsuite))
      for (const testsuite of x.testsuites.testsuite) {
        assertTestSuite(testsuite)
      }
    }
  }

  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite))
    for (const testsuite of x.testsuite) {
      assertTestSuite(testsuite)
    }
  }
}

export type TestSuite = {
  '@_name': string
  '@_time': number
  testsuite?: TestSuite[]
  testcase?: TestCase[]
}

function assertTestSuite(x: unknown): asserts x is TestSuite {
  assert(typeof x === 'object')
  assert(x != null)
  assert('@_name' in x)
  assert(typeof x['@_name'] === 'string')
  assert('@_time' in x)
  assert(typeof x['@_time'] === 'number')

  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite))
    for (const testsuite of x.testsuite) {
      assertTestSuite(testsuite)
    }
  }
  if ('testcase' in x) {
    assert(Array.isArray(x.testcase))
    for (const testcase of x.testcase) {
      assertTestCase(testcase)
    }
  }
}

export type TestCase = {
  '@_name': string
  '@_time': number
  '@_classname'?: string
  '@_file'?: string
  failure?: {
    '@_message'?: string
  }
}

function assertTestCase(x: unknown): asserts x is TestCase {
  assert(typeof x === 'object')
  assert(x != null)
  assert('@_name' in x)
  assert(typeof x['@_name'] === 'string')
  assert('@_time' in x)
  assert(typeof x['@_time'] === 'number')

  if ('@_classname' in x) {
    assert(typeof x['@_classname'] === 'string')
  }
  if ('@_file' in x) {
    assert(typeof x['@_file'] === 'string')
  }
  if ('failure' in x) {
    assert(typeof x.failure === 'object')
    assert(x.failure != null)
    if ('@_message' in x.failure) {
      assert(typeof x.failure['@_message'] === 'string')
    }
  }
}

export const parseJunitXml = (xml: string | Buffer): JunitXml => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    isArray: (_: string, jPath: string): boolean => {
      const elementName = jPath.split('.').pop()
      return ['testsuite', 'testcase'].includes(elementName ?? '')
    },
    attributeValueProcessor: (attrName: string, attrValue: string, jPath: string) => {
      const elementName = jPath.split('.').pop()
      if (attrName === 'time' && ['testsuites', 'testsuite', 'testcase'].includes(elementName ?? '')) {
        return Number(attrValue)
      }
      return attrValue
    },
  })
  const parsed: unknown = parser.parse(xml)
  assertJunitXml(parsed)
  return parsed
}

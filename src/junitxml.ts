import assert from 'assert'
import { XMLParser } from 'fast-xml-parser'

export type JunitXml = {
  testsuites?: {
    testsuite?: TestSuite[]
  }
  testsuite?: TestSuite[]
}

function assertJunitXml(x: unknown): asserts x is JunitXml {
  assert(typeof x === 'object', 'root document must be an object')
  assert(x != null, 'root document must not be null')

  if ('testsuites' in x) {
    assert(typeof x.testsuites === 'object', 'testsuites must be an object')
    assert(x.testsuites != null, 'testsuites must not be null')

    if ('testsuite' in x.testsuites) {
      assert(Array.isArray(x.testsuites.testsuite), 'testsuite must be an array')
      for (const testsuite of x.testsuites.testsuite) {
        assertTestSuite(testsuite)
      }
    }
  }

  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite), 'testsuite must be an array')
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
  assert(typeof x === 'object', 'testsuite must be an object')
  assert(x != null, 'testsuite must not be null')
  assert('@_name' in x, 'testsuite must have name attribute')
  assert(typeof x['@_name'] === 'string', 'name attribute must be a string')
  assert('@_time' in x, 'testsuite must have time attribute')
  assert(typeof x['@_time'] === 'number', 'time attribute must be a number')

  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite), 'testsuite must be an array')
    for (const testsuite of x.testsuite) {
      assertTestSuite(testsuite)
    }
  }
  if ('testcase' in x) {
    assert(Array.isArray(x.testcase), 'testcase must be an array')
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
  error?: {
    '@_message'?: string
  }
}

function assertTestCase(x: unknown): asserts x is TestCase {
  assert(typeof x === 'object', 'testcase must be an object')
  assert(x != null, 'testcase must not be null')
  assert('@_name' in x, 'testcase must have name attribute')
  assert(typeof x['@_name'] === 'string', 'name attribute must be a string')
  assert('@_time' in x, 'testcase must have time attribute')
  assert(typeof x['@_time'] === 'number', 'time attribute must be a number')

  if ('@_classname' in x) {
    assert(typeof x['@_classname'] === 'string', 'classname attribute must be a string')
  }
  if ('@_file' in x) {
    assert(typeof x['@_file'] === 'string', 'file attribute must be a string')
  }
  if ('failure' in x) {
    assert(typeof x.failure === 'object', 'failure must be an object')
    assert(x.failure != null, 'failure must not be null')
    if ('@_message' in x.failure) {
      assert(typeof x.failure['@_message'] === 'string', 'message attribute of failure element must be a string')
    }
  }
  if ('error' in x) {
    assert(typeof x.error === 'object', 'error must be an object')
    assert(x.error != null, 'error must not be null')
    if ('@_message' in x.error) {
      assert(typeof x.error['@_message'] === 'string', 'message attribute of error element must be a string')
    }
  }
}

export const parseJunitXml = (xml: string | Buffer): JunitXml => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    alwaysCreateTextNode: true,
    isArray: (_: string, jPath: string): boolean => {
      const elementName = jPath.split('.').pop()
      return elementName === 'testsuite' || elementName === 'testcase'
    },
    attributeValueProcessor: (attrName: string, attrValue: string, jPath: string) => {
      const elementName = jPath.split('.').pop()
      if (
        attrName === 'time' &&
        (elementName === 'testsuites' || elementName === 'testsuite' || elementName === 'testcase')
      ) {
        return Number(attrValue)
      }
      return attrValue
    },
  })
  const parsedXml: unknown = parser.parse(xml)
  assertJunitXml(parsedXml)
  return parsedXml
}

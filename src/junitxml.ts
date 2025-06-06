import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { XMLParser } from 'fast-xml-parser'

export type TestReport = {
  testFiles: TestFile[]
  testCases: TestCase[]
}

export type TestFile = {
  filename: string
  owners: string[]
  totalTime: number
  totalTestCases: number
}

export type FindOwners = (filename: string) => string[]

export const parseTestReportFiles = async (testReportFiles: string[], findOwners: FindOwners): Promise<TestReport> => {
  const junitXmls = await parseTestReportFilesToJunitXml(testReportFiles)
  const allTestCases: TestCase[] = []
  for (const junitXml of junitXmls) {
    const testCases = findTestCasesFromJunitXml(junitXml, findOwners)
    allTestCases.push(...testCases)
  }
  core.info(`Found ${allTestCases.length} test cases in the test reports`)
  const testFiles = groupTestCasesByTestFile(allTestCases)
  return {
    testFiles,
    testCases: allTestCases,
  }
}

export const groupTestCasesByTestFile = (testCases: TestCase[]): TestFile[] => {
  const testFiles = new Map<string, TestFile>()
  for (const testCase of testCases) {
    const currentTestFile = testFiles.get(testCase.filename) ?? {
      filename: testCase.filename,
      owners: testCase.owners,
      totalTime: 0,
      totalTestCases: 0,
    }
    currentTestFile.totalTime += testCase.time
    currentTestFile.totalTestCases++
    testFiles.set(testCase.filename, currentTestFile)
  }
  return [...testFiles.values()]
}

export type TestCase = {
  name: string
  filename: string
  owners: string[]
  time: number
  success: boolean
}

export const findTestCasesFromJunitXml = (junitXml: JunitXml, findOwners: FindOwners): TestCase[] => {
  const root = junitXml.testsuites?.testsuite ?? junitXml.testsuite ?? []

  function* visit(testSuite: JunitXmlTestSuite): Generator<TestCase> {
    const determineTestCaseFilename = (junitXmlTestCase: JunitXmlTestCase): string => {
      if (junitXmlTestCase['@_file']) {
        return junitXmlTestCase['@_file']
      }
      // For Mocha or Cypress, the first <testsuite> element has the filename of the root suite.
      const mochaRootSuiteFilename = root.at(0)?.['@_file']
      if (mochaRootSuiteFilename) {
        return mochaRootSuiteFilename
      }
      throw new Error(`Element <testcase> must have "file" attribute (name=${junitXmlTestCase['@_name']})`)
    }

    for (const junitXmlTestCase of testSuite.testcase ?? []) {
      const filename = path.normalize(determineTestCaseFilename(junitXmlTestCase))
      yield {
        name: junitXmlTestCase['@_name'],
        filename,
        owners: findOwners(filename),
        time: junitXmlTestCase['@_time'],
        success: !junitXmlTestCase.failure && !junitXmlTestCase.error,
      }
    }
    for (const nestedTestSuite of testSuite.testsuite ?? []) {
      visit(nestedTestSuite)
    }
  }

  const testCases: TestCase[] = []
  for (const testSuite of root) {
    for (const testCase of visit(testSuite)) {
      testCases.push(testCase)
    }
  }
  return testCases
}

const parseTestReportFilesToJunitXml = async (testReportFiles: string[]): Promise<JunitXml[]> => {
  const junitXmls: JunitXml[] = []
  core.startGroup(`Parsing ${testReportFiles.length} test report files`)
  for (const testReportFile of testReportFiles) {
    core.info(`Parsing the test report: ${testReportFile}`)
    const xml = await fs.readFile(testReportFile)
    const junitXml = parseJunitXml(xml)
    junitXmls.push(junitXml)
  }
  core.endGroup()
  return junitXmls
}

type JunitXml = {
  testsuites?: {
    testsuite?: JunitXmlTestSuite[]
  }
  testsuite?: JunitXmlTestSuite[]
}

function assertJunitXml(x: unknown): asserts x is JunitXml {
  assert(typeof x === 'object', 'Root document must be an object')
  assert(x != null, 'Root document must not be null')

  if ('testsuites' in x) {
    assert(typeof x.testsuites === 'object', 'Element <testsuites> must be an object')
    assert(x.testsuites != null, 'Element <testsuites> must not be null')

    if ('testsuite' in x.testsuites) {
      assert(Array.isArray(x.testsuites.testsuite), 'Element <testsuite> must be an array')
      for (const testsuite of x.testsuites.testsuite) {
        assertTestSuite(testsuite)
      }
    }
  }

  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite), 'Element <testsuite> must be an array')
    for (const testsuite of x.testsuite) {
      assertTestSuite(testsuite)
    }
  }
}

type JunitXmlTestSuite = {
  testsuite?: JunitXmlTestSuite[]
  testcase?: JunitXmlTestCase[]
  '@_file'?: string
}

function assertTestSuite(x: unknown): asserts x is JunitXmlTestSuite {
  assert(typeof x === 'object', 'Element <testsuite> must be an object')
  assert(x != null, 'Element <testsuite> must not be null')
  if ('testsuite' in x) {
    assert(Array.isArray(x.testsuite), 'Element <testsuite> must be an array')
    for (const testsuite of x.testsuite) {
      assertTestSuite(testsuite)
    }
  }
  if ('testcase' in x) {
    assert(Array.isArray(x.testcase), 'Element <testcase> must be an array')
    for (const testcase of x.testcase) {
      assertTestCase(testcase)
    }
  }
}

type JunitXmlTestCase = {
  '@_name': string
  '@_time': number
  '@_file'?: string
  failure?:
    | string
    | {
        '@_message'?: string
      }
  error?:
    | string
    | {
        '@_message'?: string
      }
}

function assertTestCase(x: unknown): asserts x is JunitXmlTestCase {
  assert(typeof x === 'object', `Element <testcase> must be an object but was ${typeof x}`)
  assert(x != null, 'Element <testcase> must not be null')
  assert('@_name' in x, 'Element <testcase> must have "name" attribute')
  assert(typeof x['@_name'] === 'string', `name attribute of <testcase> must be a string but was ${typeof x['@_name']}`)
  assert('@_time' in x, 'Element <testcase> must have "time" attribute')
  assert(typeof x['@_time'] === 'number', `time attribute of <testcase> must be a number but was ${typeof x['@_time']}`)
  if ('@_file' in x) {
    assert(
      typeof x['@_file'] === 'string',
      `file attribute of <testcase> must be a string but was ${typeof x['@_file']}`,
    )
  }
  if ('failure' in x) {
    assert(
      typeof x.failure === 'string' || typeof x.failure === 'object',
      `Element <failure> must be a string or an object but was ${typeof x.failure}`,
    )
    if (typeof x.failure === 'object' && x.failure != null) {
      assert('@_message' in x.failure, 'Element <failure> must have "message" attribute')
      assert(
        typeof x.failure['@_message'] === 'string',
        `message attribute of <failure> must be a string but was ${typeof x.failure['@_message']}`,
      )
    }
  }
  if ('error' in x) {
    assert(
      typeof x.error === 'string' || typeof x.error === 'object',
      `Element <error> must be a string or an object but was ${typeof x.error}`,
    )
    if (typeof x.error === 'object' && x.error != null) {
      assert('@_message' in x.error, 'Element <error> must have "message" attribute')
      assert(
        typeof x.error['@_message'] === 'string',
        `message attribute of <error> must be a string but was ${typeof x.error['@_message']}`,
      )
    }
  }
}

export const parseJunitXml = (xml: string | Buffer): JunitXml => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    isArray: (_: string, jPath: string): boolean => {
      const elementName = jPath.split('.').pop()
      return elementName === 'testsuite' || elementName === 'testcase'
    },
    attributeValueProcessor: (attrName: string, attrValue: string, jPath: string) => {
      const elementName = jPath.split('.').pop()
      if (
        (elementName === 'testsuites' || elementName === 'testsuite' || elementName === 'testcase') &&
        attrName === 'time'
      ) {
        return Number(attrValue)
      }
      return attrValue
    },
  })
  const parsed: unknown = parser.parse(xml)
  assertJunitXml(parsed)
  return parsed
}

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findTestCasesFromJunitXml,
  groupTestCasesByTestFile,
  parseJunitXml,
  parseTestReportFiles,
  type TestCase,
  type TestReport,
} from '../src/junitxml.js'

describe('parseTestReportFiles', () => {
  it('should parse rspec.xml', async () => {
    const testReportFiles = [path.join(__dirname, 'fixtures/rspec1.xml'), path.join(__dirname, 'fixtures/rspec2.xml')]
    const testReport = await parseTestReportFiles(testReportFiles, () => [])
    expect(testReport).toEqual<TestReport>({
      testFiles: [
        { filename: 'spec/a_spec.rb', totalTime: 3, totalTestCases: 2, owners: [] },
        { filename: 'spec/b_spec.rb', totalTime: 12, totalTestCases: 3, owners: [] },
        { filename: 'spec/c_spec.rb', totalTime: 13, totalTestCases: 2, owners: [] },
      ],
      testCases: [
        { name: 'a1', filename: 'spec/a_spec.rb', time: 1, success: true, owners: [] },
        { name: 'a2', filename: 'spec/a_spec.rb', time: 2, success: true, owners: [] },
        { name: 'b1', filename: 'spec/b_spec.rb', time: 3, success: true, owners: [] },
        { name: 'b2', filename: 'spec/b_spec.rb', time: 4, success: true, owners: [] },
        { name: 'b3', filename: 'spec/b_spec.rb', time: 5, success: true, owners: [] },
        { name: 'c1', filename: 'spec/c_spec.rb', time: 6, success: true, owners: [] },
        { name: 'c2', filename: 'spec/c_spec.rb', time: 7, success: true, owners: [] },
      ],
    })
  })

  it('should parse cypress.xml', async () => {
    const testReportFiles = [
      path.join(__dirname, 'fixtures/cypress1.xml'),
      path.join(__dirname, 'fixtures/cypress2.xml'),
    ]
    const testReport = await parseTestReportFiles(testReportFiles, () => [])
    expect(testReport).toEqual<TestReport>({
      testFiles: [
        { filename: 'cypress/a_spec.ts', totalTime: 6, totalTestCases: 3, owners: [] },
        { filename: 'cypress/b_spec.ts', totalTime: 4, totalTestCases: 1, owners: [] },
      ],
      testCases: [
        { name: 'Test 1', filename: 'cypress/a_spec.ts', time: 1, success: true, owners: [] },
        { name: 'Test 2', filename: 'cypress/a_spec.ts', time: 2, success: true, owners: [] },
        { name: 'Test 1', filename: 'cypress/a_spec.ts', time: 3, success: true, owners: [] },
        { name: 'Test 1', filename: 'cypress/b_spec.ts', time: 4, success: true, owners: [] },
      ],
    })
  })

  // The fixture is the output of the Playwright JUnit reporter with includeRetries: true.
  // It was edited to add the "file" attributes, because Playwright does not emit them.
  it('should parse the Playwright report with retries', async () => {
    const testReportFiles = [path.join(__dirname, 'fixtures/playwright-retries.xml')]
    const testReport = await parseTestReportFiles(testReportFiles, () => [])
    expect(testReport.testCases).toEqual<TestCase[]>([
      { name: 'passes', filename: 'a/smoke.spec.mjs', time: 0.003, success: true, owners: [] },
      {
        name: 'flaky one',
        filename: 'a/smoke.spec.mjs',
        time: 0.003,
        success: true,
        owners: [],
        flakyFailureMessage: 'expect(received).toBe(expected) // Object.is equality',
      },
      {
        name: 'always fails',
        filename: 'a/smoke.spec.mjs',
        time: 0.001,
        success: false,
        owners: [],
        failureMessage: 'expect(received).toBe(expected) // Object.is equality',
      },
      { name: 'passes too', filename: 'b/smoke.spec.mjs', time: 0.003, success: true, owners: [] },
    ])
  })

  it('should parse playwright-skipped.xml excluding skipped test cases', async () => {
    // Playwright does not emit the "file" attribute, so this test copies "classname" to "file".
    const xml = await fs.readFile(path.join(__dirname, 'fixtures/playwright-skipped.xml'), 'utf-8')
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'junitxml-test-'))
    try {
      const testReportFile = path.join(tempDir, 'playwright.xml')
      await fs.writeFile(testReportFile, xml.replace(/classname="([^"]+)"/g, 'classname="$1" file="$1"'))
      const testReport = await parseTestReportFiles([testReportFile], () => [])
      expect(testReport).toEqual<TestReport>({
        testFiles: [
          { filename: 'a/smoke.spec.mjs', totalTime: expect.closeTo(0.015), totalTestCases: 3, owners: [] },
          { filename: 'b/smoke.spec.mjs', totalTime: 0.003, totalTestCases: 1, owners: [] },
        ],
        testCases: [
          { name: 'passes', filename: 'a/smoke.spec.mjs', time: 0.003, success: true, owners: [] },
          { name: 'flaky one', filename: 'a/smoke.spec.mjs', time: 0.005, success: true, owners: [] },
          {
            name: 'always fails',
            filename: 'a/smoke.spec.mjs',
            time: 0.007,
            success: false,
            owners: [],
            failureMessage: 'expect(received).toBe(expected) // Object.is equality',
          },
          { name: 'passes too', filename: 'b/smoke.spec.mjs', time: 0.003, success: true, owners: [] },
        ],
      })
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })
})

describe('parseJunitXml', () => {
  it('parses fixture.xml', async () => {
    const xml = await fs.readFile(path.join(__dirname, 'fixtures/fixture.xml'))
    expect(() => parseJunitXml(xml)).not.toThrow()
  })

  it('parses <failure> element with text node', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <failure>Stack trace</failure>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.failure).toStrictEqual('Stack trace')
  })

  it('parses <failure> element with message attribute', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <failure message="Test failed"></failure>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.failure).toStrictEqual({
      '@_message': 'Test failed',
    })
  })

  it('parses <failure> element with message attribute and text node', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <failure message="Test failed">Stack trace</failure>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.failure).toStrictEqual({
      '@_message': 'Test failed',
      '#text': 'Stack trace',
    })
  })

  it('parses XML with more than 1000 standard entity references', () => {
    const name = 'a &quot;quoted&quot; name'
    const testcases = Array.from(
      { length: 1000 },
      (_, i) => `<testcase name="${name} ${i}" time="1" file="file1"></testcase>`,
    ).join('\n')
    const xml = `<testsuite>${testcases}</testsuite>`

    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase).toHaveLength(1000)
  })

  it('parses <failure> elements with text node', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <failure>Stack trace</failure>
          <failure>Another</failure>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.failure).toStrictEqual(['Stack trace', 'Another'])
  })

  it('parses <flakyFailure> element with message attribute and stackTrace child element', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <flakyFailure message="Test failed" type="expect.toBe" time="0.002">
            <stackTrace><![CDATA[Error: Test failed]]></stackTrace>
          </flakyFailure>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.flakyFailure).toStrictEqual({
      '@_message': 'Test failed',
    })
  })

  it('parses <flakyError> element with message attribute', () => {
    const xml = `
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <flakyError message="Test errored" type="Error" time="0.002"></flakyError>
        </testcase>
      </testsuite>
    `
    const junitXml = parseJunitXml(xml)
    expect(junitXml.testsuite?.at(0)?.testcase?.at(0)?.flakyError).toStrictEqual({
      '@_message': 'Test errored',
    })
  })
})

describe('findTestCasesFromJunitXml', () => {
  it('should return test cases', () => {
    const junitXml = {
      testsuite: [
        {
          testcase: [
            { '@_name': 'test1', '@_time': 1, '@_file': 'file1' },
            { '@_name': 'test2', '@_time': 2, '@_file': 'file2' },
            { '@_name': 'test3', '@_time': 3, '@_file': 'file1' },
          ],
        },
        {
          testcase: [
            { '@_name': 'test4', '@_time': 4, '@_file': 'file2' },
            { '@_name': 'test5', '@_time': 5, '@_file': 'file3' },
          ],
        },
      ],
    }
    expect(findTestCasesFromJunitXml(junitXml, () => [])).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true, owners: [] },
      { name: 'test2', filename: 'file2', time: 2, success: true, owners: [] },
      { name: 'test3', filename: 'file1', time: 3, success: true, owners: [] },
      { name: 'test4', filename: 'file2', time: 4, success: true, owners: [] },
      { name: 'test5', filename: 'file3', time: 5, success: true, owners: [] },
    ])
  })

  it('should normalize file paths', () => {
    const junitXml = {
      testsuite: [
        {
          testcase: [
            { '@_name': 'test1', '@_time': 1, '@_file': 'file1' },
            { '@_name': 'test2', '@_time': 2, '@_file': './file2' },
            { '@_name': 'test3', '@_time': 3, '@_file': './file1' },
          ],
        },
      ],
    }
    expect(findTestCasesFromJunitXml(junitXml, () => [])).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true, owners: [] },
      { name: 'test2', filename: 'file2', time: 2, success: true, owners: [] },
      { name: 'test3', filename: 'file1', time: 3, success: true, owners: [] },
    ])
  })

  it('should exclude skipped test cases', () => {
    const junitXml = parseJunitXml(`
      <testsuite>
        <testcase name="test1" time="1" file="file1"></testcase>
        <testcase name="test2" file="file1"><skipped/></testcase>
        <testcase name="test3" file="file1"><skipped>
        </skipped></testcase>
        <testcase name="test4" file="file1"><skipped message="Not implemented"/></testcase>
      </testsuite>
    `)
    expect(findTestCasesFromJunitXml(junitXml, () => [])).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true, owners: [] },
    ])
  })

  it('should exclude a skipped test case even if it has time', () => {
    const junitXml = parseJunitXml(`
      <testsuite>
        <testcase name="test1" time="1" file="file1"></testcase>
        <testcase name="test2" time="0" file="file1"><skipped/></testcase>
      </testsuite>
    `)
    expect(findTestCasesFromJunitXml(junitXml, () => [])).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true, owners: [] },
    ])
  })

  it('should keep a skipped test case as a failure if it has a failure', () => {
    const junitXml = parseJunitXml(`
      <testsuite>
        <testcase name="test1" time="1" file="file1">
          <skipped/>
          <failure message="Test failed"/>
        </testcase>
      </testsuite>
    `)
    expect(findTestCasesFromJunitXml(junitXml, () => [])).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: false, owners: [], failureMessage: 'Test failed' },
    ])
  })

  it('should throw an error if a test case without skipped has no time', () => {
    const junitXml = parseJunitXml(`
      <testsuite>
        <testcase name="test1" file="file1"></testcase>
      </testsuite>
    `)
    expect(() => findTestCasesFromJunitXml(junitXml, () => [])).toThrow(
      'Element <testcase> must have "time" attribute (name=test1)',
    )
  })
})

describe('findTestCasesFromJunitXml with retries', () => {
  const findTestCase = (testCaseXml: string): TestCase | undefined => {
    const junitXml = parseJunitXml(`<testsuite>${testCaseXml}</testsuite>`)
    return findTestCasesFromJunitXml(junitXml, () => []).at(0)
  }

  it('returns the message of <flakyFailure> for a test case passed on a retry', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyFailure message="Flaky failure"></flakyFailure>
      </testcase>
    `)
    expect(testCase).toEqual<TestCase>({
      name: 'test1',
      filename: 'file1',
      time: 1,
      success: true,
      owners: [],
      flakyFailureMessage: 'Flaky failure',
    })
  })

  it('returns the message of <flakyError> for a test case passed on a retry', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyError message="Flaky error"></flakyError>
      </testcase>
    `)
    expect(testCase).toEqual<TestCase>({
      name: 'test1',
      filename: 'file1',
      time: 1,
      success: true,
      owners: [],
      flakyFailureMessage: 'Flaky error',
    })
  })

  it('returns the message of the first <flakyFailure> if both <flakyFailure> and <flakyError> exist', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyError message="Flaky error"></flakyError>
        <flakyFailure message="Flaky failure 1"></flakyFailure>
        <flakyFailure message="Flaky failure 2"></flakyFailure>
      </testcase>
    `)
    expect(testCase?.flakyFailureMessage).toBe('Flaky failure 1')
  })

  it('returns an empty message if <flakyFailure> has no message', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyFailure type="Error"></flakyFailure>
      </testcase>
    `)
    expect(testCase?.flakyFailureMessage).toBe('')
  })

  it('does not return the flaky failure message for a test case failed on all retries', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyFailure message="Flaky failure"></flakyFailure>
        <failure message="Failure"></failure>
      </testcase>
    `)
    expect(testCase?.success).toBe(false)
    expect(testCase?.failureMessage).toBe('Failure')
    expect(testCase).not.toHaveProperty('flakyFailureMessage')
  })

  it('ignores malformed <flakyFailure> elements instead of failing the report', () => {
    const testCase = findTestCase(`
      <testcase name="test1" time="1" file="file1">
        <flakyFailure message="Flaky failure">Stack trace</flakyFailure>
        <flakyFailure>Stack trace</flakyFailure>
      </testcase>
    `)
    expect(testCase?.success).toBe(true)
    expect(testCase).not.toHaveProperty('flakyFailureMessage')
  })

  it('does not return the flaky failure message for a test case without retries', () => {
    const testCase = findTestCase(`<testcase name="test1" time="1" file="file1"></testcase>`)
    expect(testCase).not.toHaveProperty('flakyFailureMessage')
  })
})

describe('groupTestCasesByTestFile', () => {
  it('should group test cases by file', () => {
    const testCases: TestCase[] = [
      { name: 'test1', filename: 'file1', time: 1, success: true, owners: [] },
      { name: 'test2', filename: 'file2', time: 2, success: true, owners: [] },
      { name: 'test3', filename: 'file1', time: 3, success: true, owners: [] },
      { name: 'test4', filename: 'file2', time: 4, success: true, owners: [] },
      { name: 'test5', filename: 'file3', time: 5, success: true, owners: [] },
    ]
    expect(groupTestCasesByTestFile(testCases)).toEqual([
      { filename: 'file1', totalTime: 4, totalTestCases: 2, owners: [] },
      { filename: 'file2', totalTime: 6, totalTestCases: 2, owners: [] },
      { filename: 'file3', totalTime: 5, totalTestCases: 1, owners: [] },
    ])
  })
})

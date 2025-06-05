import { describe } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  findTestCasesFromJunitXml,
  groupTestCasesByTestFile,
  parseJunitXml,
  parseTestReportFiles,
  TestCase,
  TestReport,
} from '../src/junitxml.js'

describe('parseTestReportFiles', () => {
  it('should parse rspec.xml', async () => {
    const testReportFiles = [path.join(__dirname, 'fixtures/rspec1.xml'), path.join(__dirname, 'fixtures/rspec2.xml')]
    const testReport = await parseTestReportFiles(testReportFiles)
    expect(testReport).toEqual<TestReport>({
      testFiles: [
        { filename: 'spec/a_spec.rb', totalTime: 3, totalTestCases: 2 },
        { filename: 'spec/b_spec.rb', totalTime: 12, totalTestCases: 3 },
        { filename: 'spec/c_spec.rb', totalTime: 13, totalTestCases: 2 },
      ],
      testCases: [
        { name: 'a1', filename: 'spec/a_spec.rb', time: 1, success: true },
        { name: 'a2', filename: 'spec/a_spec.rb', time: 2, success: true },
        { name: 'b1', filename: 'spec/b_spec.rb', time: 3, success: true },
        { name: 'b2', filename: 'spec/b_spec.rb', time: 4, success: true },
        { name: 'b3', filename: 'spec/b_spec.rb', time: 5, success: true },
        { name: 'c1', filename: 'spec/c_spec.rb', time: 6, success: true },
        { name: 'c2', filename: 'spec/c_spec.rb', time: 7, success: true },
      ],
    })
  })

  it('should parse cypress.xml', async () => {
    const testReportFiles = [
      path.join(__dirname, 'fixtures/cypress1.xml'),
      path.join(__dirname, 'fixtures/cypress2.xml'),
    ]
    const testReport = await parseTestReportFiles(testReportFiles)
    expect(testReport).toEqual<TestReport>({
      testFiles: [
        { filename: 'cypress/a_spec.ts', totalTime: 6, totalTestCases: 3 },
        { filename: 'cypress/b_spec.ts', totalTime: 4, totalTestCases: 1 },
      ],
      testCases: [
        { name: 'Test 1', filename: 'cypress/a_spec.ts', time: 1, success: true },
        { name: 'Test 2', filename: 'cypress/a_spec.ts', time: 2, success: true },
        { name: 'Test 1', filename: 'cypress/a_spec.ts', time: 3, success: true },
        { name: 'Test 1', filename: 'cypress/b_spec.ts', time: 4, success: true },
      ],
    })
  })
})

describe('parseJunitXml', () => {
  it('should parse fixture.xml', async () => {
    const xml = await fs.readFile(path.join(__dirname, 'fixtures/fixture.xml'))
    expect(() => parseJunitXml(xml)).not.toThrow()
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
    expect(findTestCasesFromJunitXml(junitXml)).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true },
      { name: 'test2', filename: 'file2', time: 2, success: true },
      { name: 'test3', filename: 'file1', time: 3, success: true },
      { name: 'test4', filename: 'file2', time: 4, success: true },
      { name: 'test5', filename: 'file3', time: 5, success: true },
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
    expect(findTestCasesFromJunitXml(junitXml)).toEqual<TestCase[]>([
      { name: 'test1', filename: 'file1', time: 1, success: true },
      { name: 'test2', filename: 'file2', time: 2, success: true },
      { name: 'test3', filename: 'file1', time: 3, success: true },
    ])
  })
})

describe('groupTestCasesByTestFile', () => {
  it('should group test cases by file', () => {
    const testCases: TestCase[] = [
      { name: 'test1', filename: 'file1', time: 1, success: true },
      { name: 'test2', filename: 'file2', time: 2, success: true },
      { name: 'test3', filename: 'file1', time: 3, success: true },
      { name: 'test4', filename: 'file2', time: 4, success: true },
      { name: 'test5', filename: 'file3', time: 5, success: true },
    ]
    expect(groupTestCasesByTestFile(testCases)).toEqual([
      { filename: 'file1', totalTime: 4, totalTestCases: 2 },
      { filename: 'file2', totalTime: 6, totalTestCases: 2 },
      { filename: 'file3', totalTime: 5, totalTestCases: 1 },
    ])
  })
})

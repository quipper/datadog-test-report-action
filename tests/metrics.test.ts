import { describe, expect, it } from 'vitest'
import { createMatcher } from '../src/codeowners.js'
import { TestReport } from '../src/junitxml.js'
import { Context, getTestReportMetrics } from '../src/metrics.js'

describe('getTestReportMetrics', () => {
  it('returns metrics for a test report', () => {
    const testReport: TestReport = {
      testCases: [
        {
          name: 'testCase1',
          filename: 'tests/registration.test.js',
          time: 2.113871,
          success: true,
        },
        {
          name: 'testCase2',
          filename: 'tests/registration.test.js',
          time: 1.051,
          success: true,
        },
        {
          name: 'testCase3',
          filename: 'tests/registration.test.js',
          time: 3.441,
          success: true,
        },
        {
          name: 'testCase4',
          filename: 'tests/registration.test.js',
          time: 2.244,
          success: true,
        },
        {
          name: 'testCase5',
          filename: 'tests/registration.test.js',
          time: 0.781,
          success: true,
        },
        {
          name: 'testCase6',
          filename: 'tests/registration.test.js',
          time: 1.331,
          success: true,
        },
        {
          name: 'testCase7',
          filename: 'tests/registration.test.js',
          time: 2.508,
          success: true,
        },
        {
          name: 'testCase8',
          filename: 'tests/registration.test.js',
          time: 1.230816,
          success: true,
        },
        {
          name: 'testCase9',
          filename: 'tests/registration.test.js',
          time: 0.982,
          success: false,
        },
      ],
      testFiles: [
        {
          filename: 'tests/registration.test.js',
          totalTime: 14.651688,
          totalTestCases: 9,
        },
      ],
    }
    const context: Context = {
      prefix: 'testreport',
      tags: ['env:ci'],
      timestamp: 1234567890,
      filterTestFileSlowerThan: 1,
      filterTestCaseSlowerThan: 1,
      sendTestCaseSuccess: true,
      sendTestCaseFailure: true,
      codeownersMatcher: createMatcher(''),
      testCaseBaseDirectory: '',
    }

    const metrics = getTestReportMetrics(testReport, context)
    expect(metrics.series).toMatchSnapshot()
  })
})

import { describe, expect, it } from 'vitest'
import { JunitXml } from '../src/junitxml.js'
import { createMatcher } from '../src/codeowners.js'
import { Context, getJunitXmlMetrics } from '../src/metrics.js'

describe('getJunitXmlMetrics', () => {
  it('returns metrics for a valid JUnit XML', () => {
    const junitXml: JunitXml = {
      testsuites: {
        testsuite: [
          {
            '@_name': 'Tests.Registration',
            '@_time': 6.605871,
            testcase: [
              {
                '@_classname': 'Tests.Registration',
                '@_name': 'testCase1',
                '@_time': 2.113871,
              },
              {
                '@_classname': 'Tests.Registration',
                '@_name': 'testCase2',
                '@_time': 1.051,
              },
              {
                '@_classname': 'Tests.Registration',
                '@_name': 'testCase3',
                '@_time': 3.441,
              },
            ],
          },
          {
            testsuite: [
              {
                '@_name': 'Tests.Authentication.Login',
                '@_time': 4.356,
                testcase: [
                  {
                    '@_name': 'testCase4',
                    '@_classname': 'Tests.Authentication.Login',
                    '@_time': 2.244,
                  },
                  {
                    '@_name': 'testCase5',
                    '@_classname': 'Tests.Authentication.Login',
                    '@_time': 0.781,
                  },
                  {
                    '@_name': 'testCase6',
                    '@_classname': 'Tests.Authentication.Login',
                    '@_time': 1.331,
                  },
                ],
              },
            ],
            '@_name': 'Tests.Authentication',
            '@_time': 9.076816,
            testcase: [
              {
                '@_name': 'testCase7',
                '@_classname': 'Tests.Authentication',
                '@_time': 2.508,
              },
              {
                '@_name': 'testCase8',
                '@_classname': 'Tests.Authentication',
                '@_time': 1.230816,
              },
              {
                failure: {
                  '@_message': 'Assertion error message',
                },
                '@_name': 'testCase9',
                '@_classname': 'Tests.Authentication',
                '@_time': 0.982,
              },
            ],
          },
        ],
      },
    }
    const context: Context = {
      prefix: 'testreport',
      tags: ['env:ci'],
      timestamp: 1234567890,
      filterTestCaseSlowerThan: 1,
      sendTestCaseSuccess: true,
      sendTestCaseFailure: true,
      codeownersMatcher: createMatcher(''),
      testCaseBaseDirectory: '',
    }

    const metrics = getJunitXmlMetrics(junitXml, context)
    expect(metrics.series).toMatchSnapshot()
  })
})

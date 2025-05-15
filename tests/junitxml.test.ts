import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { parseJunitXml } from '../src/junitxml.js'

describe('parseJunitXml', () => {
  it('should parse junit-basic.xml', () => {
    const xml = fs.readFileSync(path.join(__dirname, 'fixtures', 'junit-basic.xml'), 'utf8')
    const junixXml = parseJunitXml(xml)
    expect(junixXml).toEqual({
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      testsuites: {
        '@_time': 15.682687,
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
                  '@_type': 'AssertionError',
                },
                '@_name': 'testCase9',
                '@_classname': 'Tests.Authentication',
                '@_time': 0.982,
              },
            ],
          },
        ],
      },
    })
  })

  it('should parse jest.xml', () => {
    const xml = fs.readFileSync(path.join(__dirname, 'fixtures', 'jest.xml'), 'utf8')
    const junixXml = parseJunitXml(xml)
    expect(junixXml).toEqual({
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8',
      },
      testsuites: {
        '@_errors': '0',
        '@_failures': '1',
        '@_name': 'jest tests',
        '@_tests': '2',
        '@_time': 0.4,
        testsuite: [
          {
            '@_errors': '0',
            '@_failures': '1',
            '@_name': 'example',
            '@_skipped': '0',
            '@_tests': '2',
            '@_time': 0.3,
            '@_timestamp': '2024-10-31T04:07:52',
            testcase: [
              {
                '@_classname': 'example1',
                '@_name': 'example1',
                '@_time': 0.1,
                failure: {
                  '#text': 'Error: expect(received).toBe(expected)...',
                },
              },
              {
                '@_classname': 'example2',
                '@_name': 'example2',
                '@_time': 0.2,
              },
            ],
          },
        ],
      },
    })
  })
})

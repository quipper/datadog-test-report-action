import * as fs from 'fs'
import * as path from 'path'
import { parseJunitXml } from '../src/junitxml'

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
})

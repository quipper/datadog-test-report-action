import * as sentry from '@sentry/node-core/light'
import { describe, expect, it, test, vi } from 'vitest'
import { sendFlakyTestCasesToSentry, truncateFailureMessage } from '../src/sentry.js'

vi.mock('@sentry/node-core/light', () => ({ captureEvent: vi.fn() }))

describe('truncateFailureMessage', () => {
  test.each([
    { given: undefined, expected: undefined },
    { given: '', expected: '' },
    { given: 'Error: something wrong', expected: 'Error: something wrong' },
    {
      given: 'Error: something wrong\nSECOND LINE WILL BE TRUNCATED',
      expected: 'Error: something wrong\n(truncated...)',
    },
    {
      given: 'Error: something wrong\r\nSECOND LINE WILL BE TRUNCATED',
      expected: 'Error: something wrong\n(truncated...)',
    },
  ])(`truncateFailureMessage($given) should output $expected`, ({ given, expected }) => {
    expect(truncateFailureMessage(given)).toEqual(expected)
  })
})

describe('sendFlakyTestCasesToSentry', () => {
  it('adds testcase.flaky_kind tag only to the flaky test cases in retries', () => {
    sendFlakyTestCasesToSentry(
      [{ name: 'testCase1', filename: 'a.test.js', owners: [], failureMessage: 'Failure 1' }],
      { testCaseBaseDirectory: '', tags: ['env:ci'] },
      [{ name: 'testCase2', filename: 'a.test.js', owners: [], failureMessage: 'Failure 2' }],
    )
    const events = vi.mocked(sentry.captureEvent).mock.calls.map(([event]) => event)
    expect(events.map((event) => event.message)).toStrictEqual(['testCase1', 'testCase2'])
    expect(events[0]?.tags).toStrictEqual({
      env: 'ci',
      'testcase.owners': '',
      'testcase.filename': 'a.test.js',
    })
    expect(events[1]?.tags).toStrictEqual({
      env: 'ci',
      'testcase.owners': '',
      'testcase.filename': 'a.test.js',
      'testcase.flaky_kind': 'retry',
    })
    expect(events[1]?.exception?.values?.at(0)?.value).toBe('Failure 2')
  })
})

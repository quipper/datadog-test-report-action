import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { type FailedTestCase, findFlakyTestCasesInRetries } from '../src/flaky.js'
import { parseTestReportFiles } from '../src/junitxml.js'

describe('findFlakyTestCasesInRetries', () => {
  it('returns only the test cases passed on a retry', async () => {
    const testReport = await parseTestReportFiles([path.join(__dirname, 'fixtures/playwright-retries.xml')], () => [
      '@owner',
    ])
    expect(findFlakyTestCasesInRetries(testReport)).toStrictEqual<FailedTestCase[]>([
      {
        name: 'flaky one',
        filename: 'a/smoke.spec.mjs',
        owners: ['@owner'],
        failureMessage: 'expect(received).toBe(expected) // Object.is equality',
      },
    ])
  })
})

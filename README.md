# test-report-observability-action [![ts](https://github.com/quipper/test-report-observability-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/quipper/test-report-observability-action/actions/workflows/ts.yaml)

This is an action for the observability of test reports.
It supports the JUnit XML format.

## Getting Started

To send the test report to Datadog,

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: yarn test
      - uses: quipper/test-report-observability-action@v0
        with:
          junit-xml-path: '**/junit.xml'
```

## Metrics

All metrics have the following tags:

- `repository_owner`
- `repository_name`
- `workflow_name`

### `testreport.testcase.success_count` (count)

This metric represents the number of succeeded test cases.
It has the following tags:

- `testcase_name`
- `testcase_file`

This actions sends **only failed test cases by default**.
You can set `send-test-case-success` to send all test cases.
:warning: It may increase the custom metrics cost.

```yaml
- uses: quipper/test-report-observability-action@v0
  with:
    junit-xml-path: '**/junit.xml'
    send-test-case-success: true
```

### `testreport.testcase.failure_count` (count)

This metric represents the number of failed test cases.
It has the following tags:

- `testcase_name`
- `testcase_file`

### `testreport.testcase.duration` (distribution)

This metric represents the duration of test cases in seconds.
It has the following tags:

- `testcase_name`
- `testcase_conclusion` (`success` or `failure`)
- `testcase_file`

This action sends test cases **slower than 1 second by default**.
You can set `filter-test-case-slower-than` to send all test cases.
:warning: It may increase the custom metrics cost.

```yaml
- uses: quipper/test-report-observability-action@v0
  with:
    junit-xml-path: '**/junit.xml'
    filter-test-case-slower-than: 0
```

### `testreport.testfile.duration` (distribution)

This metric represents the duration of test files in seconds.
It has the following tags:

- `testfile_name`

This action sends test files **slower than 1 second by default**.
You can set `filter-test-file-slower-than` to send all test files.
:warning: It may increase the custom metrics cost.

```yaml
- uses: quipper/test-report-observability-action@v0
  with:
    junit-xml-path: '**/junit.xml'
    filter-test-file-slower-than: 0
```

## Tags

### `testcase_owner` tag

If the repository has a [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-file-location) file,
this action adds the `testcase_owner` tag to the test case metrics.
The value of the tag is the owner of the test case file.

If the test report contains a relative path to the test case file,
you can set `test-case-base-directory` to resolve the path.

```yaml
- uses: quipper/test-report-observability-action@v0
  with:
    junit-xml-path: microservice/junit.xml
    test-case-base-directory: microservice
```

## Specification

### Inputs

| Name                           | Default      | Description                                              |
| ------------------------------ | ------------ | -------------------------------------------------------- |
| `junit-xml-path`               | (required)   | Glob pattern to the JUnit XML file(s)                    |
| `metric-name-prefix`           | `testreport` | Prefix of the name of metrics                            |
| `filter-test-file-slower-than` | 1            | Filter test files slower than the threshold (in seconds) |
| `filter-test-case-slower-than` | 1            | Filter test cases slower than the threshold (in seconds) |
| `enable-metrics`               | true         | If false, do not send the metrics to Datadog             |
| `send-test-case-success`       | false        | Send succeeded test cases                                |
| `send-test-case-failure`       | true         | Send failed test cases                                   |
| `test-case-base-directory`     | -            | Base directory to resolve the test case file path        |
| `datadog-api-key`              | -            | Datadog API key                                          |
| `datadog-site`                 | -            | Datadog site                                             |
| `datadog-tags`                 | -            | Datadog tags                                             |

### Outputs

None.

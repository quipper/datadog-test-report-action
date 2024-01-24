# datadog-test-report-action [![ts](https://github.com/int128/datadog-test-report-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/datadog-test-report-action/actions/workflows/ts.yaml)

TODO

## Getting Started

To run this action, create a workflow as follows:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/datadog-test-report-action@v1
        with:
          junit-xml-path: '**/junit.xml'
```

### Inputs

| Name                 | Default      | Description                           |
| -------------------- | ------------ | ------------------------------------- |
| `junit-xml-path`     | (required)   | Glob pattern to the JUnit XML file(s) |
| `metric-name-prefix` | `testreport` | Prefix of the name of metrics         |
| `datadog-api-key`    | -            | Datadog API key                       |
| `datadog-site`       | -            | Datadog site                          |
| `datadog-tags`       | -            | Datadog tags                          |

### Outputs

| Name      | Description    |
| --------- | -------------- |
| `example` | example output |

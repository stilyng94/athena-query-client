**athena-query-client**

# @stilyng94/athena-query-client

A lightweight client library for executing Amazon Athena queries.

## Installation

```bash
npm install @stilyng94/athena-query-client
```

### !!Notice

Ensure aws `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` envs are set

### Usage

## Get query results via S3 and write to JsonFile

```typescript
import {
  AthenaQueryClient,
  S3QueryResultProcessor,
  JsonFileAppender,
} from "@stilyng94/athena-query-client";

const query = "SELECT * from api_logs";

const execute = async (query) => {
  const athena = new AthenaQueryClient({
    Catalog: "catalog",
    Database: "logs",
    ClientConfig: { region: "us-west-2" },
    WorkGroup: "primary",
    s3OutputLocation: "s3://results/queries",
    s3Region: "us-west-2",
  });

  const queryExecutionId = await athena.query();

  const jsonFileAppender = new JsonFileAppender({
    directory: "",
    fileName: "",
  });

  const s3QueryResultProcessor = new S3QueryResultProcessor({
    s3OutputLocation: "s3://results/queries",
    s3Region: "us-west-2",
    batchSize: 999,
    onData: async (data) => {
      await jsonFileAppender.flush(data);
    },
    onComplete: async () => {
      await jsonFileAppender.closeFileWithBracket();
    },
  });
  s3QueryResultProcessor
    .processResults(queryExecutionId)
    .catch((error) => console.error(error));
};

execute().catch(console.error);
```

## Get query results and map to Js object

```typescript
import {
  AthenaQueryClient,
  MappedQueryResultProcessor,
} from "@stilyng94/athena-query-client";

const query = "SELECT * from api_logs";

const execute = async (query) => {
  const athena = new AthenaQueryClient({
    Catalog: "catalog",
    Database: "logs",
    ClientConfig: { region: "us-west-2" },
    WorkGroup: "primary",
    s3OutputLocation: "s3://results/queries",
    s3Region: "us-west-2",
  });

  const queryExecutionId = await athena.query();

  const mappedQueryResultProcessor = new MappedQueryResultProcessor({
    athenaClient: athena,
  });
  mappedQueryResultProcessor.processResults(queryExecutionId).then((data) => {
    console.log(data);
  });
};

execute().catch(console.error);
```

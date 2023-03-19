import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { config } from "../config";
import { S3PipelineStack } from "../lib/s3-pipeline-stack";
import { RdsPipelineStack } from "../lib/rds-pipeline-stack";

const region = "ap-southeast-2";

const app = new App();

const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  s3LakeName: config.s3LakeName,
  registerBucketData: config.s3LakeName,
  queryResultLocation: config.queryResultLocation,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new DataAnalystStack(app, "DataAnalystStack", {
  userName: config.dataAnalystName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new DataAnalystStack(app, "DataScientistStack", {
  userName: config.dataScientistName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// s3 data pipeline
new S3PipelineStack(app, "S3DataPipelineStack", {
  pipelineName: "amazon_review",
  sourceBucket: config.amazonReview,
  lakeBucket: config.s3LakeName,
  sourceBucketPrefixes: ["parquet"],
  lakeBucketPrefixes: ["amazon-review"],
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// rds pipeline
new RdsPipelineStack(app, "RdsPipelineStack", {
  name: "RDS",
  jdbc: config.jdbc,
  username: config.username,
  password: config.password,
  az: config.rdsAz,
  securityGroupId: config.securityGroupId,
  subnetId: config.subnetId,
  databaseName: config.databaseName,
  databasePath: config.databasePath,
  destBucket: config.destBucket,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// // grant data analyst
// lakeFormation.grantDataAnalyst({
//   userArn: config.dataAnalystArn,
//   databasePermissions: [DatabasePermission.All],
//   databaseName: "default",
// });

// lakeFormation.grantDataAnalyst({
//   userArn: config.dataScientistArn,
//   databasePermissions: [DatabasePermission.All],
//   databaseName: "default",
// });

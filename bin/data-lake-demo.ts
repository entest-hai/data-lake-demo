import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { config } from "../config";
import { S3PipelineStack } from "../lib/s3-pipeline-stack";
import { RdsPipelineStack } from "../lib/rds-pipeline-stack";
import { DatabasePermission } from "../lib/permission-type";
import { S3PipelineTsvStack } from "../lib/s3-pipline-tsv-stack";

const region = "us-east-1";

const env = {
  region: region,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

const app = new App();

const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  s3LakeName: config.s3LakeName,
  registerBuckets: [config.s3LakeName, config.amazonReview],
  queryResultLocation: config.queryResultLocation,
  env: env,
});

// s3 data pipeline
const s3Pipeline = new S3PipelineStack(app, "S3DataPipelineStack", {
  pipelineName: "amazon_review",
  sourceBucket: config.amazonReview,
  lakeBucket: config.s3LakeName,
  sourceBucketPrefixes: ["parquet"],
  lakeBucketPrefixes: ["amazon-review"],
  env: env,
});

// s3 tsv data pipeline
const s3PipelineTsv = new S3PipelineTsvStack(app, "S3DataPipelineTsvStack", {
  pipelineName: "amazon_review_tsv",
  sourceBucket: config.amazonReview,
  lakeBucket: config.s3LakeName,
  sourceBucketPrefixes: ["tsv"],
  lakeBucketPrefixes: ["amazon-review-tsv-parquet"],
  env: env,
});

// rds pipeline
const rdsPipeline = new RdsPipelineStack(app, "RdsPipelineStack", {
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
  env: env,
});

const da = new DataAnalystStack(app, "DataAnalystStack", {
  userName: config.dataAnalystName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  databaseName: "default",
  databasePermissions: [DatabasePermission.All],
  env: env,
});

const ds = new DataAnalystStack(app, "DataScientistStack", {
  userName: config.dataScientistName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  databaseName: "default",
  databasePermissions: [DatabasePermission.All],
  env: env,
});

s3Pipeline.addDependency(lakeFormation);
s3PipelineTsv.addDependency(lakeFormation);
rdsPipeline.addDependency(lakeFormation);
da.addDependency(lakeFormation);
ds.addDependency(lakeFormation);

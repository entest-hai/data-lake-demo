import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { DatabasePermission } from "../lib/permission-type";
import { config } from "../config";
import { GlueWorkFlowStack } from "../lib/data-pipeline-stack";
import { RdsPipelineStack } from "../lib/rds-pipeline-stack";

const app = new App();

new DataAnalystStack(app, "DataAnalystStack", {
  userName: config.dataAnalystName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAULT,
  },
});

new DataAnalystStack(app, "DataScientistStack", {
  userName: config.dataScientistName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAULT,
  },
});

const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  registerBucketData: config.registerBucketData,
  queryResultLocation: config.queryResultLocation,
});

// data pipeline
new GlueWorkFlowStack(app, "EtlWorkFlow", {
  pipelineName: "Etl",
  sourceBucket: config.soureBucket,
  lakeBucket: config.soureBucket,
  sourceBucketPrefixes: ["spark-output", "data"],
  lakeBucketPrefixes: ["spark-output", "data"],
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAUT,
  },
});

// rds pipeline
new RdsPipelineStack(app, "RdsPipelineStack", {
  name: "RDS",
  jdbc: config.jdbc,
  username: config.username,
  password: config.password,
  az: "us-east-1a",
  securityGroupId: config.securityGroupId,
  subnetId: config.subnetId,
  databaseName: config.databaseName,
  databasePath: config.databasePath,
  destBucket: config.destBucket,
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAUT,
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

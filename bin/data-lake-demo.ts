import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { config } from "../config";
import { GlueWorkFlowStack } from "../lib/data-pipeline-stack";

const app = new App();

new DataAnalystStack(app, "DataAnalystStack", {
  userName: "DataAnalystcdk",
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAULT,
  },
});

new DataAnalystStack(app, "DataScientistStack", {
  userName: "DataScientist",
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAULT,
  },
});

const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  registerBucketData: config.registerBucketData,
});

// data pipeline
const etl = new GlueWorkFlowStack(app, "EtlWorkFlow", {
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

// grant data analyst
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

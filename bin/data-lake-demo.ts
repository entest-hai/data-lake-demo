import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";

import { LakeFormationStack } from "../lib/lake-formation-stack";

const app = new App();

// create a data analyst
const dataAnalyst = new DataAnalystStack(app, "DataAnalystStack", {
  userName: "DataAnalystDemo",
  athenaResultBucketArn:
    "arn:aws:s3:::haimtran-codepipeline-artifact/data-analys/*",
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAULT,
  },
});

// create a data pipeline
// const pipeline = new DataPipelineStack(app, "DataPipeline", {});

// lake formation manage data analyst and pipeline
const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  registerBucketData: "arn:aws:s3:::haimtran-codepipeline-artifact/data/",
});

lakeFormation.grantDataAnalyst({
  userArn: "arn:aws:iam::392194582387:user/DataAnalystDemo",
  databasePermissions: ["ALL"],
  databaseName: "default",
});

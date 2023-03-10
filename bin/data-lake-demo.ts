import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { config } from "../config";
import { DatabasePermission } from "../lib/permission-type";
import {
  DataPipelineStack,
  GlueWorkFlowStack,
} from "../lib/data-pipeline-stack";
import { ConfigurationSet } from "aws-cdk-lib/aws-ses";

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

lakeFormation.grantDataAnalyst({
  userArn: config.dataAnalystArn,
  databasePermissions: [DatabasePermission.All],
  databaseName: "default",
});

lakeFormation.grantDataAnalyst({
  userArn: config.dataScientistArn,
  databasePermissions: [DatabasePermission.All],
  databaseName: "default",
});

const dataPipeline = new DataPipelineStack(app, "DataPipeline", {
  pipelineName: "S3Demo",
  soureBucket: config.soureBucket,
  soureBucketPrefixes: ["data"],
});

// wait
lakeFormation.grantGlueRole({
  pipelineName: "S3Demo",
  roleArn: dataPipeline.dataPipelineGlueRole,
  bucketPrefix: "data",
  locationBucket: config.dataLocationBucket,
});

//
const etl = new GlueWorkFlowStack(app, "EtlWorkFlow", {
  pipelineName: "Etl",
  soureBucket: config.soureBucket,
  soureBucketPrefixes: ["data"],
  env: {
    region: "us-east-1",
    account: process.env.CDK_ACCOUNT_DEFAUT,
  },
});

lakeFormation.grantGlueRole({
  pipelineName: "Etl",
  roleArn: etl.glueRole.arn,
  bucketPrefix: "data",
  locationBucket: config.dataLocationBucket,
});

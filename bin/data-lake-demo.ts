import { App } from "aws-cdk-lib";
import { DataAnalystStack } from "../lib/data-analyst-stack";
import { LakeFormationStack } from "../lib/lake-formation-stack";
import { DatabasePermission } from "../lib/permission-type";
import { config } from "../config";
import { GlueWorkFlowStack } from "../lib/data-pipeline-stack";
import { RdsPipelineStack } from "../lib/rds-pipeline-stack";
import { Ec2Stack, RdsDbInstanceStack } from "../lib/ec2-stack";
import { ProductStack } from "aws-cdk-lib/aws-servicecatalog";

const app = new App();

new DataAnalystStack(app, "DataAnalystStack", {
  userName: config.dataAnalystName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

new DataAnalystStack(app, "DataScientistStack", {
  userName: config.dataScientistName,
  athenaResultBucketArn: config.athenaResultBucketArn,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const lakeFormation = new LakeFormationStack(app, "LakeFormationStack", {
  registerBucketData: config.registerBucketData,
  queryResultLocation: config.queryResultLocation,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
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
    account: process.env.CDK_DEFAULT_ACCOUNT,
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
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

 // grant data analyst
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

const ec2 = new Ec2Stack(app, "Ec2WriteToDbDemo", {
  vpcId: config.vpcId,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
})

const rds = new RdsDbInstanceStack(app, "RdsDbInstance", {
  vpcId: config.vpcId, 
  securityGroupEc2: ec2.ec2SecurityGroup,
  env: {
    region: process.env.CDK_DEFAULT_REGION, 
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
})

rds.addDependency(ec2)

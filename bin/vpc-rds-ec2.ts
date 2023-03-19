import { App } from "aws-cdk-lib";
import {
  Ec2Stack,
  RdsDbInstanceStack,
  VpcNetworkStack,
} from "../lib/vpc-rds-ec2-stack";

const region = "ap-southeast-2";

const app = new App();

const network = new VpcNetworkStack(app, "VpcNetworkStack", {
  name: "VpcForRdsEc2",
  cidr: "10.0.0.0/16",
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const rds = new RdsDbInstanceStack(app, "RdsDbInstanceStack", {
  vpc: network.vpc,
  securityGroup: network.securityGroupRds,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const ec2 = new Ec2Stack(app, "Ec2StackWriteDbStack", {
  vpc: network.vpc,
  securityGroup: network.securityGroupEc2,
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

rds.addDependency(network);
ec2.addDependency(network);

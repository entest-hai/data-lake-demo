import {
  aws_ec2,
  aws_iam,
  aws_rds,
  aws_secretsmanager,
  Duration,
  RemovalPolicy,
  SecretValue,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

interface Ec2Props extends StackProps {
  vpcId: string;
}

export class Ec2Stack extends Stack {
  public readonly ec2SecurityGroup: string;

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id, props);

    const role = new aws_iam.Role(this, "RoleForEc2WriteDb", {
      roleName: "RoleForEc2WriteDb",
      assumedBy: new aws_iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore"
      )
    );

    const vpc = aws_ec2.Vpc.fromLookup(this, "LookUpExistingVpc", {
      vpcId: props.vpcId,
      vpcName: "DevDemo",
    });

    const sg = new aws_ec2.SecurityGroup(this, "SecurityGroupForEc2WriteDb", {
      securityGroupName: "SecurityGroupForEc2WriteDb",
      vpc: vpc,
    });

    const ec2 = new aws_ec2.Instance(this, "Ec2WriteDb", {
      instanceName: "Ec2WriteDb",
      instanceType: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T2,
        aws_ec2.InstanceSize.MICRO
      ),
      machineImage: aws_ec2.MachineImage.latestAmazonLinux({
        generation: aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        edition: aws_ec2.AmazonLinuxEdition.STANDARD,
        storage: aws_ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
      }),
      vpc: vpc,
      role: role,
      securityGroup: sg,
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PUBLIC,
      },
    });

    ec2.addUserData(
      fs.readFileSync(path.join(__dirname, "./../script/user_data.sh"), {
        encoding: "utf-8",
      })
    );

    this.ec2SecurityGroup = sg.securityGroupId;
  }
}

interface RdsProps extends StackProps {
  vpcId: string;
  securityGroupEc2: string;
}

export class RdsDbInstanceStack extends Stack {
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);

    const vpc = aws_ec2.Vpc.fromLookup(this, "LookUpExistingVpc", {
      vpcId: props.vpcId,
      vpcName: "DevDemo",
    });

    const dbSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupForDbLakeDemo",
      {
        securityGroupName: "SecurityGroupForDbLakeDemo",
        vpc: vpc,
      }
    );

    dbSecurityGroup.addIngressRule(
      aws_ec2.Peer.securityGroupId(props.securityGroupEc2),
      aws_ec2.Port.tcp(3306)
    );

    new aws_rds.DatabaseInstance(this, "RdsDatabaseInstanceLakeDemo", {
      instanceIdentifier: "lakedemo",
      databaseName: "demo",
      deletionProtection: false,
      engine: aws_rds.DatabaseInstanceEngine.mysql({
        version: aws_rds.MysqlEngineVersion.VER_8_0_23,
      }),
      vpc,
      multiAz: false,
      port: 3306,
      instanceType: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T3,
        aws_ec2.InstanceSize.MICRO
      ),
      credentials: aws_rds.Credentials.fromGeneratedSecret("demo", {
        secretName: "rds-secrete-lake",
      }),
      //      credentials: {
      //        username: "demo",
      //        password: SecretValue.unsafePlainText("Demo#2023")
      //      },
      allocatedStorage: 30,
      enablePerformanceInsights: false,
      backupRetention: Duration.days(0),
      autoMinorVersionUpgrade: false,
      iamAuthentication: false,
      removalPolicy: RemovalPolicy.DESTROY,
      securityGroups: [dbSecurityGroup],
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }
}

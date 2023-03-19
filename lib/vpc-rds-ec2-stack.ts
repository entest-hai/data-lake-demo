import {
  aws_ec2,
  aws_iam,
  aws_rds,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

interface VpcProps extends StackProps {
  cidr: string;
  name: string;
}

export class VpcNetworkStack extends Stack {
  public readonly vpc: aws_ec2.Vpc;
  public readonly securityGroupEc2: aws_ec2.SecurityGroup;
  public readonly securityGroupRds: aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcProps) {
    super(scope, id, props);

    const vpc = new aws_ec2.Vpc(this, "VpcRdsEc2", {
      vpcName: props.name,
      maxAzs: 3,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      ipAddresses: aws_ec2.IpAddresses.cidr(props.cidr),
      subnetConfiguration: [
        {
          name: "PublicSubnet",
          cidrMask: 24,
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
        {
          name: "PrivateSubnet",
          cidrMask: 24,
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          name: "PrivateSubnetNat",
          cidrMask: 24,
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    vpc.addGatewayEndpoint("S3GatewayEndponit", {
      service: aws_ec2.GatewayVpcEndpointAwsService.S3,
    });

    const securityGroupEc2 = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupEc2",
      {
        securityGroupName: "SecurityGroupEc2",
        vpc: vpc,
      }
    );

    const securityGroupRds = new aws_ec2.SecurityGroup(
      this,
      "SecurityGroupRds",
      {
        securityGroupName: "SecurityGroupRds",
        vpc: vpc,
      }
    );

    securityGroupRds.addIngressRule(
      securityGroupRds,
      aws_ec2.Port.allTcp(),
      "allow all its own"
    );

    securityGroupRds.addIngressRule(
      aws_ec2.Peer.securityGroupId(securityGroupEc2.securityGroupId),
      aws_ec2.Port.tcp(3306),
      "allow ec2 connect to rds on 3306"
    );

    this.vpc = vpc;
    this.securityGroupEc2 = securityGroupEc2;
    this.securityGroupRds = securityGroupRds;
  }
}

interface Ec2Props extends StackProps {
  vpc: aws_ec2.Vpc;
  securityGroup: aws_ec2.SecurityGroup;
}

export class Ec2Stack extends Stack {
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
      vpc: props.vpc,
      role: role,
      securityGroup: props.securityGroup,
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PUBLIC,
      },
    });

    ec2.addUserData(
      fs.readFileSync(path.join(__dirname, "./../script/user_data.sh"), {
        encoding: "utf-8",
      })
    );
  }
}

interface RdsProps extends StackProps {
  vpc: aws_ec2.Vpc;
  securityGroup: aws_ec2.SecurityGroup;
}

export class RdsDbInstanceStack extends Stack {
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id, props);

    new aws_rds.DatabaseInstance(this, "RdsDatabaseInstanceLakeDemo", {
      instanceIdentifier: "lakedemo",
      databaseName: "demo",
      deletionProtection: false,
      engine: aws_rds.DatabaseInstanceEngine.mysql({
        version: aws_rds.MysqlEngineVersion.VER_8_0_23,
      }),
      vpc: props.vpc,
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
      securityGroups: [props.securityGroup],
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }
}

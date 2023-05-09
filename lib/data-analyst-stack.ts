import {
  aws_iam,
  aws_lakeformation,
  aws_secretsmanager,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface DataAnalystProps extends StackProps {
  userName: string;
  athenaResultBucketArn: string;
  databaseName: string 
  databasePermissions: string[]
}

export class DataAnalystStack extends Stack {
  public userArn: string;

  constructor(scope: Construct, id: string, props: DataAnalystProps) {
    super(scope, id, props);

    const secret = new aws_secretsmanager.Secret(
      this,
      `${props.userName}Secret`,
      {
        secretName: `${props.userName}Secret`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: props.userName }),
          generateStringKey: "password",
        },
      }
    );

    // create an iam user for data analyst (da)
    const daUser = new aws_iam.User(this, `${props.userName}IAMUser`, {
      userName: props.userName,
      // password: SecretValue.unsafePlainText("Demo#2023"),
      // password: SecretValue.secretsManager(secret.secretName),
      password: secret.secretValueFromJson("password"),
      passwordResetRequired: false,
    });

    // best practice need to fine-grain this one
    // can view all S3 bucket
    daUser.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAthenaFullAccess")
    );

    // access athena result query in s3
    daUser.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*"],
        resources: [props.athenaResultBucketArn],
      })
    );

    daUser.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["quicksight:*"],
        resources: ["*"],
      })
    );

    const permission = new aws_lakeformation.CfnPrincipalPermissions(
      this,
      `${props.userName}-ReadTableLake`,
      {
        permissions: props.databasePermissions,
        permissionsWithGrantOption: props.databasePermissions,
        principal: {
          dataLakePrincipalIdentifier: daUser.userArn,
        },
        resource: {
          database: {
            catalogId: this.account,
            name: props.databaseName,
          },
        },
      }
    );

    permission.addDependency(daUser.node.defaultChild as aws_iam.CfnUser)

    // setting result query S3 prefix
    this.userArn = this.userArn;
  }
}

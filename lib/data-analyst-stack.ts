import { aws_iam, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface DataAnalystProps extends StackProps {
  userName: string;
  athenaResultBucketArn: string;
}

export class DataAnalystStack extends Stack {
  public userArn: string;

  constructor(scope: Construct, id: string, props: DataAnalystProps) {
    super(scope, id, props);

    // create an iam user for data analyst (da)
    const daUser = new aws_iam.User(this, "DataAnalystUserDemo", {
      userName: "DataAnalystDemo",
      // password: SecretValue.unsafePlainText("Demo@2023"),
      password: SecretValue.secretsManager("DataAnalysDemoPassword"),
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

    // setting result query S3 prefix
    this.userArn = this.userArn;
  }
}

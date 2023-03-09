import {
  aws_glue,
  aws_iam,
  aws_lakeformation,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { DataLocationPermission } from "./permission-type";

interface DataPipelineProps extends StackProps {
  pipelineName: string;
  soureBucket: string;
  soureBucketPrefixes: string[];
}

export class DataPipelineStack extends Stack {
  public readonly dataPipelineGlueRole: string;

  constructor(scope: Construct, id: string, props: DataPipelineProps) {
    super(scope, id, props);

    // glue crawler: load raw data
    const role = new aws_iam.Role(this, "RoleForCrawler-1", {
      roleName: "RoleForCrawler-1",
      assumedBy: new aws_iam.ServicePrincipal("glue.amazonaws.com"),
    });

    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSGlueServiceRole"
      )
    );

    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "CloudWatchAgentServerPolicy"
      )
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:ListObject", "s3:GetObject", "s3:PutObject"],
        resources: [
          `arn:aws:s3:::${props.soureBucket}`,
          `arn:aws:s3:::${props.soureBucket}/*`,
        ],
      })
    );

    // lake formation allow write to catalog
    var s3Targets: aws_glue.CfnCrawler.S3TargetProperty[] = [];
    props.soureBucketPrefixes.map((prefix) => {
      s3Targets.push({
        path: `s3://${props.soureBucket}/${prefix}`,
        sampleSize: 1,
      });
    });

    // glue crawler: write to catalog
    new aws_glue.CfnCrawler(this, "ExampleS3Crawler", {
      name: "ExampleS3Crawler",
      role: role.roleArn,
      targets: {
        s3Targets: s3Targets,
      },
      databaseName: "default",
      description: "craw a s3 prefix",
      tablePrefix: "cdk-",
    });

    this.dataPipelineGlueRole = role.roleArn;
  }
}

import { aws_iam, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

interface DataPipelineProps extends StackProps {
  pipelineName: string;
  soureBucket: string;
  soureBucketPrefixes: string[];
}

export class DataPipelineStack extends Stack {
  public readonly dataPipelineGlueRole: aws_iam.ArnPrincipal;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // glue crawler: load raw data

    // etl: glue workflow

    // glue crawler: write to catalog

    // lake formation: grant glue role to write to database (data catalog)
  }
}

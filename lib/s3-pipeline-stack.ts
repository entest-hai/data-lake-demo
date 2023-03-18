import {
  aws_glue,
  aws_iam,
  aws_lakeformation,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";
import * as path from "path";

interface S3PipelineProps extends StackProps {
  sourceBucket: string;
  sourceBucketPrefixes: string[];
  lakeBucket: string;
  lakeBucketPrefixes: string[];
  pipelineName: string;
}

export class S3PipelineStack extends Stack {
  public readonly glueRole: aws_iam.ArnPrincipal;

  constructor(scope: Construct, id: string, props: S3PipelineProps) {
    super(scope, id, props);

    // python script path
    const pythonScriptPath = new Asset(
      this,
      `etl-script-${props.pipelineName}`,
      {
        path: path.join(__dirname, "./../script/transform_amazon_review.py"),
      }
    );

    // glue role
    const role = new aws_iam.Role(this, `GlueRoleFor-${props.pipelineName}`, {
      roleName: `GlueRoleFor-${props.pipelineName}`,
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
        actions: ["lakeformation:GetDataAccess"],
        resources: ["*"],
      })
    );

    pythonScriptPath.grantRead(role);

    // role for glue to read source data if not registered with lake
    props.sourceBucketPrefixes.map((prefix) => {
      role.addToPolicy(
        new aws_iam.PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject", "s3:ListObject"],
          resources: [`arn:aws:s3:::${props.sourceBucket}/${prefix}/*`],
        })
      );
    });

    // hot fix so pyspark job can write transformed data
    role.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:ListObject"],
        resources: [
          `arn:aws:s3:::${props.lakeBucket}/${props.lakeBucketPrefixes[0]}/*`,
        ],
      })
    );

    // glue workflow
    const workflow = new aws_glue.CfnWorkflow(
      this,
      `GlueWorkFlow-${props.pipelineName}`,
      {
        name: `GlueWorkFlow-${props.pipelineName}`,
        description: "demo",
      }
    );

    // source to craw
    var s3Targets: aws_glue.CfnCrawler.S3TargetProperty[] = [];
    props.sourceBucketPrefixes.map((prefix) => {
      s3Targets.push({
        path: `s3://${props.sourceBucket}/${prefix}`,
        sampleSize: 1,
      });
    });

    const crawler = new aws_glue.CfnCrawler(
      this,
      `CrawRawData-${props.pipelineName}`,
      {
        name: `CrawRawData-${props.pipelineName}`,
        role: role.roleArn,
        targets: {
          s3Targets: s3Targets,
        },
        databaseName: "default",
        description: "craw a s3 prefix",
        tablePrefix: "amazon_review_",
      }
    );

    // craw the transformed data
    const crawlerTransforedData = new aws_glue.CfnCrawler(
      this,
      `CrawlTransformedData-${props.pipelineName}`,
      {
        name: `CrawlTransformedData-${props.pipelineName}`,
        role: role.roleArn,
        targets: {
          s3Targets: [
            {
              path: `s3://${props.lakeBucket}/${props.lakeBucketPrefixes[0]}`,
              sampleSize: 1,
            },
          ],
        },
        databaseName: "default",
        description: "craw transformed data",
        tablePrefix: "transformed_",
      }
    );

    // spark glue job
    const job = new aws_glue.CfnJob(
      this,
      `TransformJob-${props.pipelineName}`,
      {
        name: `TransformJob-${props.pipelineName}`,
        command: {
          name: "glueetl",
          pythonVersion: "3",
          scriptLocation: pythonScriptPath.s3ObjectUrl,
        },
        defaultArguments: {
          "--name": "",
        },
        role: role.roleArn,
        executionProperty: {
          maxConcurrentRuns: 1,
        },
        glueVersion: "3.0",
        maxRetries: 1,
        timeout: 300,
        maxCapacity: 1,
      }
    );

    // trigger to craw raw data
    const trigger = new aws_glue.CfnTrigger(
      this,
      `StartTrigger-${props.pipelineName}`,
      {
        name: `StartTrigger-${props.pipelineName}`,
        description: "start the etl job demo",
        actions: [
          {
            crawlerName: crawler.name,
            timeout: 300,
          },
        ],
        workflowName: workflow.name,
        type: "ON_DEMAND",
      }
    );

    // trigger transform etl job
    const triggerEtl = new aws_glue.CfnTrigger(
      this,
      `TriggerTranformJob-${props.pipelineName}`,
      {
        name: `TriggerTranformJob-${props.pipelineName}`,
        description: "trigger etl transform",
        actions: [
          {
            jobName: job.name,
            timeout: 300,
          },
        ],
        workflowName: workflow.name,
        type: "CONDITIONAL",
        //true: when working with conditional and schedule
        startOnCreation: true,
        predicate: {
          conditions: [
            {
              logicalOperator: "EQUALS",
              crawlState: "SUCCEEDED",
              crawlerName: crawler.name,
            },
          ],
          // logical: "ANY",
        },
      }
    );

    //
    const triggerTransformedCrawler = new aws_glue.CfnTrigger(
      this,
      `TriggerTransformedCrawler-${props.pipelineName}`,
      {
        name: `TriggerTransformedCrawler-${props.pipelineName}`,
        actions: [
          {
            crawlerName: crawlerTransforedData.name,
            timeout: 300,
          },
        ],
        workflowName: workflow.name,
        type: "CONDITIONAL",
        startOnCreation: true,
        predicate: {
          conditions: [
            {
              logicalOperator: "EQUALS",
              state: "SUCCEEDED",
              jobName: job.name,
            },
          ],
        },
      }
    );

    // grant data location permission
    props.sourceBucketPrefixes.map((prefix) => {
      new aws_lakeformation.CfnPrincipalPermissions(
        this,
        `GrantS3SourceLocationPermission-${prefix}`,
        {
          permissions: ["DATA_LOCATION_ACCESS"],
          permissionsWithGrantOption: ["DATA_LOCATION_ACCESS"],
          principal: {
            dataLakePrincipalIdentifier: role.roleArn,
          },
          resource: {
            dataLocation: {
              catalogId: this.account,
              resourceArn: `arn:aws:s3:::${props.sourceBucket}/${prefix}`,
            },
          },
        }
      );
    });
    // grant data location permission
    props.lakeBucketPrefixes.map((prefix) => {
      new aws_lakeformation.CfnPrincipalPermissions(
        this,
        `GrantLocationPermission-${prefix}`,
        {
          permissions: ["DATA_LOCATION_ACCESS"],
          permissionsWithGrantOption: ["DATA_LOCATION_ACCESS"],
          principal: {
            dataLakePrincipalIdentifier: role.roleArn,
          },
          resource: {
            dataLocation: {
              catalogId: this.account,
              resourceArn: `arn:aws:s3:::${props.lakeBucket}/${prefix}`,
            },
          },
        }
      );
    });

    trigger.addDependency(crawler);
    triggerEtl.addDependency(job);
    triggerEtl.addDependency(crawler);
    triggerTransformedCrawler.addDependency(crawlerTransforedData);

    this.glueRole = new aws_iam.ArnPrincipal(role.roleArn);
  }
}

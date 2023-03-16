import {
  aws_glue,
  aws_iam,
  aws_s3_assets,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { Effect } from "aws-cdk-lib/aws-iam";

interface RdsPipelineProps extends StackProps {
  name: string;
  jdbc: string;
  username: string;
  password: string;
  az: string;
  securityGroupId: string;
  subnetId: string;
  databaseName: string;
  databasePath: string;
}

export class RdsPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: RdsPipelineProps) {
    super(scope, id, props);

    const etlScript = new aws_s3_assets.Asset(this, "EtlScriptRdsToLakeDemo", {
      path: path.join(__dirname, "./../script/etl_rds_to_lake.py"),
    });

    const role = new aws_iam.Role(this, `${props.name}-RoleForGlueEtljob`, {
      roleName: `${props.name}-RoleForGlueEtljob`,
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

    etlScript.grantRead(role);

    const connection = new aws_glue.CfnConnection(this, "RdsConnectionDemo", {
      catalogId: this.account,
      connectionInput: {
        connectionType: "JDBC",
        description: "connect to rds",
        name: "RdsConnectionDemo",
        connectionProperties: {
          JDBC_CONNECTION_URL: props.jdbc,
          USERNAME: props.username,
          PASSWORD: props.password,
        },
        physicalConnectionRequirements: {
          availabilityZone: props.az,
          securityGroupIdList: [props.securityGroupId],
          subnetId: props.subnetId,
        },
      },
    });

    const crawler = new aws_glue.CfnCrawler(this, "CrawlRdsDemo", {
      name: "CrawlRdsDemo",
      role: role.roleArn,
      targets: {
        jdbcTargets: [
          {
            connectionName: connection.ref,
            path: props.databasePath,
          },
        ],
      },
      databaseName: props.databaseName,
      tablePrefix: "rds_crawl_",
    });

    const job = new aws_glue.CfnJob(this, "CrawRdsToLakeDemo", {
      name: "CrawRdsToLakeDemo",
      command: {
        name: "glueetl",
        pythonVersion: "3",
        scriptLocation: etlScript.s3ObjectUrl,
      },
      defaultArguments: {
        "--name": "",
      },
      role: role.roleArn,
      executionProperty: {
        maxConcurrentRuns: 10,
      },
      connections: {
        connections: [connection.ref],
      },
      glueVersion: "3.0",
      maxRetries: 0,
      timeout: 300,
      maxCapacity: 1,
    });

    const workflow = new aws_glue.CfnWorkflow(this, "EtlRdsToLakeWorkFlow", {
      name: "EtlRdsToLakeWorkFlow",
      description: "rds to lake demo",
    });

    const startingTrigger = new aws_glue.CfnTrigger(this, "TriggerStartCrawRds", {
      name: "TriggerStartCrawRds",
      description: "trigger start craw rds",
      actions: [
        {
          crawlerName: crawler.name,
          timeout: 420,
        },
      ],
      workflowName: workflow.name,
      type: "ON_DEMAND",
    });

    const etlTrigger = new aws_glue.CfnTrigger(this, "TriggerTransformRdsTable", {
      name: "TriggerTransformRdsTable",
      description: "trigger transform rds table",
      actions: [
        {
          jobName: job.name,
          timeout: 420,
        },
      ],
      workflowName: workflow.name,
      type: "CONDITIONAL",
      startOnCreation: true,
      predicate: {
        conditions: [
          {
            logicalOperator: "EQUALS",
            crawlState: "SUCCEEDED",
            crawlerName: crawler.name,
          },
        ],
      },
    });

    etlScript.grantRead(role);

    startingTrigger.addDependency(workflow)
    etlTrigger.addDependency(workflow)
  }
}

import {
  aws_lakeformation,
  aws_s3,
  DefaultStackSynthesizer,
  Fn,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { CustomAthenaPrimaryWorkGroup } from "./athena-primary-workgroup";

interface LakeFormationProps extends StackProps {
  s3LakeName: string;
  registerBuckets: string[];
  queryResultLocation: string;
}

export class LakeFormationStack extends Stack {
  public readonly s3Lake: aws_s3.Bucket;
  public readonly lakeCdkAmin: aws_lakeformation.CfnDataLakeSettings;

  constructor(scope: Construct, id: string, props: LakeFormationProps) {
    super(scope, id, props);

    // lake formation setting admin
    this.lakeCdkAmin = new aws_lakeformation.CfnDataLakeSettings(
      this,
      "LakeFormationAdminSetting",
      {
        admins: [
          {
            dataLakePrincipalIdentifier: Fn.sub(
              (this.synthesizer as DefaultStackSynthesizer)
                .cloudFormationExecutionRoleArn
            ),
          },
        ],
      }
    );

    // create s3 lake
    this.s3Lake = new aws_s3.Bucket(this, "S3LakeBucketDemo", {
      bucketName: props.s3LakeName,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true 
    });

    var registers: aws_lakeformation.CfnResource[] = [];

    props.registerBuckets.map((bucket) => {
      registers.push(
        new aws_lakeformation.CfnResource(
          this,
          `RegsiterBucketToLake-${bucket}`,
          {
            resourceArn: `arn:aws:s3:::${bucket}`,
            // use AWSServiceRoleForLakeFormationDataAccess role
            useServiceLinkedRole: true,
          }
        )
      );
    });

    // athena query result location via workgroup
    new CustomAthenaPrimaryWorkGroup(this, "CustomAthenaPrimaryWorkGroup-1", {
      queryResultLocation: props.queryResultLocation,
    });

    registers.map((register) => {
      register.addDependency(this.lakeCdkAmin);
    });
  }

  public grantGlueRole({
    pipelineName,
    roleArn,
    bucketPrefix,
    locationBucket,
  }: {
    pipelineName: string;
    roleArn: string;
    bucketPrefix: string;
    locationBucket: string;
  }) {
    const permision = new aws_lakeformation.CfnPrincipalPermissions(
      this,
      `GlueWriteCatalog-${pipelineName}`,
      {
        permissions: ["DATA_LOCATION_ACCESS"],
        permissionsWithGrantOption: ["DATA_LOCATION_ACCESS"],
        principal: {
          dataLakePrincipalIdentifier: roleArn,
        },
        resource: {
          dataLocation: {
            catalogId: this.account,
            resourceArn: `arn:aws:s3:::${locationBucket}/${bucketPrefix}`,
          },
        },
      }
    );

    permision.addDependency(this.lakeCdkAmin);
  }

  public grantDataAnalyst({
    userArn,
    databasePermissions,
    databaseName,
  }: {
    userArn: string;
    databasePermissions: string[];
    databaseName: string;
  }) {
    const permission = new aws_lakeformation.CfnPrincipalPermissions(
      this,
      `UserReadCatalog-${userArn}`,
      {
        permissions: databasePermissions,
        permissionsWithGrantOption: databasePermissions,
        principal: {
          dataLakePrincipalIdentifier: userArn,
        },
        resource: {
          database: {
            catalogId: this.account,
            name: databaseName,
          },
        },
      }
    );
    permission.addDependency(this.lakeCdkAmin);
  }
}

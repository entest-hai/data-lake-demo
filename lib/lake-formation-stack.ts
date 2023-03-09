import {
  aws_lakeformation,
  DefaultStackSynthesizer,
  Fn,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface LakeFormationProps extends StackProps {
  registerBucketData: string;
}

export class LakeFormationStack extends Stack {
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

    // lake formation register location (s3)
    const registerData = new aws_lakeformation.CfnResource(
      this,
      "RegisterDataLakeFormation",
      {
        resourceArn: props.registerBucketData,
        // role which lake formation access s3
        // roleArn: "",
        // use AWSServiceRoleForLakeFormationDataAccess role
        useServiceLinkedRole: true,
      }
    );

    registerData.addDependency(this.lakeCdkAmin);

    // athena workgroup: setup same athena query result prefix for all users
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

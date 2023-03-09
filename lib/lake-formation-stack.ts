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
  constructor(scope: Construct, id: string, props: LakeFormationProps) {
    super(scope, id, props);

    // lake formation setting admin
    new aws_lakeformation.CfnDataLakeSettings(
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
    new aws_lakeformation.CfnResource(this, "RegisterDataLakeFormation", {
      resourceArn: props.registerBucketData,
      // role which lake formation access s3
      // roleArn: "",
      // use AWSServiceRoleForLakeFormationDataAccess role
      useServiceLinkedRole: true,
    });
  }

  public grantGlueRole(roleArn: string, bucketPrefix: string) {
    console.log(roleArn);

    new aws_lakeformation.CfnPrincipalPermissions(
      this,
      `${roleArn}-GlueWriteCatalog`,
      {
        permissions: ["DATA_LOCATION_ACCESS"],
        permissionsWithGrantOption: ["DATA_LOCATION_ACCESS"],
        principal: {
          dataLakePrincipalIdentifier: roleArn,
        },
        resource: {
          dataLocation: {
            catalogId: this.account,
            resourceArn: bucketPrefix,
          },
        },
      }
    );
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
    new aws_lakeformation.CfnPrincipalPermissions(
      this,
      `${userArn}-UserReadCatalog`,
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
  }
}

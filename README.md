---
---

## Introduction

This shows how to use lake formation to manage authorization to analyst and data pipeline.

- underlying access control
- register data
- data lake permissions
- data location permissions
- enroll a data analyst (read catalog and query)
- enroll a data pipeline (write/create catalog)

## Register Admin and Data

This is first and important step. By registering cdk execution role as an Admin in Lake Formation, then cdk can deploy things, otherwise, it will fail.

```ts
new aws_lakeformation.CfnDataLakeSettings(this, "LakeFormationAdminSetting", {
  admins: [
    {
      dataLakePrincipalIdentifier: Fn.sub(
        (this.synthesizer as DefaultStackSynthesizer)
          .cloudFormationExecutionRoleArn
      ),
    },
  ],
});
```

Then start to register data (bucket prefixes) together with a role so Lake Formation will manage access on be-half of you. This is called [underlying access control](https://docs.aws.amazon.com/lake-formation/latest/dg/access-control-underlying-data.html#data-location-permissions)

- an IAM user for a data analyst will get temporary credentials from Lake Formation to query data in S3
- an Glue role will get temporary credentials from Lake Formation to create catalogs

```ts
new aws_lakeformation.CfnResource(this, "RegisterDataLakeFormation", {
  resourceArn: props.registerBucketData,
  // role which lake formation access s3
  // roleArn: "",
  // use AWSServiceRoleForLakeFormationDataAccess role
  useServiceLinkedRole: true,
});
```

## Grant Database Permissions

```ts
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
```

## Grant Data Location

```ts
new aws_lakeformation.CfnPrincipalPermissions(this, `GlueWriteCatalog-1`, {
  permissions: ["DATA_LOCATION_ACCESS"],
  permissionsWithGrantOption: ["DATA_LOCATION_ACCESS"],
  principal: {
    dataLakePrincipalIdentifier: roleArn,
  },
  resource: {
    dataLocation: {
      catalogId: this.account,
      resourceArn: `arn:aws:s3:::${locationBucket}${bucketPrefix}`,
    },
  },
});
```

## Secrete Manager

How to use secret manager in CDK to create password for an IAM user.

```ts
const daUser = new aws_iam.User(this, "DataAnalystUserDemo", {
  userName: "DataAnalyst",
  password: aws_secretsmanager.Secret.fromSecretNameV2(
    this,
    "DataAnalystDemoPassword",
    "DataAnalystDemoPassword"
  ).secretValueFromJson("DataAnalystDemoPassword"),
  passwordResetRequired: false,
});
```

## Athena Workgroup

It is possible to use workgroup to set up the same athena query result for all users.

[here](https://docs.aws.amazon.com/athena/latest/ug/workgroups-settings.html)

## Troubleshooting

- Ensure that the role for deploying CDK stack is choosend as an admin in lakeformation
- Goto the LakeFormation console and select the CDK deploy role to be an admin
- Database and table has different set of permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lakeformation:GetDataAccess",
        "glue:GetTable",
        "glue:GetTables",
        "glue:SearchTables",
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetPartitions",
        "lakeformation:GetResourceLFTags",
        "lakeformation:ListLFTags",
        "lakeformation:GetLFTag",
        "lakeformation:SearchTablesByLFTags",
        "lakeformation:SearchDatabasesByLFTags",
        "athena:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::bucket-name", "arn:aws:s3:::bucket-name/*"]
    }
  ]
}
```

## Reference

- [underlying data access control in lake formation](https://docs.aws.amazon.com/lake-formation/latest/dg/access-control-underlying-data.html#data-location-permissions)

- [create a data analyst user](https://docs.aws.amazon.com/lake-formation/latest/dg/cloudtrail-tut-create-lf-user.html)

- [AWSServiceRoleForLakeFormationDataAccess](https://docs.aws.amazon.com/lake-formation/latest/dg/service-linked-roles.html)

- [lakeformation:GetDataAccess](https://docs.aws.amazon.com/lake-formation/latest/dg/access-control-underlying-data.html#data-location-permissions)

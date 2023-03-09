---
---

## Introduction

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
      "Resource": [
        "arn:aws:s3:::haimtran-codepipeline-artifact",
        "arn:aws:s3:::haimtran-codepipeline-artifact/*"
      ]
    }
  ]
}
```

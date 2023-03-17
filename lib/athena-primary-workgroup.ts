import { aws_iam, aws_lambda, CustomResource, Duration } from "aws-cdk-lib";
import { Effect } from "aws-cdk-lib/aws-iam";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

interface PrimaryProps {
  queryResultLocation: string;
}

export class CustomAthenaPrimaryWorkGroup extends Construct {
  constructor(scope: Construct, id: string, props: PrimaryProps) {
    super(scope, id);

    const role = new aws_iam.Role(this, "RoleForOnEventLambda", {
      roleName: "RoleForOnEventLambda",
      assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    role.addToPolicy(
      new aws_iam.PolicyStatement({
        resources: ["*"],
        actions: ["athena:UpdateWorkGroup"],
        effect: Effect.ALLOW,
      })
    );

    const onEvent = new aws_lambda.SingletonFunction(this, "SingleTon", {
      role: role,
      uuid: "f7d4f730-PPPP-11e8-9c2d-fa7ae01bbebc",
      code: aws_lambda.Code.fromInline(
        fs.readFileSync(path.join(__dirname, "./../script/on_event.py"), {
          encoding: "utf-8",
        })
      ),
      handler: "index.handler",
      timeout: Duration.seconds(60),
      runtime: aws_lambda.Runtime.PYTHON_3_9,
    });

    // const isComplete = new aws_lambda.Function(this, "IsCompleteLambda", {
    //   functionName: "IsCompleteLambda",
    //   code: aws_lambda.Code.fromInline(
    //     fs.readFileSync(path.join(__dirname, "./../script/is_complete.py"), {
    //       encoding: "utf-8",
    //     })
    //   ),
    //   runtime: aws_lambda.Runtime.PYTHON_3_9,
    //   handler: "index.handler",
    // });

    const myProvider = new Provider(this, "MyCustomProvider", {
      onEventHandler: onEvent,
      // isCompleteHandler: isComplete,
      // logRetention: aws_logs.RetentionDays.ONE_DAY,
      // role: role,
    });

    new CustomResource(this, "MyCustomer", {
      serviceToken: myProvider.serviceToken,
      properties: {
        WorkGroupName: "primary",
        TargetOutputLocationS3Url: `${props.queryResultLocation}`,
      },
    });
  }
}

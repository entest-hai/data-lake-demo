import boto3
import logging
import cfnresponse

client = boto3.client("athena")
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    request_type = event["RequestType"]
    if request_type == "Create":
        return on_create(event, context)
    if request_type == "Update":
        return on_create(event, context)
    if request_type == "Delete":
        return on_delete(event, context)
    raise Exception("invalid request type")


def on_create(event, context):
    workGroupName = event["ResourceProperties"]["WorkGroupName"]
    targetOutputLocationS3Url = event["ResourceProperties"][
        "TargetOutputLocationS3Url"
    ]
    response = client.update_work_group(
        WorkGroup=workGroupName,
        Description="primary workgroup",
        ConfigurationUpdates={
            "ResultConfigurationUpdates": {
                "OutputLocation": targetOutputLocationS3Url
            }
        },
    )
    responseData = {}
    responseData["response"] = response
    responseData["statusMessage"] = "workgroup updated"
    logger.info("Workgroup updated")
    cfnresponse.send(
        event, context, cfnresponse.SUCCESS, responseData
    )
    return


def on_delete(event, context):
    responseData = {}
    responseData["Complete"] = "True"
    physicalResource = event["PhysicalResourceId"]
    cfnresponse.send(
        event,
        context,
        cfnresponse.SUCCESS,
        responseData,
        physicalResource,
    )
    return

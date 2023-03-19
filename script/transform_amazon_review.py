import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ["JOB_NAME"])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

# Script generated for node S3 bucket
S3bucket_node1 = glueContext.create_dynamic_frame.from_catalog(
    database="default",
    # hardcode
    table_name="amazon_review_parquet",
    transformation_ctx="S3bucket_node1",
)

# Script generated for node S3 bucket
S3bucket_node3 = glueContext.getSink(
    # hardcode
    path="s3://${YOUR LAKE_BUCKET_NAME}/amazon-review/",
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=[],
    compression="snappy",
    enableUpdateCatalog=True,
    transformation_ctx="S3bucket_node3",
)
S3bucket_node3.setCatalogInfo(
    catalogDatabase="default",
    # hardcode
    catalogTableName="amazon_review_crawled_test",
)
S3bucket_node3.setFormat("glueparquet")
S3bucket_node3.writeFrame(S3bucket_node1)
job.commit()

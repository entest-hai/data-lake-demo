import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

sc = SparkContext.getOrCreate()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
dyf = glueContext.create_dynamic_frame.from_catalog(
    database="default", table_name="etldata"
)
dyf.printSchema()
df = dyf.toDF()
df.show()
dy_sub = dyf.select_fields(
    paths=[
        "col0",
        "col1",
        "col2",
        "col3",
        "col4",
        "col5",
        "col6",
        "col7",
    ]
)
dy_sub.toDF().show()
dy_new = dy_sub.apply_mapping(
    [
        ("col0", "long", "globaleventid", "bigint"),
        ("col1", "long", "sqldate", "bigint"),
        ("col2", "long", "monthyear", "bigint"),
        ("col3", "long", "year", "bigint"),
        ("col4", "double", "fractionadate", "double"),
        ("col5", "string", "actor1code", "string"),
        ("col6", "string", "actor1name", "string"),
        ("col7", "string", "actor1countrycode", "string"),
    ]
)
dy_new.printSchema()
s3output = glueContext.getSink(
    path="s3://haimtran-codepipeline-artifact/spark-output",
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=[],
    compression="snappy",
    enableUpdateCatalog=True,
    transformation_ctx="s3output",
)
s3output.setCatalogInfo(
    catalogDatabase="default", catalogTableName="populations"
)
s3output.setFormat("glueparquet")
s3output.writeFrame(dy_new)
job.commit()

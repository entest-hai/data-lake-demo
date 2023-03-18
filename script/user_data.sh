export host=database-1.c7esxr3n94ul.us-east-1.rds.amazonaws.com:3306/demo
export pass=get_from_secret_maanger
yum update 
yum install unzip 
yum install -y mariadb
wget https://downloads.mysql.com/docs/sakila-db.zip . 
unzip sakila-db.zip
cdk sakila-db 
#mysql --host=$host --user=admin --password=$pass -f < sakila-db/sakila-schema.sql 
#mysql --host=$host --user=admin --password=$pass -f < sakila-db/sakila-data.sql 

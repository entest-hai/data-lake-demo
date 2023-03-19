export host=database-1.c7esxr3n94ul.us-east-1.rds.amazonaws.com:3306/demo
export pass=get_from_secret_maanger
yum update 
yum install unzip 
yum install -y mariadb
wget https://downloads.mysql.com/docs/sakila-db.zip . 
unzip sakila-db.zip
cdk sakila-db
touch run.sh 
echo 'export host=' >> run.sh
echo 'export user=demo' >> run.sh
echo 'export password=' >> run.sh
echo 'mysql --host=$host --user=$user --password=$password -f > sakila-schema.sql'
echo 'mysql --host=$host --user=$user --password=$password -f > sakila-data.sql'
chmod 700 run.sh 

cdk bootstrap aws://115736523957/us-east-1
cdk --app 'npx ts-node --prefer-ts-exts bin/vpc-rds-ec2.ts' synth
cdk --app 'npx ts-node --prefer-ts-exts bin/data-lake-demo.ts' synth

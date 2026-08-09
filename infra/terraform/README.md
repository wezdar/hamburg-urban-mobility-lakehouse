# Cloud reference stack

This reviewed Terraform module describes a secure, recruiter-readable AWS migration path:

- versioned and encrypted S3 storage for bronze/silver lakehouse partitions;
- private Fargate tasks for the dashboard;
- CloudWatch logs and ECS Container Insights;
- immutable container images supplied by CI.

It intentionally expects an existing VPC, private subnets, security groups and an image URI. The repository validates the module in CI but never applies it automatically or stores cloud credentials.

```bash
terraform init
terraform plan \
  -var='dashboard_image=ACCOUNT.dkr.ecr.eu-central-1.amazonaws.com/elbeflow:SHA' \
  -var='private_subnet_ids=["subnet-..."]' \
  -var='security_group_ids=["sg-..."]'
```

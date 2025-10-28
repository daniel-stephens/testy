aws_region = "us-east-1"
key_name   = "tova"

repo_url    = "https://github.com/daniel-stephens/testy.git"
repo_branch = "main"

# IMPORTANT: repo root (the script will run Gunicorn from ${app_workdir}/app)
app_workdir  = "/home/ubuntu/tova"
app_module   = "app:app"
service_name = "tova"
domain_name  = ""

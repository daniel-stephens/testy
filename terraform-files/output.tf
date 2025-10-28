output "public_ip" { value = aws_instance.web.public_ip }
output "public_dns" { value = aws_instance.web.public_dns }

# (nice to have)
output "ssh_cmd" {
  value = "ssh -i ~/Downloads/tova.pem ubuntu@${aws_instance.web.public_ip}"
}

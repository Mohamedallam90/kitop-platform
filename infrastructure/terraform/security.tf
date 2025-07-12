# This resource creates a specific security group rule.
# It explicitly allows the EKS control plane's security group to communicate
# with the worker node's security group on all TCP ports. This is sometimes
# needed to resolve i/o timeout issues during initial cluster communication.

resource "aws_security_group_rule" "control_plane_to_nodes_all" {
  # This rule applies to the worker node security group.
  security_group_id = module.eks.node_security_group_id

  type        = "ingress" # It's an inbound rule
  protocol    = "tcp"     # For TCP traffic
  from_port   = 0         # From any port
  to_port     = 65535   # To any port

  # The source of the traffic is the cluster's main security group.
  source_security_group_id = module.eks.cluster_security_group_id
}

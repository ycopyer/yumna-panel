# Yumna Agent (Server Executor)

This directory contains the lightweight agent that runs on each server node to execute commands.

## Responsibilities
- System Level Execution (Docker, Nginx, Systemd)
- Resource Monitoring (Stats)
- Security Enforcement (Firewall)
- Heartbeat Reporting to WHM

## Security
- Runs with minimal necessary privileges
- Authenticated communication with WHM only

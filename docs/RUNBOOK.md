## Python Service

To run python server in linux using systemd, run

```bash
systemd-run --user --unit=graspy-server --property=Restart=always --property=RestartSec=2 bash -lc 'cd /opt/graspy/apps/server && uv run main.py'
```

To monitor run

```bash
systemctl --user status graspy-server
```

or

```bash
journalctl --user -u graspy-server -f
```

To stop
or

```bash
systemctl --user stop graspy-server
```

## NextJS Frontend

This is managed using pm2
`pm list` to see all run pm managed app
`pm2 start ecosystem.config.js --only graspy-web` to start
`pm2 stop graspy-web` to stop
`pm2 delete graspy-web` to delete
`pm2 logs graspy-web --lines 100` for logs

## Ngnix

Nginx and ansible is used to manage the setup on a vps

pwd: /root/ansible-graspy
Run `ansible-playbook playbooks/deploy.yml -e "app_config=graspy"`

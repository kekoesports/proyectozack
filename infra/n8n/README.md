# SocialPro automation stack

Production-oriented self-hosted n8n stack for `n8n.socialpro.es`:

- Caddy terminates HTTPS and is the only public container.
- n8n runs behind Caddy and is not exposed directly on port 5678.
- PostgreSQL is isolated on an internal Docker network.
- The external n8n task runner isolates Code node execution.
- Persistent named volumes retain database, n8n, file and TLS data.

## First deployment

1. Install Docker Engine and the Compose plugin from Docker's official Debian repository.
2. Copy this directory to `/opt/socialpro/n8n`.
3. Copy `.env.example` to `.env` and replace all placeholder secrets.
4. Create an `A` record for `n8n.socialpro.es` pointing at the VPS IPv4 address.
5. Validate and start:

   ```bash
   docker compose config --quiet
   docker compose pull
   docker compose up -d
   docker compose ps
   ```

6. Open `https://n8n.socialpro.es`, create the owner account and enable n8n 2FA.

Do not commit `.env`, exported credentials, database dumps or n8n encryption keys.

## Operations

```bash
# Status and logs
docker compose ps
docker compose logs --tail=200 n8n caddy postgres n8n-runner

# Upgrade after reviewing n8n release notes
sed -i 's/^N8N_VERSION=.*/N8N_VERSION=x.y.z/' .env
docker compose pull
docker compose up -d

# Stop without deleting data
docker compose stop
```

Back up both PostgreSQL and the `n8n_data` volume. The database alone is not
enough: the n8n encryption key and instance data are required to decrypt saved
credentials.

## SocialPro workflows

Import the JSON files under [`workflows/`](./workflows/) from the n8n editor:

- `socialpro-deal-intake.json`: webhook to create an idempotent CRM deal.
- `socialpro-progress-alerts.json`: hourly Sheet sync and one-time 70/80/100 alerts.

Both imports start disabled and intentionally contain no secrets. Before a test:

1. create an n8n **Header Auth** credential named for the SocialPro CRM;
2. set header `Authorization` to `Bearer <AUTOMATION_API_TOKEN>`;
3. select it in every HTTP Request node;
4. deploy the CRM API and migration documented in
   [`docs/n8n-automation-api.md`](../../docs/n8n-automation-api.md);
5. run each workflow manually with test data before activating its trigger.

The progress workflow ends in a placeholder node. Replace it with the approved
Discord, WhatsApp Business or email node only after configuring that provider's
credential in n8n.

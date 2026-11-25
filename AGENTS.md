# Production hosting comes first

- **RMA CRM deploys only to its own Hostinger VDS: `rma-vps` (`31.97.105.52`). Never use `takevps` / `187.127.219.106` for RMA deployments, databases, backups, or runtime dependencies.** The public URL is `https://crm.rma.network`; see `rma/AGENTS.md` before any work.

# Project identity

- MyCRM is the underlying CRM built by the owner.
- TAKE Auto was the previous client for whom MyCRM was originally built.
- This workspace adapts the same MyCRM for a different, new client named RMA. This client's deployment is called **RMA CRM**.
- Refer to the current client's application as **RMA CRM** in user-facing discussion. Do not call RMA the underlying product, treat TAKE Auto as the current client, or rename historic client integration identifiers indiscriminately.
- The current application is in `rma/`; read `rma/AGENTS.md` for its architecture rules. Its older TAKE Auto handoff describes the inherited implementation, not the current client identity.

Identity clarified explicitly by the owner on 2026-10-21.

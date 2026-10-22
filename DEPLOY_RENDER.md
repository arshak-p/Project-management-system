# Deploying Colour Parrot on Render

Your system has three parts. `render.yaml` in this repository creates all of them:

| Part | Render service | What it does |
|---|---|---|
| Website | `colour-parrot-web` (static site) | The React screens people use |
| API | `colour-parrot-api` (web service) | Django: logins, tasks, live notifications |
| Scheduler | `colour-parrot-worker` (worker) | Monthly backups, deadline reminders, birthdays |
| Data | `colour-parrot-db` (Postgres), `colour-parrot-redis` (Key Value) | Storage and live messages |

Right now the API is on Render and the website is on Hostinger. Both options below work.

## Option A: keep your current Render API, just update it (fastest)

1. Merge to `master` (already done). Render redeploys the API by itself.
2. In Render -> your API service -> **Environment**, make sure these exist:
   - `DJANGO_SECRET_KEY` (long random text; the app refuses to start without it)
   - `DJANGO_DEBUG` = `false`
   - `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` (Gmail **app password**, needed for OTP codes and backup emails)
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (only used to create the first admin)
3. The website on Hostinger still shows the OLD screens until you upload the new ones:
   `cd frontend && npm ci && npm run build`, then upload everything inside `frontend/dist/` to Hostinger `public_html`.

## Option B: everything on Render (recommended)

1. Render dashboard -> **New -> Blueprint** -> choose this GitHub repository and branch `master`.
2. Render shows the five resources and asks for the secret values: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`. Fill them in and click **Apply**.
3. Wait for all services to say **Live** (first build takes about 5-10 minutes).
4. Open the `colour-parrot-web` address. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
5. Move your data: Render -> old database -> **Connect** to get its URL, then run
   `pg_dump <old-url> | psql <new-url>` from any computer with PostgreSQL tools.
   Skip this step only if you want to start empty.
6. Move your domain: in Render -> `colour-parrot-web` -> **Settings -> Custom Domains** add `c1r9rt-workflow.in`,
   then change the DNS records at Hostinger to the values Render shows. Remove the old Hostinger site after it works.
7. If your API address is not `colour-parrot-api.onrender.com`, change `VITE_API_URL` on `colour-parrot-web`
   to the real address and redeploy the website.

Costs (Render prices change, check the pricing page): static site free; API and worker on **Starter**; Postgres on a paid plan
(the free Postgres is deleted after 30 days, so do not use it for real data); Key Value free tier.

## After every deploy: quick check

1. `https://<api>/` shows `{"service": "Colour Parrot API", "status": "running"}`.
2. Sign in on the website. A wrong password must say "Invalid email or password", not a server error.
3. As a team member, press **Start** on a task. As an admin, open **Settings -> Backups**.
4. Add a person: the 6-digit code must arrive by email. If the screen says the code could not be emailed,
   the Gmail app password is wrong or missing.

## Things to know

- **Why it can feel slow:** a free or Starter web service that has been idle can take 30-60 seconds to wake up.
  Use a paid always-on plan and keep the API and database in the same region (Singapore).
- **Uploaded files** (task attachments) live on the server disk, which Render erases on every deploy.
  Add a Render **Disk** mounted at `/opt/render/project/src/media`, or move files to S3.
- **Backups need `pg_dump`.** Render's Python image may not include it. If it is missing, each backup zip contains a file
  called `DATABASE_BACKUP_ERROR.txt` instead of the SQL dump. The CSV sheets are always included. Render's own
  database backups (paid Postgres plans) cover the database itself.
- **Secrets are never stored in git.** The old `.env` file was removed from tracking, but it is still in git history,
  so change the Gmail app password, database password and secret key that were in it.

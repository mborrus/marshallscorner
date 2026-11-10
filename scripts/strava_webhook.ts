// Manage the Strava push subscription (one per Strava app).
//   npx tsx scripts/strava_webhook.ts create https://<site>/api/strava/webhook
//   npx tsx scripts/strava_webhook.ts list
//   npx tsx scripts/strava_webhook.ts delete <id>
// Needs STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and (for create) STRAVA_VERIFY_TOKEN in the environment.
// The site must already be deployed with the same STRAVA_VERIFY_TOKEN: Strava calls it during create.

const URL_BASE = 'https://www.strava.com/api/v3/push_subscriptions';

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const auth = { client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET') };
  let res: Response;
  if (cmd === 'create' && arg) {
    res = await fetch(URL_BASE, {
      method: 'POST',
      body: new URLSearchParams({ ...auth, callback_url: arg, verify_token: env('STRAVA_VERIFY_TOKEN') }),
    });
  } else if (cmd === 'list') {
    res = await fetch(`${URL_BASE}?${new URLSearchParams(auth)}`);
  } else if (cmd === 'delete' && arg) {
    res = await fetch(`${URL_BASE}/${arg}?${new URLSearchParams(auth)}`, { method: 'DELETE' });
  } else {
    console.error('Usage: strava_webhook.ts create <callback_url> | list | delete <id>');
    process.exit(1);
  }
  console.log(res.status, await res.text());
  if (cmd === 'create' && res.ok) console.log('Set STRAVA_SUBSCRIPTION_ID on Vercel to the id above.');
}

main();

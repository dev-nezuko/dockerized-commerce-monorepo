# Eco Bottle frontend

Next.js 16 (App Router) storefront: a server-rendered catalog with SWR revalidation and a product enquiry form. Setup, screenshots and the API contract are in the [repository README](../../README.md).

```sh
npm ci
cp .env.example .env.local   # API URLs; both are public values
npm run dev                  # http://localhost:3000
npm test && npm run lint && npm run typecheck
```

`NEXT_PUBLIC_API_URL` is compiled into the browser bundle, so never put a secret in it. `INTERNAL_API_URL` is what the Next.js server uses while rendering.

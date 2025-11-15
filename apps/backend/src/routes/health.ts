import express from 'express';

export function healthRouter(): express.Router {
  const router = express.Router();
  router.get('/health', (_req, res) => {
    const uptime = process.uptime();
    const version = process.env.npm_package_version ?? '0.0.0';
    const commitSha = process.env.COMMIT_SHA;
    res.json({ status: 'ok', uptime, version, commitSha });
  });
  return router;
}

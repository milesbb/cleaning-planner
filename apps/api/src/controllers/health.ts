import { Router } from 'express';

interface HealthBody {
  status: 'ok';
  version: string;
}

export function healthRouter(version: string): Router {
  const router = Router();
  router.get('/', (_request, response) => {
    const body: HealthBody = { status: 'ok', version };
    response.json(body);
  });
  return router;
}

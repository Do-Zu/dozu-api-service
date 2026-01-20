import { Router } from 'express';
import { registerRoute } from '../register.routes';
import { generateV4Routes } from './v4/generate.routes';
import { generateV3Routes } from './v3/generate.routes';

const router = Router();

router.use('/v3', generateV3Routes);

router.use('/v4', generateV4Routes);

registerRoute('/generate', router, {
    version: 'all',
    isEnabled: true,
});

export const generateRoutes = router;

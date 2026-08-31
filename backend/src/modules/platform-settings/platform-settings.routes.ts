import { Router } from 'express';
import { z } from 'zod';
import { parseDto } from '@/lib/http';
import { getSubcriptionTrialDays, setSubcriptionTrialDays } from '@/lib/subscription';
import { wrap } from '@/middleware/error-handler';
import { requireAuth, requireSuperAdmin } from '@/middleware/auth';
import { auditFromReq } from '@/lib/audit';

export const platformSettingsRouter = Router();

const trialDaysSchema = z.object({
  days: z.number().int().min(1).max(3650),
});

platformSettingsRouter.get(
  '/subcription-trial-days',
  requireAuth,
  requireSuperAdmin,
  wrap(async (_req, res) => {
    const days = await getSubcriptionTrialDays();
    res.json({ data: { days } });
  }),
);

platformSettingsRouter.put(
  '/subcription-trial-days',
  requireAuth,
  requireSuperAdmin,
  wrap(async (req, res) => {
    const input = parseDto(trialDaysSchema, req.body);
    const days = await setSubcriptionTrialDays(input.days);
    await auditFromReq(req, { action: 'PLATFORM_SETTING_UPDATE', resource: 'platform_settings', resourceId: 'subcription_trial_days' });
    res.json({ data: { days } });
  }),
);

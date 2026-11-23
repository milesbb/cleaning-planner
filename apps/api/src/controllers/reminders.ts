import {
  reminderSettingsSchema,
  testReminderRequestSchema,
} from '@cleaning-planner/contracts/reminders';
import { Router } from 'express';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { ReminderService } from '../services/reminder-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

export function remindersRouter(reminders: ReminderService): Router {
  const router = Router();
  router.get('/', async (_request, response) => {
    const { userId } = signedInUserOf(response);
    response.json(await reminders.getReminders(userId));
  });
  router.put('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const settings = parseOrThrow(reminderSettingsSchema, request.body);
    response.json(await reminders.saveReminders(userId, settings));
  });
  router.post('/test', async (request, response) => {
    const { userId } = signedInUserOf(response);
    parseOrThrow(testReminderRequestSchema, request.body);
    await reminders.sendTestReminder(userId);
    response.status(HttpStatus.accepted).end();
  });
  return router;
}

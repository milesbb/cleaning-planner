import { apiErrorSchema } from '@cleaning-planner/contracts/api-error';
import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { ReminderService } from '../services/reminder-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const SETTINGS: ReminderSettings = {
  timeZone: 'Europe/London',
  daily: { isOn: true, time: '08:00' },
  weekly: { isOn: true, day: 'sunday', time: '18:30' },
  onlyMyJobs: false,
  alsoByEmail: true,
};

function reminderService(): ReminderService {
  return {
    getReminders: vi.fn(() => Promise.resolve(SETTINGS)),
    saveReminders: vi.fn((_userId: string, settings: ReminderSettings) =>
      Promise.resolve(settings),
    ),
    sendTestReminder: vi.fn(() => Promise.resolve()),
    removeSchedules: vi.fn(() => Promise.resolve()),
  };
}

const SIGNED_IN_AS_SAM = signedInAs('user-sam');

describe('GET /v1/me/reminders', () => {
  it('needs a signed-in user', async () => {
    const response = await request(testApp({ reminders: reminderService() })).get(
      '/v1/me/reminders',
    );
    expect(response.status).toBe(401);
  });

  it("returns the signed-in person's reminder settings", async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .get('/v1/me/reminders')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(SETTINGS);
    expect(reminders.getReminders).toHaveBeenCalledWith('user-sam');
  });
});

describe('PUT /v1/me/reminders', () => {
  it('needs a signed-in user', async () => {
    const response = await request(testApp({ reminders: reminderService() }))
      .put('/v1/me/reminders')
      .send(SETTINGS);
    expect(response.status).toBe(401);
  });

  it('saves the settings for the signed-in person only', async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .put('/v1/me/reminders')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send(SETTINGS);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(SETTINGS);
    expect(reminders.saveReminders).toHaveBeenCalledWith('user-sam', SETTINGS);
  });

  it('says which field is wrong and saves nothing', async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .put('/v1/me/reminders')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ ...SETTINGS, daily: { isOn: true, time: '8am' } });
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).error.fields).toEqual({
      'daily.time': 'Use a time like 08:30',
    });
    expect(reminders.saveReminders).not.toHaveBeenCalled();
  });

  it("can't set someone else's reminders", async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .put('/v1/me/reminders')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ ...SETTINGS, userId: 'user-alex' });
    expect(response.status).toBe(400);
    expect(reminders.saveReminders).not.toHaveBeenCalled();
  });
});

describe('POST /v1/me/reminders/test', () => {
  it('needs a signed-in user', async () => {
    const response = await request(testApp({ reminders: reminderService() })).post(
      '/v1/me/reminders/test',
    );
    expect(response.status).toBe(401);
  });

  it("sends a test reminder to the signed-in person's own devices", async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .post('/v1/me/reminders/test')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(202);
    expect(reminders.sendTestReminder).toHaveBeenCalledWith('user-sam');
  });

  it('ignores no one else: a body naming another person is rejected', async () => {
    const reminders = reminderService();
    const response = await request(testApp({ reminders }))
      .post('/v1/me/reminders/test')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ userId: 'user-alex' });
    expect(response.status).toBe(400);
    expect(reminders.sendTestReminder).not.toHaveBeenCalled();
  });

  it('says when too many test reminders were sent', async () => {
    const reminders = reminderService();
    vi.mocked(reminders.sendTestReminder).mockRejectedValue(Errors.tooManyRequests('Slow down'));
    const response = await request(testApp({ reminders }))
      .post('/v1/me/reminders/test')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(429);
  });
});

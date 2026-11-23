import { describe, expect, it } from 'vitest';
import { appPathFrom, reminderNotificationFor } from './reminder-notification';

describe('reminderNotificationFor', () => {
  it('shows the title and body the reminder sent, opening the page it names', () => {
    const notification = reminderNotificationFor(
      JSON.stringify({ title: '3 jobs today', body: 'Wipe the hob and 2 more', url: '/week/' }),
    );
    expect(notification.title).toBe('3 jobs today');
    expect(notification.options).toMatchObject({
      body: 'Wipe the hob and 2 more',
      icon: '/icons/icon-192.png',
      tag: 'reminder',
      data: { url: '/week/' },
    });
  });

  it('opens Today when the reminder names no page', () => {
    const notification = reminderNotificationFor(
      JSON.stringify({ title: '3 jobs today', body: 'Wipe the hob and 2 more' }),
    );
    expect(notification.options.data).toEqual({ url: '/today/' });
  });

  it.each([null, '', 'not json', '{"title": 7}', JSON.stringify({ title: 'x'.repeat(201) })])(
    'still shows a calm reminder when the message is %j',
    (payload) => {
      const notification = reminderNotificationFor(payload);
      expect(notification.title).toBe('Your cleaning plan');
      expect(notification.options).toMatchObject({
        body: "Open the app to see what's due today.",
        data: { url: '/today/' },
      });
    },
  );
});

describe('appPathFrom', () => {
  it('keeps a page of this app', () => {
    expect(appPathFrom({ url: '/job/?id=job-1' })).toBe('/job/?id=job-1');
  });

  it.each([
    'https://elsewhere.example/today/',
    '//elsewhere.example/today/',
    '/\\elsewhere.example',
    'javascript:alert(1)',
    'today',
  ])('sends a link away from the app (%s) to Today instead', (url) => {
    expect(appPathFrom({ url })).toBe('/today/');
  });

  it.each([undefined, null, 'just text', { url: 7 }])(
    'opens Today when the notification carries %j',
    (data) => {
      expect(appPathFrom(data)).toBe('/today/');
    },
  );
});

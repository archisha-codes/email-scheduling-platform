import { describe, it, expect } from 'vitest';
import { RateLimiterService } from '../services/rateLimiterService';
import { EmailService } from '../services/emailService';

describe('RateLimiter & Email Helper Unit Tests', () => {
  it('should calculate correct milliseconds until the next UTC hour', () => {
    const fakeNow = new Date('2026-09-01T10:15:30.000Z');
    const msUntilNextHour = RateLimiterService.getMsUntilNextHour(fakeNow);
    // 44 minutes and 30 seconds = (44 * 60 + 30) * 1000 = 2670000ms
    expect(msUntilNextHour).toBe(2670000);
  });

  it('should validate and normalize recipient email list', () => {
    const rawRecipients = [
      '  user1@domain.com ',
      'USER2@DOMAIN.COM',
      'invalid-email-address',
      'user1@domain.com', // Duplicate
      '',
    ];

    const cleaned = EmailService.normalizeAndValidateRecipients(rawRecipients);
    expect(cleaned).toEqual(['user1@domain.com', 'user2@domain.com']);
  });
});

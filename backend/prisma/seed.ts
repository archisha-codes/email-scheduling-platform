import { PrismaClient, EmailStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data for ReachInbox Email Scheduler...');

  // 1. Create Demo User
  const user = await prisma.user.upsert({
    where: { googleId: 'demo-google-id-12345' },
    create: {
      googleId: 'demo-google-id-12345',
      email: 'outbox.company@reachinbox.ai',
      name: 'Outbox Company',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    update: {
      email: 'outbox.company@reachinbox.ai',
      name: 'Outbox Company',
    },
  });

  // 2. Create Default Sender
  const sender = await prisma.sender.upsert({
    where: { userId_email: { userId: user.id, email: user.email } },
    create: {
      userId: user.id,
      email: user.email,
      displayName: 'Outbox @ ReachInbox Outreach',
      maxEmailsPerHour: 100,
      minDelayMsBetweenSend: 2000,
    },
    update: {
      email: user.email,
      displayName: 'Outbox @ ReachInbox Outreach',
    },
  });

  // 3. Create Sample Scheduled Emails
  const now = new Date();
  const sampleRecipients = [
    'sarah.founder@techstartup.io',
    'marcus.vp@enterprise.com',
    'david.lead@growthlabs.co',
    'elena.dev@innovate.org',
  ];

  for (let i = 0; i < sampleRecipients.length; i++) {
    const recipient = sampleRecipients[i];
    const scheduledTime = new Date(now.getTime() + (i + 1) * 5 * 60 * 1000); // 5 mins apart
    const emailId = crypto.randomUUID();
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`seed:${user.id}:${recipient}:${scheduledTime.getTime()}`)
      .digest('hex');

    await prisma.email.upsert({
      where: { idempotencyKey },
      create: {
        id: emailId,
        userId: user.id,
        senderId: sender.id,
        recipient,
        subject: `Introducing AI Automated Lead Sequences - #${i + 1}`,
        body: `Hi there,\n\nI noticed your team is scaling cold outreach. ReachInbox automates personalized sequences with high deliverability.\n\nWould you be open to a 10-minute demo this week?\n\nBest,\nAlex`,
        scheduledAt: scheduledTime,
        status: EmailStatus.SCHEDULED,
        idempotencyKey,
        bullMqJobId: emailId,
      },
      update: {},
    });
  }

  console.log('Database seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

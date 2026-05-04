import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  outputDirectory: '.next',
  framework: 'nextjs',
  crons: [
    {
      path: '/api/backup?authorization=Bearer%20zvika-backup-secret-123456',
      schedule: '0 21 * * *',
    },
  ],
};

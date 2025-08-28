import { config } from 'dotenv';

config({ path: process.env.NODE_ENV === 'development' ? '.env.local' : '.env.prod' });

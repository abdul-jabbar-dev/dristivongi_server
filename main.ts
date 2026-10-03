import 'dotenv/config';
import app from './app';
import ENV from './config';
import { db } from './lib/prisma';


db.$connect().then(() => {
    console.log('Database connected');
}).catch((error) => {
    console.error('Database connection failed:', error);
});

app.listen(ENV.PORT, () => {
    console.log(`Server is running on port ${ENV.PORT}`);
});
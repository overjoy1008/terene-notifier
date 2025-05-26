const express = require('express');
const cors = require('cors');
require('dotenv').config();

const emailRouter = require('./routes/email');
const smsRouter = require('./routes/sms');
const startScheduledJobs = require('./cron/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/email', emailRouter);
app.use('/api/sms', smsRouter);

startScheduledJobs();

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});

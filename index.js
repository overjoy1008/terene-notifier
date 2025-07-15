const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require("cookie-parser")
const authRouter = require("./routes/auth")

const emailRouter = require('./routes/email');
const smsRouter = require('./routes/sms');
const startScheduledJobs = require('./cron/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "https://necessary-tenure-684644.framer.app", // TERENE-2nd 도메인
  credentials: true, // 쿠키 허용
}));
app.use(express.json());

app.use('/api/email', emailRouter);
app.use('/api/sms', smsRouter);

app.use(cookieParser())
app.use("/api/auth", authRouter)

startScheduledJobs();

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});

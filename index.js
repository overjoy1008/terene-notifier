const express = require('express');
const cors = require('cors');
require('dotenv').config();

const cookieParser = require("cookie-parser")
const authRouter = require("./routes/auth")

const emailRouter = require('./routes/email');
const emailRouterV2 = require('./routes/email.v2');
const smsRouter = require('./routes/sms');
const smsRouterV2 = require('./routes/sms.v2');
const kakaoRouterV2 = require('./routes/kakao.v2');

const startScheduledJobs = require('./cron/scheduler');
const startUpdaterJobs = require('./cron/updater');

const { router: queueRouter } = require("./queue/reservationQueue")
const { start: startQueueWorker } = require("./queue/reservationWorker")

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://necessary-tenure-684644.framer.app",
  "https://terene.kr",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser())

app.use('/api/email', emailRouter);
app.use("/api/email/v2", emailRouterV2);
app.use('/api/sms', smsRouter);
app.use("/api/sms/v2", smsRouterV2);
app.use('/api/kakao/v2', kakaoRouterV2);

app.use("/api/auth", authRouter);

startScheduledJobs();  // 기존 스케줄러
startUpdaterJobs();    // 신규 업데이터 스케줄러

app.use("/api/queue", queueRouter)
startQueueWorker()

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
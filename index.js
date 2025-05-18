const express = require('express');
const cors = require('cors');
require('dotenv').config();

const emailRouter = require('./routes/email');
const smsRouter = require('./routes/sms');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// app.use(express.static('public'));

app.use('/api/email', emailRouter);
app.use('/api/sms', smsRouter);

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});

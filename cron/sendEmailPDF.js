const nodemailer = require("nodemailer")
require("dotenv").config()

async function sendEmailPDF({
    to,
    subject,
    message,
    pdfPath,
    pdfName = "document.pdf",
    platform = "gmail",
}) {
    let transporter

    try {
        if (platform === "gmail") {
            transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.SENDER_EMAIL_USER,
                    pass: process.env.SENDER_EMAIL_PASS,
                },
            })
        } else if (platform === "custom") {
            transporter = nodemailer.createTransport({
                host: "smtp.dooray.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.SENDER_EMAIL_USER,
                    pass: process.env.SENDER_EMAIL_PASS,
                },
            })
        } else {
            console.error("❌ 지원하지 않는 platform")
            return
        }

        await transporter.sendMail({
            from: `"TERENE" <${process.env.SENDER_EMAIL_USER}>`,
            to,
            subject,
            text: message,
            attachments: [
                {
                    filename: pdfName,
                    path: pdfPath,
                    contentType: "application/pdf",
                },
            ],
        })

        console.log(`✅ [자동] PDF 이메일 전송 완료: ${to}`)
    } catch (error) {
        console.error("❌ [자동] PDF 이메일 전송 실패:", error)
    }
}

module.exports = sendEmailPDF

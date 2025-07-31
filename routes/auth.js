// routes/auth.js
const express = require("express")
const jwt = require("jsonwebtoken")
const fetch = require("node-fetch")
const router = express.Router()

const JWT_SECRET = "vaaddar2025!" // 실제 서비스에선 환경 변수 사용 권장

router.post("/login", async (req, res) => {
    const { id, password, mode } = req.body // mode 추가

    try {
        const response = await fetch("https://terene-db-server.onrender.com/api/customers")
        if (!response.ok) throw new Error("DB fetch failed")

        const customers = await response.json()

        const user = customers.find(
            (u) => u.id === id && u.password === password
        )

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        // JWT payload
        const payload = {
            membership_number: user.membership_number,
            membership: user.membership_grade,
            name: user.name_kor,
            birthdate: user.birthdate,
            phone: user.phone,
            email: user.email,
            remarks: user.remarks,
        }

        // Determine expiration
        let tokenOptions = {}
        let cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "None",
        }

        if (mode === "temporary") {
            tokenOptions.expiresIn = "180m"
            cookieOptions.maxAge = 180 * 60 * 1000 // 3시간
        } else {
            // permanent 모드: JWT에 expiresIn 생략 → 무기한 (비추천이지만 요청사항대로)
            // 쿠키도 maxAge 없이 설정 → 브라우저 세션 종료 전까지만 유지
        }

        const token = jwt.sign(payload, JWT_SECRET, tokenOptions)

        res.cookie("token", token, cookieOptions)
        res.json({ message: "Login successful" })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

router.get("/me", (req, res) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ message: "Not authenticated" })

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        res.json(decoded)
    } catch (err) {
        res.status(403).json({ message: "Invalid token" })
    }
})

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    })
    res.json({ message: "Logged out" })
})

module.exports = router

// routes/auth.js
const express = require("express")
const jwt = require("jsonwebtoken")
const fetch = require("node-fetch")
const router = express.Router()

const JWT_SECRET = "vaaddar2025!"

// 로그인 엔드포인트
router.post("/login", async (req, res) => {
    const { id, password, mode } = req.body

    try {
        const response = await fetch("https://terene-db-server.onrender.com/api/v2/customers")
        if (!response.ok) throw new Error("DB fetch failed")

        const customers = await response.json()
        const user = customers.find((u) => u.id === id && u.password === password)

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const payload = {
            membership_number: user.membership_number,
            membership: user.membership_grade,
            phase: user.phase,
            signup_date: user.signup_date,
            name: user.name_kor,
            birthdate: user.birthdate,
            phone: user.phone,
            email: user.email,
            remarks: user.remarks,
            owned_mileage: user.owned_mileage,
            used_coupons: user.expired_coupons,
            nationality: user.nationality,
        }

        let tokenOptions = {}
        if (mode === "temporary") {
            tokenOptions.expiresIn = "180m"
        }

        const token = jwt.sign(payload, JWT_SECRET, tokenOptions)

        // ✅ Set-Cookie 제거하고 token을 JSON으로 반환
        res.json({ message: "Login successful", token })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({ message: "Internal server error" })
    }
})

// 사용자 정보 확인 (JWT Authorization 헤더에서 추출)
router.get("/me", (req, res) => {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).json({ message: "Not authenticated" })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        res.json(decoded)
    } catch (err) {
        res.status(403).json({ message: "Invalid token" })
    }
})

// 로그아웃 (토큰 클라이언트에서 삭제)
router.post("/logout", (req, res) => {
    // 클라이언트에서 토큰을 제거해야 하므로 서버는 단순 응답만
    res.json({ message: "Logged out" })
})

module.exports = router

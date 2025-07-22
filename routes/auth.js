// routes/auth.js
const express = require("express")
const jwt = require("jsonwebtoken")
const fetch = require("node-fetch") // fetch 사용
const router = express.Router()

// const JWT_SECRET = process.env.JWT_SECRET || "supersecret"
const JWT_SECRET = "vaaddar2025!"
const JWT_EXPIRES = "60m" // 60분

router.post("/login", async (req, res) => {
    const { id, password } = req.body

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

        const token = jwt.sign(
            {
                membership_number: user.membership_number,
                membership: user.membership_grade,
                name: user.name_kor,
                phone: user.phone,
                email: user.email,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        )

        res.cookie("token", token, {
            httpOnly: true,
            secure: true, // 로컬에서 테스트할 경우 false
            sameSite: "None", // CORS 요청에서 쿠키를 허용
            maxAge: 60 * 60 * 1000, // 60분
        })

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
    res.clearCookie("token")
    res.json({ message: "Logged out" })
})

module.exports = router

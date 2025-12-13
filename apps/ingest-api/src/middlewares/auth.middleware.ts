// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import { readFileSync } from "fs"
import { join } from "path"

import { env } from "../config/env.js";


const publicKey = readFileSync(join(process.cwd(), "src/keys/public.pem"), "utf8")

interface AuthenticatedRequest extends Request {
    userInfo?: any
    apiKeyInfo?: any
}

const authApiUrl = env.authUrl

const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const sessionId = req.cookies?.session_id
    const authHeader = req.headers?.authorization


    // 📌 1. Auth via session
    if (sessionId) {
        try {
            const response = await axios.get(`${authApiUrl}/auth/session`, {
                headers: { Cookie: `session_id=${sessionId}` },
                withCredentials: true,
            })

            if (response.data.isConnected) {
                req.userInfo = response.data.userInfo
                return next()
            } else {
                return res.status(401).json({ message: "Session invalide ou expirée" })
            }
        } catch (error) {
            return res.status(500).json({ message: "Erreur de vérification de session" })
        }
    }

    // 📌 2. Auth via Authorization: Bearer <clé API>
    if (authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.split(" ")[1]

        // clé API brute → on la vérifie auprès du service Auth
        try {

            const verifyResponse = await axios.post(`${authApiUrl}/apiKey/verify-api-key`, {
                apiKey: bearerToken,
            })

            const token = verifyResponse.data.token

            const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload

            req.userInfo = {
                id: decoded.owner,
                apiKeyId: decoded.apiKeyId,
            }

            return next()
        } catch (err: any) {

            return res.status(err?.response?.status || 403).json({
                message: err?.response?.data?.message || "Clé API non autorisée",
            })
        }
    }

    return res.status(401).json({ message: "Aucune méthode d'authentification fournie" })
}

export default authMiddleware

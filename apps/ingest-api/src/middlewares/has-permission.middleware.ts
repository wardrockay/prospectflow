import { Request, Response, NextFunction } from "express"
import axios from "axios"
import { env } from "../config/env.js";


// Étendre l'interface Request pour inclure les infos utilisateur
interface AuthenticatedRequest extends Request {
    userInfo?: {
        id: string
        role: string
        [key: string]: any
    }
}

interface Permissions {
    Effect: "Allow" | "Deny"
    Action: string[]
    Resource: string[]
}

const hasPermission = (permission: Permissions) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.userInfo
            if (!user) {
                return res.status(401).json({ message: "Non authentifié" })
            }

            // Résoudre dynamiquement les paramètres comme ":laundromatId"
            const resolvedResources = permission.Resource.map(resource => {
                if (resource.startsWith(":")) {
                    const paramName = resource.slice(1)
                    return req.params[paramName]
                }
                return resource
            })

            const response = await axios.post(`${env.authUrl}/authorize`, {
                userId: user.id,
                action: permission.Action,
                resource: resolvedResources
            })

            const { allowed } = response.data

            if (!allowed) {
                return res.status(403).json({ message: "Accès refusé (permission refusée)" })
            }

            next()
        } catch (error: unknown) {
            let errorMessage = "Erreur d'autorisation"
            if (error instanceof Error) errorMessage = error.message
            if (typeof error === "string") errorMessage = error

            return res.status(500).json({ message: errorMessage })
        }
    }
}

export default hasPermission

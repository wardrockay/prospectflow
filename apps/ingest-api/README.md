# ingest-api

## 📁 Structure de l'app ingest-api

```
├── .dockerignore
├── .editorconfig
├── .eslintrc.js
├── .gitignore
├── .node-version
├── .npmrc
├── .prettierrc
├── Dockerfile
├── README copy.md
├── README.md
├── cinit.conf
├── docker-compose.yaml
├── package.json
├── src
│   ├── app.ts
│   ├── config
│   │   ├── env.ts
│   │   └── redis.ts
│   ├── controllers
│   │   └── .gitkeep
│   ├── dto
│   │   └── .gitkeep
│   ├── entities
│   │   └── .gitkeep
│   ├── errors
│   │   └── http-error.ts
│   ├── mappers
│   │   └── .gitkeep
│   ├── middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── has-permission.middleware.ts
│   │   └── logger.middleware.ts
│   ├── repositories
│   │   └── .gitkeep
│   ├── routes
│   │   └── .gitkeep
│   ├── schemas
│   │   └── .gitkeep
│   ├── services
│   │   └── .gitkeep
│   └── utils
│       ├── getOrSetCache.ts
│       └── logger.ts
├── tests
│   └── unit
│       └── basic.test.ts
├── tsconfig.json
└── vitest.config.ts
```

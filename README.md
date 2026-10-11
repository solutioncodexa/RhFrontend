# RHFlow Maroc — Frontend

Application React + TypeScript + Vite pour la gestion RH des PME marocaines. L’interface parle à l’API Spring Boot (`{ success, message, data }`) avec JWT en `localStorage`.

## Prérequis

- Node.js 20+
- API RHFlow sur [http://localhost:8080](http://localhost:8080)

## Démarrage

```bash
cd RHFlowFront
npm i
npm run dev
```

L’app s’ouvre sur [http://localhost:4200](http://localhost:4200).

Copiez `.env.example` vers `.env` si besoin :

```
VITE_API_URL=http://localhost:8080
VITE_DEMO_MODE=true
```

Les identifiants démo n’apparaissent **que** sur la bannière de la page de connexion, lorsque `VITE_DEMO_MODE` n’est pas `false`.

## Comptes démo

Les identifiants de démonstration s’affichent **uniquement** sur la bannière de `/login` lorsque `VITE_DEMO_MODE` n’est pas `false`. Ils ne sont pas répétés ici.

## Stack

- React 19, Vite 7, TypeScript
- React Router, TanStack Query
- Tailwind CSS v4, lucide-react, date-fns, sonner

## Auth

- `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, user }`
- Refresh automatique via `POST /auth/refresh`
- `GET /me` (repli `/auth/me`)
- 401 → session vidée, redirection `/login`

Rôles : `SUPER_ADMIN`, `ADMIN` (`COMPANY_ADMIN` assimilé), `MANAGER`, `EMPLOYEE`. L’admin a `*`.

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement :4200 |
| `npm run build` | Build production |
| `npm run preview` | Prévisualiser le build |

# Mon SaaS Etsy - POD Personalization

Base SaaS propre et scalable pour la personnalisation post-achat.

## Structure

- `backend/`: API Node.js + Express (routes, controllers, services).
- `frontend/`: interface simple de personnalisation.

## Backend

Fonctionnalites principales:

- verification d'acces par `orderId + email` sur `POST /api/access/verify`
- generation d'un token signe par commande
- auth vendeur:
  - `POST /api/seller/auth/signup`
  - `POST /api/seller/auth/login`
- dashboard vendeur:
  - `GET /api/seller/orders`
  - `POST /api/seller/orders` (creer une commande et son lien client auto)
  - `GET /api/seller/canvases`
  - `POST /api/seller/canvases`
  - `PUT /api/seller/canvases/:canvasId`
  - `GET /api/seller/products`
  - `POST /api/seller/products`
  - `PUT /api/seller/products/:productId`
- endpoints securises design:
  - `GET /api/designs/:orderId`
  - `POST /api/designs/:orderId`
  - `GET /api/designs/:orderId/mockup`
  - `GET /api/designs/:orderId/export`
- sauvegarde design dans `backend/src/data/designs.json`
- modeles data:
  - `users.json` (vendeurs)
  - `orders.json` (commande + `userId` + `designStatus`)
  - `canvases.json` (templates produits + printable area)
  - `products.json` (produits Etsy lies aux canvases)

Commande de test prechargee:

- `orderId`: `ORD-1001`
- `email`: `client@example.com`

## Frontend

Fonctionnalites:

- page d'acces (orderId + email)
- editeur simple (zone, texte, image URL)
- sauvegarde design
- mockup preview simple
- export image (SVG) via endpoint backend
- page vendeur `seller.html`:
  - signup/login
  - dashboard commandes
  - statut design (`pending/completed`)
  - bouton copie lien client
  - onglet Canvas (create/edit)
  - onglet Produits Etsy (assignation canvas via dropdown)
- page client:
  - charge automatiquement le canvas associe a la commande

## Lancer le projet

1. Installer les dependances:
   - `npm install`
   - `npm install --prefix backend`
   - `npm install --prefix frontend`
2. Lancer backend + frontend:
   - `npm run dev`

URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
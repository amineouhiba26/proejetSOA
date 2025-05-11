
# 📦 Projet eCommerce – Architecture Microservices (Node.js, Kafka, gRPC, GraphQL)

## 🧾 Vue d’ensemble

Ce projet est une application **e-commerce** modulaire développée en **architecture microservices**. Chaque service est responsable d’un domaine métier spécifique (authentification, produits, commandes, notifications). Les services communiquent via REST, GraphQL, gRPC et Kafka, et sont conteneurisés avec Docker.

---

## 🧱 Architecture Globale

| Élément | Description |
|--------|-------------|
| Architecture | Microservices (Node.js + MongoDB) |
| Authentification | JWT |
| Communication inter-services | REST, gRPC, Kafka |
| API Gateway | GraphQL + HTTP Proxy |
| Conteneurisation | Docker + Docker Compose |

---

## 📌 Schéma d’architecture

```
[ Client Frontend ]
         |
         v
   [ API Gateway (GraphQL + Proxy) ]
      |         |         |
      |         |         +------------------> [ Order-Service ]
      |         |                                    |
      |         |                                    +--> gRPC --> [ Product-Service ]
      |         |                                    |
      |         |                                    +--> Kafka --> [ Notification-Service ]
      |         |
      |         +------------------> [ Product-Service ]
      |
      +------------------> [ Auth-Service ]
```

---

## 🧩 Détail des Microservices

### 1. 🔐 Auth-Service

- **Responsabilité** : Authentification et gestion des utilisateurs.
- **Techno** : Express.js, MongoDB, JWT.
- **Endpoints** :
  - `POST /register` – Enregistrement utilisateur
  - `POST /login` – Connexion (JWT)
- **Modèle MongoDB** :
```json
{
  "name": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "user | admin"
}
```

---

### 2. 📦 Product-Service

- **Responsabilité** : Gestion des produits (CRUD)
- **Techno** : Express.js, MongoDB, gRPC (serveur)
- **Endpoints** :
  - `GET /products`
  - `POST /products`
  - `GET /products/:id`
  - `PUT /products/:id`
  - `DELETE /products/:id`
- **Modèle MongoDB** :
```json
{
  "name": "string",
  "price": "number",
  "category": "string",
  "stock": "number",
  "image": "string (URL)"
}
```
- **gRPC** :
  - Fournit un service `CheckStock` pour vérifier la disponibilité produit
  - Appelé par `order-service`

---

### 3. 🛒 Order-Service

- **Responsabilité** : Création et suivi des commandes.
- **Techno** : Express.js, MongoDB, Kafka, gRPC (client)
- **Endpoints** :
  - `POST /orders`
  - `GET /orders/:userId`
  - `PUT /orders/:id/status`
- **Modèle MongoDB** :
```json
{
  "userId": "string",
  "items": [
    { "productId": "string", "name": "string", "quantity": "number", "price": "number" }
  ],
  "total": "number",
  "status": "Reçue | Confirmée | Préparée | Livrée",
  "statusHistory": [
    { "status": "string", "timestamp": "date" }
  ],
  "createdAt": "date"
}
```

#### 🔄 Interaction avec gRPC
- Avant de créer une commande, appelle `product-service` via gRPC pour :
  - Vérifier la quantité en stock
  - Obtenir les derniers détails produit

#### 🔁 Interaction avec Kafka
- Lorsqu’une commande est créée ou change de statut :
  - Publie un événement sur le **topic Kafka `order-events`**

---

### 4. 📬 Notification-Service

- **Responsabilité** : Envoi d’e-mails après réception d’événements Kafka
- **Techno** : Kafka, Nodemailer (Mailtrap/SMTP)
- **Fonctionnement** :
  - Consomme le topic `order-events`
  - Envoie un email de notification au client
  - Exemple : "Votre commande #123 a été confirmée"

---

### 5. 🌐 API Gateway

- **Responsabilité** : Expose une seule interface d’entrée
- **Techno** : Apollo Server (GraphQL), http-proxy-middleware
- **Fonctionnement** :
  - Route `/graphql` pour les opérations unifiées
  - Proxy vers les services REST existants

---

## 📦 Communication Interservices

| Source | Cible | Moyen | Description |
|--------|-------|-------|-------------|
| Client | Gateway | GraphQL | Accès centralisé |
| Gateway | Auth-Service | REST Proxy | Authentification |
| Gateway | Product-Service | REST Proxy | Produits |
| Order-Service | Product-Service | gRPC | Vérification produit |
| Order-Service | Notification-Service | Kafka | Événements commande |

---

## ✅ Fonctionnalités principales

- 🔐 Authentification sécurisée par JWT
- 🛍️ Gestion complète des produits
- 🛒 Système de commande avec historique de statuts
- ✉️ Notifications automatiques par Kafka
- ⚡ Communication performante via gRPC

---

## ⚙️ Défis rencontrés

| Défi | Solution |
|------|----------|
| Communication rapide entre services | Utilisation de gRPC pour `CheckStock` |
| Découplage notifications | Kafka comme bus d’événements |
| Sécurité API | Middleware JWT dans chaque service |
| Conteneurisation | Docker + Docker Compose |

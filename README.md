
# 📦 Projet eCommerce – Architecture Microservices (Node.js, Kafka, gRPC, GraphQL)

## 🧾 Vue d’ensemble

Ce projet est une application **e-commerce** modulaire développée en **architecture microservices**. Chaque service est responsable d’un domaine métier spécifique : utilisateurs, produits, commandes et notifications. Les services communiquent via REST, GraphQL, gRPC et Kafka, et sont conteneurisés avec Docker.

---

## 🧱 Architecture Globale

| Élément | Description |
|--------|-------------|
| Architecture | Microservices (Node.js + MongoDB) |
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

- **Responsabilité** : Gestion des utilisateurs (nom uniquement, pas de JWT).
- **Techno** : Express.js, MongoDB
- **Endpoints** :
  - `POST /register` – Enregistrement utilisateur
  - `POST /login` – Connexion simple
- **Modèle MongoDB** :
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

---

### 2. 📦 Product-Service

- **Responsabilité** : Gestion des produits (CRUD)
- **Techno** : Express.js, MongoDB, gRPC (serveur)
- **Endpoints REST** :
  - `GET /products`
  - `POST /products`
  - `GET /products/:id`
  - `PUT /products/:id`
  - `DELETE /products/:id`
- **Modèle MongoDB** :
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": "number",
  "stock": "number"
}
```
- **gRPC** :
  - Expose une méthode `CheckStock(productId, quantity)` qui retourne la disponibilité
  - Appelé depuis `order-service` avant création d'une commande

---

### 3. 🛒 Order-Service

- **Responsabilité** : Création et suivi des commandes.
- **Techno** : Express.js, MongoDB, Kafka, gRPC (client)
- **Endpoint** :
  - `POST /api/orders`
- **Format de requête** :
```json
{
  "products": [
    {
      "productId": "68209fc4081f064950f20132",
      "quantity": 1
    }
  ]
}
```
- **Réponse** :
```json
{
  "message": "Order created successfully",
  "orderId": "6820a48b0d9131e936efa7c5",
  "username": "amine",
  "status": "received",
  "totalAmount": 1200
}
```
- **Modèle MongoDB** :
```json
{
  "userId": "string",
  "products": [
    { "productId": "string", "quantity": "number" }
  ],
  "totalAmount": "number",
  "status": "received",
  "createdAt": "date"
}
```

#### 🔄 Interaction avec gRPC
- Contacte le `product-service` pour vérifier la disponibilité des produits et obtenir les détails nécessaires (prix, stock...).

#### 🔁 Interaction avec Kafka
- Après création de commande, publie un événement sur le topic Kafka `order-events`.

---

### 4. 📬 Notification-Service

- **Responsabilité** : Réception d’événements Kafka et envoi d’e-mails à l’admin
- **Techno** : Kafka, Nodemailer (Mailjet, Mailtrap ou autre SMTP)
- **Contenu de l’email** :
```
👤 Utilisateur: amine (ID: 68209f9044951a1252c29712)
🕒 2025-05-11T13:14:56.367Z

Produits:
• 68209fc4081f064950f20132 x 1

Total: 1200 DT
```

---

### 5. 🌐 API Gateway

- **Responsabilité** : Exposition centralisée des APIs
- **Techno** : Apollo Server (GraphQL), http-proxy-middleware
- **Fonctionnalité** :
  - Route `/graphql` pour interroger ou envoyer des données à plusieurs services
  - Proxy vers les routes REST de chaque microservice

---

## 🔁 Communication Interservices

| Source | Cible | Moyen | Description |
|--------|-------|-------|-------------|
| Client | Gateway | GraphQL | Interface unifiée |
| Gateway | Auth-Service | REST Proxy | Gestion utilisateurs |
| Gateway | Product-Service | REST Proxy | Produits |
| Order-Service | Product-Service | gRPC | Vérification stock |
| Order-Service | Notification-Service | Kafka | Envoi événement commande |

---

## ✅ Fonctionnalités clés

- 👤 Authentification simple utilisateur
- 📦 Gestion des produits (CRUD)
- 🛒 Création de commandes avec total dynamique
- 📬 Notification email à l’admin via Kafka
- ⚡ Communication interservices optimisée (gRPC, Kafka)

---

## ⚙️ Défis rencontrés et solutions

| Défi | Solution |
|------|----------|
| Validation du stock | Utilisation de gRPC pour interroger `product-service` |
| Notification automatisée | Kafka + Nodemailer pour envoi d’e-mails |
| Synchronisation entre services | Adoption d’une architecture événementielle |
| Conteneurisation complète | Utilisation de Docker Compose

# 🚀 Learnova - Full-Controll Authentication & Admin Users Schema

Learnova is a production-ready backend system built with **Node.js**, **Express.js**, and **MongoDB** that provides secure authentication, user management, Google OAuth integration, file uploads, email services, and admin dashboard APIs.

The platform is designed to support scalable learning systems with secure user access, subscription plans, token usage tracking, and modern backend architecture.

---

# 📌 Features

## 🔐 Authentication & Authorization

- User Registration & Login
- JWT Access Token Authentication
- Refresh Token System
- Secure Cookie-Based Authentication
- Google OAuth 2.0 Login using Passport.js
- Role-Based Access Control (RBAC)
- Protected Routes Middleware

---

## 👤 User Management

- User Profile Management
- Update User Information
- Avatar Upload Support
- Subscription Plan System
- Token Usage Tracking

---

## 🛡 Security Features

- Helmet Security Middleware
- CORS Configuration
- Password Hashing using bcryptjs
- HTTP-Only Cookies
- Centralized Error Handling
- Input Validation using Zod

---

## ☁ File Upload System

- Multer File Upload
- Cloudinary Image Storage
- Avatar Management

---

## 📧 Email Services

- Welcome Email System
- Password Reset Email Support
- Nodemailer Integration

---

## ⚙ Admin Dashboard APIs

- Get All Users
- Delete Users
- Update User Roles
- Manage Subscription Plans

---

# 🏗 Tech Stack

## Backend

- Node.js
- Express.js

## Database

- MongoDB
- Mongoose ODM

## Authentication

- JWT
- Passport.js
- Google OAuth 2.0

## Validation

- Zod

## File Upload

- Multer
- Cloudinary

## Security

- Helmet
- CORS
- bcryptjs

## Utilities

- Nodemailer
- node-cron

---

# 📁 Project Structure

```bash id="djr6rj"
Learnova/
│
├── app.js
├── package.json
├── .env
│
├── config/
│   ├── db.js
│   ├── cloudinary.js
│   ├── passport.js
│   ├── plan.config.js
│   └── handelEnv.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   └── admin.controller.js
│
├── middleware/
│   ├── auth.middleware.js
│   ├── validate.middleware.js
│   ├── role.middleware.js
│   ├── upload.middleware.js
│   ├── error.middleware.js
│   └── notFound.middleware.js
│
├── models/
│   └── User.model.js
│
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── admin.routes.js
│
├── schemas/
│   ├── auth.schema.js
│   └── user.schema.js
│
└── utils/
    ├── generateTokens.js
    ├── sendEmail.js
    └── cron.js
```

---

# 🔑 Environment Variables

Create a `.env` file in the root directory:

```env id="p4xk72"
PORT=5000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

GOOGLE_ID=your_google_client_id
GOOGLE_SECRET=your_google_client_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

# 📦 Installation

## 1️⃣ Clone Repository

```bash id="pk5kry"
git clone <your-repository-url>
```

---

## 2️⃣ Install Dependencies

```bash id="j8i2ln"
npm install
```

---

## 3️⃣ Start Development Server

```bash id="v8sl4o"
npm run dev
```

---

# 🔥 API Endpoints

# Authentication Routes

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| POST   | `/api/auth/register`        | Register new user     |
| POST   | `/api/auth/login`           | User login            |
| GET    | `/api/auth/google`          | Google OAuth login    |
| GET    | `/api/auth/google/callback` | Google OAuth callback |
| POST   | `/api/auth/refresh`         | Refresh access token  |

---

# User Routes

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/api/users/me`     | Get current user profile |
| PUT    | `/api/users/update` | Update user profile      |

---

# Admin Routes

| Method | Endpoint                    | Description                   |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/api/admin/users`          | Get all users                 |
| DELETE | `/api/admin/users/:id`      | Delete user                   |
| PUT    | `/api/admin/users/:id/role` | Update user role              |
| PUT    | `/api/admin/users/:id/plan` | Update user subscription plan |

---

# 🔒 Authentication Flow

1. User logs in using Email/Password or Google OAuth
2. Server generates:
   - Access Token
   - Refresh Token

3. Tokens stored in secure HTTP-only cookies
4. Protected routes verify JWT tokens
5. Refresh endpoint generates new access token when expired

---

# ☁ Google OAuth Flow

1. User accesses:

```bash id="vgn4q2"
/api/auth/google
```

2. Redirect to Google Login

3. Google redirects back to:

```bash id="cfm0fk"
/api/auth/google/callback
```

4. User created or logged in automatically

---

# 📤 File Upload Flow

- Multer handles file uploads
- Cloudinary stores uploaded images
- Avatar URL saved in MongoDB

---

# ⚠ Error Handling

The application uses centralized error middleware to handle:

- Validation Errors
- Authentication Errors
- Authorization Errors
- Database Errors
- Unknown Routes

---

# 🧠 Future Improvements

- Email Verification
- Password Reset System
- Two-Factor Authentication
- Redis Caching
- Docker Support
- API Rate Limiting
- Swagger API Documentation

---

# 👨‍💻 About Learnova

Learnova is designed to provide a scalable and secure backend foundation for modern educational and learning platforms with clean architecture and production-ready practices.

---

# 📜 License

This project is licensed under the MIT License.

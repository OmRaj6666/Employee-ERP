# 🚀 Employee ERP Management System

A modern Employee Management System built using **Node.js, Express.js, PostgreSQL (Neon Database), HTML, CSS, and JavaScript**.

### 🌐 Live Demo

https://employee-erp-ii89.onrender.com/

### 📂 GitHub Repository
https://github.com/OmRaj6666/Employee-ERP.git

---

## ✨ Features

* 🔐 Secure Admin Login
* 👨‍💼 Add Employees
* 🗑️ Delete Employees
* 📋 View Employee Records
* ☁️ PostgreSQL Cloud Database (Neon)
* 🚀 Deployed on Render
* 🛡️ Helmet Security
* ⏱️ Rate Limiting Protection
* 🍪 Session Authentication
* 📱 Responsive Dashboard UI

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* Neon Database

### Deployment

* Render

---

## 📦 Installation

Clone Repository

```bash
git clone https://github.com/OmRaj6666/Employee-ERP.git
cd Employee-ERP
```

Install Dependencies

```bash
npm install
```

Start Server

```bash
npm start
```

or

```bash
node server.js
```

Open Browser

```text
http://localhost:3000
```

---

## 🔑 Default Login

Development Mode:

```text
Username: admin
Password: admin123
```

For production, configure environment variables.

---

## ⚙️ Environment Variables

Create a .env file:

```env
DATABASE_URL=YOUR_NEON_DATABASE_URL

ADMIN_USER=admin
ADMIN_PASS=your_secure_password

APP_ORIGIN=http://localhost:3000

NODE_ENV=development
```

Production Example:

```env
DATABASE_URL=YOUR_NEON_DATABASE_URL

ADMIN_USER=admin
ADMIN_PASS=your_secure_password

APP_ORIGIN=https://employee-erp-ii89.onrender.com

NODE_ENV=production
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE IF NOT EXISTS employees (
    emp_id SERIAL PRIMARY KEY,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    dept VARCHAR(50),
    salary NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Deployment

### Backend Hosting

Render

### Database Hosting

Neon PostgreSQL

### Production URL

https://employee-erp-ii89.onrender.com

---

## 📸 Screenshots

Add screenshots of:

* Login Page
* Dashboard
* Employee Management Panel
* Database Records

---

## 👨‍💻 Developer

**Om Raj**



## 📜 License

This project is open-source and available under the MIT License.

# 🚀 Employee ERP Management System

A modern Employee Management System built using **Node.js, Express.js, PostgreSQL (Neon Database), HTML, CSS, JavaScript, and Bootstrap 5**.

---

## 🌐 Live Demo

🔗 https://employee-erp-ii89.onrender.com

---

## 📂 GitHub Repository

🔗 https://github.com/OmRaj6666/Employee-ERP

---

## 📖 Project Overview

Employee ERP is a cloud-based employee management platform designed to manage employee records securely.

The application provides:

* Secure Admin Authentication
* Employee Record Management
* PostgreSQL Cloud Database Integration
* Real-time CRUD Operations
* Responsive Dashboard UI
* Cloud Deployment on Render

---

## ✨ Features

### Authentication

* Secure Admin Login
* Session-based Authentication
* HttpOnly Cookies
* Protected Routes

### Employee Management

* Add New Employees
* View Employee Records
* Delete Employees
* Department Management
* Salary Tracking

### Security

* Helmet Security Middleware
* Rate Limiting Protection
* Session Management
* Origin Validation

### Cloud Integration

* Neon PostgreSQL Database
* Render Deployment
* Environment Variable Configuration

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES6)
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

## 📸 Screenshots

### 🔐 Admin Login

![Login Page]<img width="1470" height="956" alt="Screenshot 2026-06-09 at 5 55 24 PM" src="https://github.com/user-attachments/assets/b9e72c27-addc-4537-a02b-4b12478a019c" />


Secure admin login with session authentication.

---

### 📊 Dashboard

![Dashboard]<img width="1470" height="956" alt="Screenshot 2026-06-09 at 5 55 29 PM" src="https://github.com/user-attachments/assets/3db67724-8020-4211-844e-86fbfca99b7c" />


Professional Employee Management Dashboard.

Features include:

* Employee Statistics
* Department Monitoring
* Salary Overview
* Employee CRUD Operations

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/OmRaj6666/Employee-ERP.git
cd Employee-ERP
```

### Install Dependencies

```bash
npm install
```

### Start Application

```bash
npm start
```

or

```bash
node server.js
```

---

## 🔑 Default Login Credentials

Development Mode:

```text
Username: admin
Password: admin123
```

---

## ⚙️ Environment Variables

Create a `.env` file:

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

## 📁 Project Structure

```text
Employee-ERP/
│
├── public/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── rc-logo.svg
│
├── screenshots/
│   ├── login-page.png
│   └── dashboard.png
│
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 Deployment

### Backend Hosting

Render

### Database Hosting

Neon PostgreSQL

### Live Application

https://employee-erp-ii89.onrender.com

---

## 🔒 Security Features

* Helmet Middleware
* Rate Limiting
* Session Authentication
* Secure Cookies
* Protected API Endpoints
* Input Validation

---

## 📈 Future Enhancements

* Employee Edit Functionality
* Employee Search & Filtering
* Payroll Management
* Attendance Tracking
* Analytics Dashboard
* Export Reports (PDF/Excel)
* Role-Based Access Control

---

## 👨‍💻 Developer

### Om Raj

Health Informatics Engineering

VIT Bhopal University

GitHub:
https://github.com/OmRaj6666

---

## ⭐ Support

If you found this project useful:

⭐ Star the repository

🍴 Fork the project

📢 Share with others

---

## 📜 License

This project is licensed under the MIT License.

Copyright © 2026 Om Raj
<img width="1470" height="956" alt="Screenshot 2026-06-09 at 5 55 24 PM" src="https://github.com/user-attachments/assets/f8cacc7b-83c8-426f-8b4f-4f4d76ff4f90" />

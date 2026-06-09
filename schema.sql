-- Employee ERP Database Schema
-- PostgreSQL / Neon Database

CREATE TABLE IF NOT EXISTS employees (
    emp_id SERIAL PRIMARY KEY,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    dept VARCHAR(50),
    salary NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data

INSERT INTO employees (fname, lname, email, dept, salary)
VALUES
('Raj', 'Kumar', 'raj@example.com', 'HR', 50000),
('Priya', 'Singh', 'priya@example.com', 'Finance', 45000),
('Arjun', 'Sharma', 'arjun@example.com', 'IT', 55000),
('Suman', 'Patel', 'suman@example.com', 'Marketing', 60000),
('Kavita', 'Rao', 'kavita@example.com', 'HR', 47000);

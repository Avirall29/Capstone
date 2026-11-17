# How to Create an Admin Account

Admins are created from the command line. There is no public HTTP endpoint for this (it would let anyone become admin).

## Create an admin (or reset an admin's password)

```bash
cd backend
npm install
node create-admin.js you@example.com "a-strong-password"
```

- Password must be at least 8 characters.
- If the email already belongs to an admin, the script resets that admin's password instead.
- The script uses `MONGODB_URI` from `backend/.env` (defaults to local MongoDB). To manage the **deployed** admin, temporarily set `MONGODB_URI` to the production database.

## Login

Open the admin panel (http://localhost:3000 locally) and sign in with the email and password you chose.

## Troubleshooting

- **Connection error**: check that MongoDB is running and `MONGODB_URI` is correct.
- **"Invalid credentials"**: re-run the script with the same email to reset the password.
- **"Too many login attempts"**: logins are limited to 10 tries per 15 minutes; wait and retry.

# Quick Start - Login Credentials

## Admin Panel Login

There are no default admin credentials. Create an admin from the command line:

```bash
cd backend
node create-admin.js you@example.com "a-strong-password"
```

Then go to http://localhost:3000 and log in with that email and password.
Re-running the script with the same email resets the password. See `CREATE_ADMIN.md` for details.

## Driver Login

Drivers are created by the admin through the admin panel. To login as a driver:

1. **Create a driver** (via admin panel):
   - Login to admin panel
   - Go to "Drivers" page
   - Click "Add Driver"
   - Fill in driver details (name, email, phone, license number, password)
   - Save

2. **Login to driver app:**
   - Use the email and password you set when creating the driver

## Important Notes

- Driver passwords are set when creating the driver in the admin panel
- Deactivated drivers are logged out on their next request
- Logins are limited to 10 attempts per 15 minutes per email

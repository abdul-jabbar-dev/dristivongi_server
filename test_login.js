const http = require('http');

const data = JSON.stringify({
  email: 'test@example.com', // Replace with a valid test email if known, or we can just create one
  password: 'password123'
});

// Since I don't know a valid user, I'll just check the DB to find one.

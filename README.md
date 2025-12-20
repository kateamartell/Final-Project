### COS 498 Final Project – Secure Wild West Forum

Live Site: https://cloverpdfs.org

This project is an upgraded version of the Wild West Forum midterm. It adds SQLite database persistence, secure authentication, user profiles, account lockout, real-time chat, enhanced comments, and HTTPS deployment using Nginx Proxy Manager.

--------------

### Run Instructions

1. Open Terminal

2. SSH into the server

    ssh -p 2004 kateamartell@157.245.112.126


3.Navigate to the project

    cd Final-Project/backend


4.Install dependencies

   npm install


5. Start the server

   npm start


6. Open a browser

   Navigate to https://cloverpdfs.org

---------------

### Environment Configuration

- Optional environment variables:

- PORT (default 3000)

- SESSION_SECRET

- NODE_ENV=production

------------------

### Database

- The application uses SQLite3 for persistent storage.

- Data survives server restarts.

# Tables include:

- users

- sessions

- comments

- login_attempts

- chat_messages

--------------------

### HTTPS Deployment

- The site is deployed behind Nginx Proxy Manager using a Let’s Encrypt SSL certificate.

- All traffic is forced over HTTPS

- WebSockets are enabled

- A custom /socket.io/ proxy location is configured to support real-time chat

-------------

### Authentication & Security

- Passwords are hashed using Argon2

- Plaintext passwords are never stored

- Password strength requirements are enforced

- Login attempts are logged with IP and timestamp

- Accounts are temporarily locked after repeated failed login attempts

- Sessions are stored securely in SQLite

--------------------

### User Accounts & Profiles

Users have:

- Username (login only)

- Email (unique)

- Display name (shown publicly)

- Profile page allows:

- Changing password (forces re-login)

- Changing email

- Changing display name

- Profile customization (color/avatar)

---------------

### Comments

- Comments are paginated using page-based navigation

- Comments support Markdown formatting (sanitized)

- Users can edit their own comments

- Users can delete their own comments

- Comments support upvote and downvote reactions

--------------------

### Real-Time Chat

- Live chat implemented using Socket.io

- Messages appear instantly to all connected users

- Chat history is stored in the database

- Messages display display name, profile color, and timestamp

--------------

### Chat API

- GET /api/chat returns recent chat messages
  
- Socket.io events handle sending and receiving chat messages

-------- 

### Design Decisions

- SQLite chosen for simplicity and reliability

- Server-side sessions used for improved security

- Soft deletes used for comments

- HTTPS handled by reverse proxy instead of Node

- Custom Socket.io proxy location required for WebSockets

-----------------------

### Testing

- The following were tested:

- User registration and login

- Account lockout after failed logins

- Profile updates

- Comment pagination

- Comment editing, deleting, voting, and Markdown

- Real-time chat between browsers

- HTTPS connection

- Database persistence after restart

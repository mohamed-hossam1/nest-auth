create 


as admin
GET /users?Pagination&Search&Filter&Sorting
GET /users/:id
POST /users
PATCH /users/:id/role Self-Demotion Guard
POST /users/:id/ban
POST /users/:id/unban
GET /users/:id/sessions
POST /users/:id/sessions/revoke-all
update DB
isBanned
bannedAt (timestamp, optional) / banReason (text, optional).
avatarUrl (text, optional).

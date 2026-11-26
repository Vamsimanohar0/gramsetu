# GramSetu (VGMP) — REST API Documentation

Base URL: `http://localhost:5000/api` (configurable via environment variables)

---

## Health Check

### `GET /test`
- **Authentication:** Public
- **Response (`200 OK`):**
  ```json
  { "status": "ok", "message": "GramSetu backend is running" }
  ```

### `GET /api/health`
- **Authentication:** Public
- **Response (`200 OK`):**
  ```json
  { "status": "ok", "database": "connected" }
  ```
- **Errors:** `503` `{ "status": "error", "database": "disconnected" }`

---

## Public Citizen Endpoints

### `GET /api/villages`
Returns all active villages with their mapped Panchayath name (replaces inline SQL in `complaint.php`).
- **Authentication:** Public
- **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "villages": [
      {
        "id": 1,
        "village_name": "Kondapalli",
        "panchayath_id": 1,
        "panchayath_name": "Kondapalli Panchayath"
      }
    ]
  }
  ```

### `POST /api/complaints`
Submits a new citizen grievance with optional image evidence (replaces `action/submit_complaint.php`).
- **Authentication:** Public
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `name` (string, required, max 100)
  - `mobile` (string, required, 10 digits `/^[0-9]{10}$/`)
  - `village_id` (integer, required, must match active `villages.id`)
  - `ward_no` (string, optional, max 20)
  - `category` (string, required, max 100)
  - `title` (string, required, max 255)
  - `description` (string, required, max 1000)
  - `images[]` or `images` (up to 6 `.jpg`, `.jpeg`, or `.png` files, max 5 MB each)
- **Response (`201 Created`):**
  ```json
  {
    "status": "success",
    "complaint_id": "GS-2026-48291",
    "message": "Complaint submitted successfully!",
    "images": ["uploads/images/1719300000_ab12cd34ef56.jpg"]
  }
  ```
- **Errors:**
  - `400`: Missing required fields, invalid 10-digit mobile number, invalid village, invalid file type, >6 files, or file >5 MB.

### `POST /api/complaints/track`
Fetches full complaint details by Complaint ID and registered mobile number (replaces `action/track_com.php`).
- **Authentication:** Public
- **Request Body (`application/json` or `application/x-www-form-urlencoded`):**
  ```json
  { "complaint_id": "GS-2026-59312", "mobile": "8790808059" }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "complaint": {
      "id": 11,
      "complaint_id": "GS-2026-59312",
      "name": "vamsi",
      "mobile": "8790808059",
      "village": "Kondapalli",
      "village_id": 1,
      "panchayath_id": 1,
      "ward_no": "",
      "category": "Garbage Collection",
      "title": "shit",
      "description": "waste",
      "image_path": null,
      "images": [],
      "audio_path": null,
      "status": "Resolved",
      "created_at": "2026-06-25T11:28:31.000Z"
    },
    "updates": [
      {
        "status": "Resolved",
        "remarks": "Current status: Resolved",
        "updated_at": "2026-06-25T11:28:31.000Z"
      }
    ]
  }
  ```
- **Errors:** `400` missing fields, `404` complaint not found.

### `POST /api/complaints/lookup`
Lists all Complaint IDs registered with a mobile number (replaces `action/find_complaints.php`).
- **Authentication:** Public
- **Request Body:** `{ "mobile": "8790808059" }`
- **Response (`200 OK`):**
  ```json
  [
    {
      "complaint_id": "GS-2026-17276",
      "title": "the",
      "status": "Submitted",
      "created_at": "2026-06-26T05:04:14.000Z"
    }
  ]
  ```

---

## Panchayat Admin Endpoints

Authentication uses an `httpOnly` cookie (`gramsetu_token`) and/or `Authorization: Bearer <token>` JWT.

### `POST /api/admin/login`
Authenticates an active Panchayath user (replaces `admin/login.php`).
- **Authentication:** Public
- **Request Body:** `{ "username": "kondapalli", "password": "admin" }`
- **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "token": "<jwt>",
    "panchayath": {
      "id": 1,
      "name": "Kondapalli Panchayath",
      "username": "kondapalli",
      "email": "kondapalli@panchayath.in",
      "role": "panchayath_admin"
    }
  }
  ```
- **Errors:** `400` missing credentials, `401` invalid username or password.

### `POST /api/admin/logout`
Clears the session cookie (replaces `admin/logout.php`).
- **Authentication:** Public / Authenticated
- **Response (`200 OK`):** `{ "status": "success", "message": "Logged out successfully" }`

### `GET /api/admin/me`
Returns the authenticated Panchayath profile and assigned active villages.
- **Authentication:** Required (`panchayath_admin`)
- **Response (`200 OK`):** `{ "status": "success", "panchayath": {...}, "villages": [...] }`

### `GET /api/admin/dashboard`
Returns village-scoped complaint counts and latest 10 complaints (replaces `admin/dashboard.php`).
- **Authentication:** Required (`panchayath_admin`)
- **Response (`200 OK`):**
  ```json
  {
    "status": "success",
    "panchayath": { "id": 1, "name": "Kondapalli Panchayath", "username": "kondapalli" },
    "villages": [{ "id": 1, "name": "Kondapalli" }],
    "stats": {
      "total": 1,
      "Submitted": 0,
      "Verified": 0,
      "Assigned": 0,
      "In Progress": 0,
      "Resolved": 1,
      "Rejected": 0
    },
    "urgentCount": 0,
    "recentComplaints": [...]
  }
  ```

### `GET /api/admin/complaints`
Lists all complaints for the logged-in Panchayath's villages (replaces `admin/complaints.php`).
- **Authentication:** Required (`panchayath_admin`)
- **Query Params:** `status` (optional), `search` (optional: matches `name`, `complaint_id`, `mobile`)
- **Response (`200 OK`):** `{ "status": "success", "complaints": [...] }`

### `GET /api/admin/complaints/:id`
Returns a single complaint scoped to the logged-in Panchayath's villages (replaces `admin/view_complaint.php`).
- **Authentication:** Required (`panchayath_admin`)
- **Response (`200 OK`):** `{ "status": "success", "complaint": {...} }`
- **Errors:** `401` unauthenticated, `404` not found or outside Panchayath scope.

### `PATCH /api/admin/complaints/:id/status`
Updates the status of a complaint scoped to the logged-in Panchayath's villages (replaces `admin/view_complaint.php` POST).
- **Authentication:** Required (`panchayath_admin`)
- **Request Body:** `{ "status": "In Progress" }`
- **Allowed Statuses:** `Submitted`, `Verified`, `Assigned`, `In Progress`, `Resolved`, `Rejected`
- **Response (`200 OK`):** `{ "status": "success", "message": "Complaint status updated successfully!", "complaint": {...} }`
- **Errors:** `400` invalid status, `401` unauthenticated, `404` not found or outside Panchayath scope.


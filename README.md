# Ticketing & Email Support System (MERN)

## Progress
- [x] Step 1: Project layout + backend foundation + DB models
- [ ] Step 2: Auth (register, OTP, login, JWT refresh, RBAC)
- [ ] Step 3: Tickets, messages, activity, lifecycle
- [ ] Step 4: Email (outbound + inbound threading)
- [ ] Step 5: Frontend
- [ ] Step 6: Testing, Swagger/Postman, Docker

## Run backend
    cd backend
    cp .env.example .env     # edit secrets
    npm install
    npm run dev
    # check: http://localhost:5000/api/health

## Backend architecture
Modular: `modules/<feature>/{model, routes, controller, service, repository}`.
Shared: `middleware/`, `utils/` (ApiError, sendResponse, asyncHandler), `constants/`, `config/`.
All responses: `{ success, message, data, meta? }`; errors: `{ success:false, message, errors }`.

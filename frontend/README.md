# Frontend (React + Vite + Tailwind + Redux Toolkit)

Folder layout is ready. Scaffold in the next step:

    npm create vite@latest . -- --template react
    npm i react-router-dom @reduxjs/toolkit react-redux axios
    npm i -D tailwindcss @tailwindcss/vite

Planned structure (src/):
- app/         Redux store
- features/    auth, tickets, dashboard, admin (slices + API calls)
- pages/       Login, Register, OTP, Dashboard, Tickets, TicketDetail...
- components/  common, layout (Sidebar/Topbar), tickets
- routes/      ProtectedRoute, RoleRoute
- services/    axios instance with token refresh

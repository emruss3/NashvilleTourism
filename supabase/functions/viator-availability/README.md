# viator-availability

Server-only, non-transactional production boundary for Viator availability endpoints.

Supported modes:

- `health`
- `get_schedules`
- `check_availability`

The function does not create bookings or process payment data. It authenticates NashRoam's Vercel server through the Supabase server key and keeps the Viator API key inside Supabase.

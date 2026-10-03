# Telesales Monitor

## Connect to a local backend

Run the backend on port `5000`. Debug builds use `http://10.0.2.2:5000/api` first
when no `API_URL` is supplied, so an Android emulator shares the local backend and
admin portal data. If the local backend is unavailable, sign-in fails instead of
silently switching to a different production database.

For a physical Android device on the same network as the computer, run the app with
the computer's LAN address:

```powershell
flutter run --dart-define=API_URL=http://<COMPUTER-LAN-IP>:5000/api
```

The backend must be reachable from the device (including through the Windows
firewall). Open the admin portal at `http://localhost:5000`; mobile sign-ins,
presence, and synced calls will then use the same local database.

Release builds continue to use the configured HTTPS production API by default.

# Google Auth Debug Guide

## Masalah
- ✅ `https://spotify-req.xyrus10.com/` - **BERHASIL**
- ❌ `https://spotify-controller.app.xyrus10.dev/` - **GAGAL**

## Checklist Debugging

### 1. Environment Variables
Pastikan setiap deployment memiliki `NEXTAUTH_URL` yang sesuai:

**Untuk `spotify-req.xyrus10.com`:**
```env
NEXTAUTH_URL=https://spotify-req.xyrus10.com
```

**Untuk `spotify-controller.app.xyrus10.dev`:**
```env
NEXTAUTH_URL=https://spotify-controller.app.xyrus10.dev
```

### 2. Google Console Configuration

#### Authorized JavaScript origins:
```
https://spotify-req.xyrus10.com
https://spotify-controller.app.xyrus10.dev
```

#### Authorized redirect URIs:
```
https://spotify-req.xyrus10.com/api/auth/callback/google
https://spotify-controller.app.xyrus10.dev/api/auth/callback/google
```

**⚠️ PENTING:** Pastikan kedua redirect URI di atas sudah ditambahkan di Google Console!

### 3. Cek Logs

Setelah deploy, cek logs untuk melihat:
- Domain mana yang digunakan (dari `host` header)
- `NEXTAUTH_URL` yang digunakan
- Redirect URL yang dihasilkan
- Callback URL yang diharapkan

### 4. Test Flow

1. Akses `https://spotify-controller.app.xyrus10.dev/`
2. Klik "Sign in with Google"
3. Cek logs untuk melihat:
   - Request URL
   - Expected callback URL
   - Redirect URL yang digunakan

### 5. Common Issues

#### Issue: Redirect URI mismatch
**Gejala:** Google menolak dengan error "redirect_uri_mismatch"
**Solusi:** Pastikan redirect URI di Google Console **PERSIS** sama dengan yang digunakan aplikasi

#### Issue: NEXTAUTH_URL tidak di-set
**Gejala:** NextAuth tidak bisa menentukan base URL dengan benar
**Solusi:** Set `NEXTAUTH_URL` environment variable untuk setiap deployment

#### Issue: Domain tidak terdaftar di Google Console
**Gejala:** Google menolak request dari domain yang tidak authorized
**Solusi:** Tambahkan domain ke "Authorized JavaScript origins" dan redirect URI ke "Authorized redirect URIs"

## Log Format

Logs akan menampilkan:
```json
{
  "timestamp": "...",
  "level": "info",
  "service": "auth",
  "message": "Incoming auth request",
  "data": {
    "host": "spotify-controller.app.xyrus10.dev",
    "expectedCallbackUrl": "https://spotify-controller.app.xyrus10.dev/api/auth/callback/google",
    "nextAuthUrl": "https://spotify-controller.app.xyrus10.dev"
  }
}
```

Pastikan `expectedCallbackUrl` sesuai dengan yang ada di Google Console!

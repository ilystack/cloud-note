# CloudNotes — Multiplatform Offline-First Personal Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20iOS%20%7C%20Android-blue)](#)
[![Security](https://img.shields.io/badge/Cryptography-AES--GCM%20256--bit-emerald)](#)
[![Backend](https://img.shields.io/badge/Backend-PocketBase-orange)](#)

**CloudNotes** adalah sistem aplikasi catatan pribadi lintas platform (*Web SPA* & *Expo Mobile App*) mandiri (*self-hosted*), mengutamakan privasi (*privacy-first*), bekerja tanpa ketergantungan koneksi (*offline-first*), serta dilengkapi brankas terenkripsi (*stealth personal vault*).

---

## 🌟 Empat Pilar Arsitektur

1. **Variable-Length Stealth PIN & Recovery Model:**
   - Panjang PIN bebas (2 digit, 6 digit, 9 digit, dll. dengan regex `^\d{2,}$`).
   - UI input login **tidak membocorkan panjang PIN** (tanpa 4 slot dot statis). Indikator dinamis bertambah sesuai karakter yang diketik dan memerlukan penekanan tombol submit centang (*stealth defense against shoulder surfing & brute-force*).
   - Akun PocketBase terikat ke Email asli pengguna dengan pemulihan kata sandi via SMTP email untuk mencegah lockout permanen.

2. **True End-to-End Client-Side Cryptography (AES-GCM 256-bit):**
   - Catatan yang dikunci (`is_locked: true`) dienkripsi di sisi client sebelum disimpan ke SQLite lokal maupun sebelum dikirim ke PocketBase.
   - Kunci enkripsi diturunkan menggunakan PBKDF2 (SHA-256, 100.000 iterasi) dengan 16-byte random salt dan 12-byte IV unik per catatan. Format penyimpanan: `enc:v1:<salt_hex>:<iv_hex>:<ciphertext_hex>`.
   - Excerpt otomatis disamarkan menjadi `[Encrypted Note]`.

3. **Native Server-Side Media & File Storage (`database/files`):**
   - Mendukung unggahan gambar resolusi penuh (tanpa *downscaling* paksa / *lossless*) dan lampiran dokumen (PDF, audio, arsip).
   - Semua file fisik disimpan di server PocketBase pada folder host `database/files/` (atau volume container terdedikasi), sedangkan catatan hanya menyimpan tag referensi URL file.

4. **Trash Bento Card & Safe Soft-Delete:**
   - Catatan yang dihapus masuk ke status Trash (*soft-delete*).
   - **Trash Bento Card** khusus selalu berada di posisi kartu paling terakhir di grid dashboard utama ($N+1$), atau menjadi kartu pertama jika tidak ada catatan aktif sama sekali ($N=0$).
   - Mengklik Trash Card membuka tampilan galeri bento untuk me-*restore* catatan atau menghapusnya secara permanen.

---

## 🔗 Integrasi Mobile & Web

Sistem dirancang dengan integrasi mulus antara aplikasi Mobile (Expo React Native) dan Web (React + Vite):
- **Universal Backend:** Baik Mobile maupun Web terhubung ke PocketBase instance yang sama.
- **Deterministic Conflict Resolution (LWW):** Logika sinkronisasi dua arah otomatis mendeteksi perubahan terbaru berdasarkan timestamp `client_updated_at` dan `version` revisi catatan.
- **Anti-Data-Loss Protection:** Data lokal tidak pernah dihapus secara sepihak hanya karena respon query server kosong; penghapusan memerlukan tombstone soft-delete eksplisit (`is_deleted: true`).
- **Cross-Platform Crypto Unlocking:** Catatan yang dikunci di Web dapat langsung didekripsi di Mobile dengan PIN yang sama, dan sebaliknya.
- **Lossless Server Media Access:** Gambar atau dokumen yang diunggah dari ponsel langsung dapat diakses dan di-render di browser web melalui URL server terstandarisasi `/api/files/notes/:id/:filename`.
- **Integrated Drawing:** Sketsa tangan diserialisasi sebagai format vector / SVG yang kompatibel di kedua platform.

---

## 📁 Struktur Monorepo

```
cloudnotes/
├── apps/
│   ├── web/                    # React 18 + Vite 5 + Tailwind CSS SPA (Bento Grid, Note Editor)
│   └── mobile/                 # React Native + Expo (Expo Router, SQLite, SecureStore, Biometrics)
├── packages/
│   ├── shared-types/           # Note domain models, WebCrypto AES-GCM, PBKDF2, sync engine, AI runner
│   └── design-system/          # Universal Bento tokens, cover color palettes (Amber, Emerald, etc.)
├── database/
│   ├── pb_migrations/          # Declarative PocketBase JS migration untuk koleksi `notes`
│   ├── pb_data/                # PocketBase SQLite storage (git-ignored)
│   ├── pb_public/              # Output build statis web yang disajikan langsung oleh PocketBase
│   └── files/                  # Penyimpanan fisik media original lossless (git-ignored)
├── deploy/
│   ├── docker-compose.yml      # Orchestration PocketBase + Cloudflare Tunnel
│   └── cloudflared/            # Template konfigurasi Cloudflare Tunnel
├── .env.example                # Template konfigurasi environment (RFC 2606 dummy domains)
├── package.json                # npm workspaces root configuration
└── tsconfig.base.json          # Root TypeScript configuration
```

---

## 🚀 Panduan Menjalankan & Testing di Lokal (Tanpa Docker)

Untuk menjalankan di laptop/mesin lokal, **tidak butuh Docker sama sekali** (biner PocketBase sudah siap langsung di `database/`). Cukup gunakan 3 terminal:

### Terminal 1: Jalankan PocketBase Backend Server
```bash
npm run server
```
- Server PocketBase langsung aktif di: `http://127.0.0.1:8090`
- Migrasi tabel `notes` otomatis dieksekusi.
- Web admin PocketBase: `http://127.0.0.1:8090/_/` (buat akun admin saat pertama kali membuka).

### Terminal 2: Jalankan Frontend Web
```bash
npm run dev:web
```
- Buka browser di: `http://localhost:5173`
- Klik icon **Server / Connect** di pojok kanan atas, klik **Test** (`http://127.0.0.1:8090`).
- Buat akun pengguna di tab **Register** (misal: `user@example.com` / `password123`).

### Terminal 3: Jalankan Mobile App (Expo)
```bash
npm run dev:mobile
```
- Scan QR code via aplikasi **Expo Go** di HP atau jalankan di Android/iOS emulator (`a` / `i`).
- **Konfigurasi URL Server di Mobile:**
  - **HP Fisik (Expo Go):** Masukkan IP LAN laptop Anda (misal: `http://192.168.1.5:8090`, cek via `ipconfig`).
  - **Android Emulator:** Masukkan `http://10.0.2.2:8090`.
  - **iOS Simulator:** Masukkan `http://127.0.0.1:8090`.
- Login dengan akun yang sama seperti di Web.

---

## 🧪 Skenario Pengujian Integrasi Mobile & Web

1. **Sinkronisasi Dua Arah (Last-Write-Wins):**
   - Buat catatan di Web -> Pull-to-refresh di Mobile -> Catatan muncul seketika!
   - Edit di Mobile saat offline -> Nyalakan server -> Catatan tersinkronisasi tanpa kehilangan data (*Anti-Data-Loss*).
2. **Kriptografi Stealth PIN Lintas Platform:**
   - Kunci catatan di Web dengan Stealth PIN (misal: 2 digit `79` atau 6 digit `892014`).
   - Buka catatan tersebut di Mobile -> Masukkan PIN stealth yang sama -> Catatan langsung terdekripsi!
3. **Penyimpanan Media Server Lossless (`database/files`):**
   - Upload foto resolusi penuh dari Mobile via kamera/galeri.
   - Buka catatan di Web -> Gambar tampil tajam tanpa penurunan resolusi (*no canvas downscaling*).
4. **Siklus Trash Bento Card:**
   - Hapus catatan di Mobile -> Di Web, catatan otomatis masuk ke **Trash Bento Card** di posisi terakhir ($N+1$).
   - Buka Trash Gallery di Web -> Klik **Restore** -> Catatan kembali aktif di Mobile.
5. **Doodling Sketsa Tangan:**
   - Buat sketsa di canvas Web -> Gambar tersimpan dan dapat dilihat di Mobile.

---

## 🚢 Deployment Production (Dengan Docker)
Untuk server VPS / cloud production:
```bash
npm run build:web && docker compose -f deploy/docker-compose.yml up -d
```

## 🔒 Kebijakan Zero Personal Secrets
Proyek ini mematuhi standar sanitasi repositori open-source:
- Bebas dari email pribadi, password, atau API key pribadi.
- Placeholder URL menggunakan standar RFC 2606 dummy domains (`notes.example.com`, `user@example.com`, `http://127.0.0.1:8090`).
- File database fisik (`pb_data/`), file media upload (`database/files/`), biner executable, dan `.env` lokal dikecualikan dari Git melalui `.gitignore`.

# Tidy Tide Laundry

Situs satu halaman untuk Tidy Tide Laundry: harga kiloan dan satuan, cara pesan, lokasi, jam buka, dan tombol pesan lewat WhatsApp.

## Mengubah isi

Semua isi ada di **`konten.json`**: harga, alamat, jam buka, nomor WhatsApp, dan tanya jawab. Tampilan ada di `src/style.css`, susunan halaman di `build.mjs`.

Bagian yang diawali `ISI:` belum diisi. Selama masih ada, perintah `node build.mjs` berhenti dan menyebut bagian mana saja, supaya harga contoh tidak pernah terpasang ke publik.

## Melihat hasilnya

Butuh Node.js 20 atau lebih baru. Tidak ada paket yang perlu dipasang.

```bash
node build.mjs --preview        # bagian yang belum diisi ditandai kuning
python -m http.server 4321 -d dist
```

Lalu buka http://localhost:4321.

## Memasang di internet

Situs ini memakai Cloudflare Pages karena gratis dan boleh dipakai untuk bisnis. (Paket gratis Vercel hanya untuk pemakaian pribadi.)

1. Push repo ini ke GitHub.
2. Di dashboard Cloudflare: Workers & Pages > Create > Pages > Connect to Git, pilih repo ini.
3. Build command: `node build.mjs`. Build output directory: `dist`.
4. Setelah terpasang, tambahkan domain di tab Custom domains.

Setiap perubahan yang di-push ke `main` otomatis terpasang.

## Lisensi

[MIT](LICENSE)

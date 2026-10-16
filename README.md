# Portofolio Mobile Developer

Website portofolio statis (tanpa framework, tanpa build step). Cukup buka `index.html`.

## Struktur

```
portfolio/
├── index.html          # Struktur halaman (semua section)
├── css/
│   └── style.css       # Tampilan, tema gelap/terang, responsive
├── js/
│   └── script.js       # Interaksi: menu, tema, filter proyek, form
├── assets/
│   ├── img/
│   │   └── profile.jpg # Foto profilmu (opsional)
│   └── cv.pdf          # CV untuk tombol "Unduh CV" (opsional)
└── README.md
```

## Yang perlu kamu ganti

1. `index.html` → nama, deskripsi, skill, proyek, pengalaman, link sosial.
2. `js/script.js` → variabel `MY_EMAIL` dengan emailmu.
3. Taruh `profile.jpg` di `assets/img/` dan `cv.pdf` di `assets/`.
4. Untuk proyek baru, salin satu blok `<article class="project">` lalu ubah isinya.
   Atribut `data-category` harus sama dengan tombol filter (`android`, `flutter`, `ios`).

## Cara menjalankan

- Klik dua kali `index.html`, atau
- Pakai ekstensi **Live Server** di VS Code.

## Cara publikasi gratis

- **GitHub Pages**: push ke repo, lalu Settings → Pages → pilih branch `main`.
- **Netlify / Vercel**: drag & drop foldernya.

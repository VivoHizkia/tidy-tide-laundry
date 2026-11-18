// Builds the site from konten.json into dist/.
//
//   node build.mjs            for publishing: stops if anything in konten.json still starts with "ISI"
//   node build.mjs --preview  for looking at it locally: unfilled parts are shown highlighted
//
// No dependencies. Cloudflare Pages runs this with the build command "node build.mjs" and
// publishes the "dist" folder.

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const preview = process.argv.includes("--preview");
const k = JSON.parse(readFileSync("konten.json", "utf8"));

// --- Unfilled content -------------------------------------------------------

const PLACEHOLDER = /^ISI\b/;

function findPlaceholders(value, path = "") {
  if (typeof value === "string") return PLACEHOLDER.test(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((item, i) => findPlaceholders(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      findPlaceholders(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

const missing = findPlaceholders(k);
if (missing.length > 0 && !preview) {
  console.error("konten.json masih punya bagian yang belum diisi:\n");
  for (const path of missing) console.error(`  - ${path}`);
  console.error("\nIsi semuanya dulu. Untuk melihat tampilan sementara: node build.mjs --preview");
  process.exit(1);
}

// --- Helpers ----------------------------------------------------------------

const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// Text for the page. In preview, unfilled values are marked so they are easy to spot.
const t = (value) => {
  const text = escape(value);
  return preview && PLACEHOLDER.test(value) ? `<mark class="isi">${text}</mark>` : text;
};

// A value used inside an attribute or a link: never shown highlighted.
const plain = (value) => (PLACEHOLDER.test(value) ? "" : value);

const digits = plain(k.whatsapp).replace(/\D/g, "");
const waLink = (message = k.pesanWhatsapp) =>
  `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
const siteUrl = plain(k.alamatSitus).replace(/\/$/, "");

const description = `Laundry kiloan dan satuan di ${plain(k.area) || "kota Anda"}. Lihat harga, jam buka, dan pesan antar-jemput lewat WhatsApp.`;

// Lets Google show the business with its address, hours and phone in search and on Maps.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "DryCleaningOrLaundry",
  name: k.nama,
  url: siteUrl || undefined,
  telephone: digits ? `+${digits}` : undefined,
  address: plain(k.alamat) || undefined,
  hasMap: plain(k.linkPeta) || undefined,
  areaServed: plain(k.area) || undefined,
};

// --- Page -------------------------------------------------------------------

const WA_ICON = `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>`;

const priceRow = (row, withTime) => `
          <li>
            <span class="nota__item">${t(row.layanan)}${
              withTime ? `<small>Selesai ${t(row.waktu)}</small>` : ""
            }</span>
            <span class="nota__titik" aria-hidden="true"></span>
            <span class="nota__harga">${t(row.harga)}</span>
          </li>`;

const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(k.nama)}: laundry kiloan dan antar-jemput di ${escape(plain(k.area) || "kota Anda")}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#17707a">
  <meta property="og:title" content="${escape(k.nama)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="website">
  ${siteUrl ? `<link rel="canonical" href="${escape(siteUrl)}/">` : ""}
  ${preview ? '<meta name="robots" content="noindex">' : ""}
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap">
  <link rel="stylesheet" href="style.css">
  <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>
</head>
<body>
  <a class="lewati" href="#harga">Langsung ke daftar harga</a>

  <header class="atas">
    <div class="atas__dalam">
      <a class="merek" href="#">Tidy<span>Tide</span></a>
      <nav aria-label="Menu">
        <a href="#harga">Harga</a>
        <a href="#lokasi">Lokasi</a>
        <a class="tombol tombol--kecil" href="${escape(waLink())}">${WA_ICON}WhatsApp</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="pembuka">
      <div class="pembuka__dalam">
        <h1>Taruh cuciannya.<br>Kami yang urus sisanya.</h1>
        <p class="pembuka__isi">Laundry kiloan dan satuan di ${t(k.area)}. ${t(k.antarJemput)}</p>
        <div class="tombol-baris">
          <a class="tombol" href="${escape(waLink())}">${WA_ICON}Pesan lewat WhatsApp</a>
          <a class="tombol tombol--garis" href="#harga">Lihat harga</a>
        </div>
      </div>
      <svg class="ombak" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 52c120 26 240 34 360 20S600 18 720 22s240 40 360 44 240-26 360-34V90H0Z"/>
      </svg>
    </section>

    <section id="harga" class="bagian" aria-labelledby="judul-harga">
      <h2 id="judul-harga">Harga</h2>
      <div class="nota-baris">
        <article class="nota" aria-labelledby="judul-kiloan">
          <h3 id="judul-kiloan">Kiloan <span>per kg</span></h3>
          <ul>${k.kiloan.map((row) => priceRow(row, true)).join("")}
          </ul>
          <p class="nota__catatan">${t(k.catatanKiloan)}</p>
        </article>
        <article class="nota" aria-labelledby="judul-satuan">
          <h3 id="judul-satuan">Satuan <span>per barang</span></h3>
          <ul>${k.satuan.map((row) => priceRow(row, false)).join("")}
          </ul>
          <p class="nota__catatan">Barang lain? <a href="${escape(waLink("Halo Tidy Tide, saya mau tanya harga laundry untuk: "))}">Tanya lewat WhatsApp</a>.</p>
        </article>
      </div>
    </section>

    <section class="bagian" aria-labelledby="judul-cara">
      <h2 id="judul-cara">Cara pesan</h2>
      <ol class="langkah">
        <li><strong>Kirim pesan WhatsApp</strong> dengan alamat Anda dan perkiraan jumlah cucian.</li>
        <li><strong>Kami jemput</strong> cucian Anda, atau antar sendiri ke toko.</li>
        <li><strong>Cucian diantar kembali</strong> sesuai waktu pengerjaan, dan Anda bayar saat terima.</li>
      </ol>
    </section>

    <section id="lokasi" class="bagian lokasi" aria-labelledby="judul-lokasi">
      <h2 id="judul-lokasi">Lokasi dan jam buka</h2>
      <div class="lokasi__isi">
        <div>
          <p class="lokasi__alamat">${t(k.alamat)}</p>
          ${
            plain(k.linkPeta)
              ? `<a class="tombol tombol--garis" href="${escape(k.linkPeta)}">Buka di Google Maps</a>`
              : preview
                ? `<p>${t(k.linkPeta)}</p>`
                : ""
          }
        </div>
        <table class="jam">
          <caption>Jam buka</caption>
          <tbody>${k.jamBuka
            .map((row) => `
            <tr><th scope="row">${t(row.hari)}</th><td>${t(row.jam)}</td></tr>`)
            .join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="bagian" aria-labelledby="judul-tanya">
      <h2 id="judul-tanya">Yang sering ditanyakan</h2>
      <div class="tanya">${k.tanyaJawab
        .map((item) => `
        <details>
          <summary>${t(item.tanya)}</summary>
          <p>${t(item.jawab)}</p>
        </details>`)
        .join("")}
      </div>
    </section>
  </main>

  <footer class="bawah">
    <p><strong>${escape(k.nama)}</strong>. ${t(k.alamat)}</p>
    <p><a href="${escape(waLink())}">WhatsApp ${escape(digits ? `+${digits}` : "")}</a></p>
  </footer>

  <a class="wa-melayang" href="${escape(waLink())}" aria-label="Pesan lewat WhatsApp">${WA_ICON}<span>Pesan</span></a>
</body>
</html>
`;

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
writeFileSync("dist/index.html", html);
copyFileSync("src/style.css", "dist/style.css");
copyFileSync("src/favicon.svg", "dist/favicon.svg");
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""}`);
if (siteUrl) {
  writeFileSync(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(siteUrl)}/</loc></url></urlset>\n`,
  );
}

console.log(
  preview && missing.length > 0
    ? `Pratinjau dibuat di dist/. ${missing.length} bagian belum diisi dan ditandai kuning.`
    : "Situs dibuat di dist/.",
);

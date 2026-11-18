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
const plain = (value = "") => (PLACEHOLDER.test(value) ? "" : value);

// An optional sentence: left out when empty, highlighted in preview when unfilled.
const optional = (value, wrap) => (value && (preview || plain(value)) ? wrap(t(value)) : "");

const digits = plain(k.whatsapp).replace(/\D/g, "");
const waDisplay = digits ? `0${digits.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3") : "";
const waLink = (message = k.pesanWhatsapp) =>
  `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
const siteUrl = plain(k.alamatSitus).replace(/\/$/, "");
const area = plain(k.area);

const description = `Laundry kiloan, satuan, bed cover, dan sepatu${area ? ` di ${area}` : ""}. ${plain(k.antarJemput)} Lihat harga lengkap dan pesan lewat WhatsApp.`;

// Lets Google show the business with its address, phone and prices in search and on Maps.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "DryCleaningOrLaundry",
  name: k.nama,
  url: siteUrl || undefined,
  logo: siteUrl ? `${siteUrl}/logo-960.png` : undefined,
  image: siteUrl ? `${siteUrl}/logo-960.png` : undefined,
  telephone: digits ? `+${digits}` : undefined,
  address: plain(k.alamat) || undefined,
  hasMap: plain(k.linkPeta) || undefined,
  areaServed: area || undefined,
  priceRange: "Rp 7.000 sampai Rp 102.000",
};

// --- Page pieces --------------------------------------------------------------

const WA_ICON = `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>`;

// One line of a price list, with a dotted leader between the item and its price.
const priceRow = (row) => `
            <li>
              <span class="nota__item">${t(row.layanan)}</span>
              <span class="nota__titik" aria-hidden="true"></span>
              <span class="nota__harga">${t(row.harga)}</span>
            </li>`;

const priceList = (id, title, unit, rows, extraClass = "") => `
        <article class="nota ${extraClass}" aria-labelledby="${id}">
          <h3 id="${id}">${title} <span>${unit}</span></h3>
          <ul>${rows.map(priceRow).join("")}
          </ul>
        </article>`;

const kiloRow = (row) => `
              <tr>
                <th scope="row">${t(row.layanan)} <span>${t(row.berat)}</span></th>
                <td>${t(row.reguler)}</td>
                <td>${t(row.member)}</td>
              </tr>`;

const kiloan = `
        <article class="nota nota--lebar" aria-labelledby="judul-kiloan">
          <h3 id="judul-kiloan">Kiloan <span>${t(k.kiloan.catatan)}</span></h3>
          <table class="kilo">
            <thead>
              <tr><th scope="col">Layanan</th><th scope="col">Reguler</th><th scope="col">Member</th></tr>
            </thead>
            <tbody>${k.kiloan.paket.map(kiloRow).join("")}
            </tbody>
            <tbody class="kilo__tambahan">
              <tr><th scope="rowgroup" colspan="3">Lebih dari paket</th></tr>${k.kiloan.tambahan.map(kiloRow).join("")}
            </tbody>
          </table>
          ${optional(k.kiloan.caraMember, (text) => `<p class="nota__catatan">${text}</p>`)}
        </article>`;

const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(k.nama)}: laundry kiloan dan satuan${area ? ` di ${escape(area)}` : ""}, gratis antar-jemput</title>
  <meta name="description" content="${escape(description)}">
  <meta name="theme-color" content="#1a2450">
  <meta property="og:title" content="${escape(k.nama)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="website">
  ${siteUrl ? `<meta property="og:image" content="${escape(siteUrl)}/logo-960.png">\n  <link rel="canonical" href="${escape(siteUrl)}/">` : ""}
  ${preview ? '<meta name="robots" content="noindex">' : ""}
  <link rel="icon" href="favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
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
      <a class="merek" href="#"><img src="logo-480.png" srcset="logo-480.png 480w, logo-960.png 960w" sizes="150px" width="150" height="77" alt="${escape(k.nama)}"></a>
      <nav aria-label="Menu">
        <a href="#harga">Harga</a>
        <a href="#syarat">Syarat</a>
        <a href="#lokasi">Lokasi</a>
        <a class="tombol tombol--kecil" href="${escape(waLink())}">${WA_ICON}WhatsApp</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="pembuka">
      <div class="pembuka__dalam">
        <h1>Taruh cuciannya.<br>Kami yang urus sisanya.</h1>
        <p class="pembuka__isi">Laundry kiloan, satuan, bed cover, dan sepatu di ${t(k.area)}. ${t(k.antarJemput)} ${t(k.lamaPengerjaan)}</p>
        <div class="tombol-baris">
          <a class="tombol" href="${escape(waLink())}">${WA_ICON}Pesan lewat WhatsApp</a>
          <a class="tombol tombol--garis" href="#harga">Lihat harga</a>
        </div>
      </div>
      <svg class="ombak" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path class="ombak__biru" d="M0 58c130 34 250 40 380 20s250-50 380-44 250 46 380 48 200-22 300-30V120H0Z"/>
        <path class="ombak__krem" d="M0 84c120 24 240 30 360 16S600 62 720 66s240 34 360 36 240-18 360-26V120H0Z"/>
      </svg>
    </section>

    <section id="harga" class="bagian" aria-labelledby="judul-harga">
      <h2 id="judul-harga">Harga</h2>
      <div class="nota-susun">${kiloan}
        ${priceList("judul-satuan", "Satuan", "per potong", k.satuan, "nota--dua-kolom")}
        <div class="nota-tumpuk">
          ${priceList("judul-linen", "Bed cover dan linen", "per potong", k.linen)}
          ${priceList("judul-sepatu", "Sepatu dan sandal", "per pasang", k.sepatu)}
        </div>
      </div>
      <p class="harga__bawah">Barang lain? <a href="${escape(waLink("Halo Tidy Tide, saya mau tanya harga laundry untuk: "))}">Tanya harganya lewat WhatsApp</a>.</p>
    </section>

    <section class="bagian" aria-labelledby="judul-cara">
      <h2 id="judul-cara">Cara pesan</h2>
      <ol class="langkah">
        <li><strong>Kirim pesan WhatsApp</strong> Sebutkan alamat Anda dan perkiraan jumlah cucian.</li>
        <li><strong>Kami jemput, gratis</strong> Atau antar sendiri cucian Anda ke toko.</li>
        <li><strong>Cucian diantar kembali</strong> Bersih, rapi, dan sampai di depan pintu.</li>
      </ol>
    </section>

    <section id="syarat" class="bagian" aria-labelledby="judul-syarat">
      <h2 id="judul-syarat">Syarat dan ketentuan</h2>
      <ol class="syarat">${k.syarat.map((item) => `
        <li>${t(item)}</li>`).join("")}
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
          ${waDisplay ? `<p>Customer service: <a href="${escape(waLink())}">${escape(waDisplay)}</a></p>` : ""}
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
    ${waDisplay ? `<p><a href="${escape(waLink())}">WhatsApp ${escape(waDisplay)}</a></p>` : ""}
  </footer>

  <a class="wa-melayang" href="${escape(waLink())}" aria-label="Pesan lewat WhatsApp">${WA_ICON}<span>Pesan</span></a>
</body>
</html>
`;

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
writeFileSync("dist/index.html", html);
for (const file of ["style.css", "logo-480.png", "logo-960.png", "favicon.png", "apple-touch-icon.png"]) {
  copyFileSync(`src/${file}`, `dist/${file}`);
}
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

document.documentElement.classList.add("js");

// Theme toggle (remembered per browser)
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("themeBtn");
  if (btn) btn.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("halcyon-theme", next); } catch (e) {}
  });
})();

// Background: flowing lines drawn on a canvas
(function () {
  const cv = document.getElementById("waves");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, colA = [62, 240, 194], colB = [124, 108, 255], light = false;
  let mouseX = 0.5, mouseY = 0.4, tx = 0.5, ty = 0.4;

  const hexToRgb = (h) => { h = h.trim().replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colA = hexToRgb(s.getPropertyValue("--accent"));
    colB = hexToRgb(s.getPropertyValue("--accent-2"));
    light = document.documentElement.dataset.theme === "light";
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    const t = time / 1000;
    mouseX += (tx - mouseX) * 0.04;
    mouseY += (ty - mouseY) * 0.04;
    ctx.clearRect(0, 0, W, H);
    const small = W < 700;
    const lines = small ? 16 : 26;
    const step = small ? 10 : 7;
    for (let i = 0; i < lines; i++) {
      const k = i / (lines - 1);                       // 0..1 across the bundle
      const mid = 1 - Math.abs(k - 0.5) * 2;           // 1 in the middle, 0 at the edges
      const r = Math.round(colA[0] + (colB[0] - colA[0]) * k);
      const g = Math.round(colA[1] + (colB[1] - colA[1]) * k);
      const b = Math.round(colA[2] + (colB[2] - colA[2]) * k);
      const alpha = ((light ? 0.10 : 0.09) + mid * (light ? 0.18 : 0.28)) * (small ? 0.7 : 1);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 1 + mid * 0.6;
      ctx.beginPath();
      // on phones, keep the lines below the hero text
      const base = small ? H * (0.66 + k * 0.30) : H * (0.30 + k * 0.42);
      for (let x = -20; x <= W + 20; x += step) {
        const u = x / W;
        // lines swell toward the mouse
        const pull = Math.exp(-Math.pow((u - mouseX) * 3, 2)) * (mouseY - 0.5) * 60;
        const y = base
          + Math.sin(u * 5.2 + t * 0.35 + i * 0.22) * (28 + mid * 34)
          + Math.sin(u * 11.0 - t * 0.55 + i * 0.12) * 10
          + Math.sin(u * 2.1 + t * 0.15) * 40
          + pull * mid;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // fade the lines as you scroll past the hero
  function onScroll() { cv.style.opacity = Math.max(0.25, 1 - window.scrollY / (H * 1.1)).toFixed(2); }

  let raf = 0;
  function loop(time) { draw(time); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  readColors(); resize(); onScroll();
  reduce ? draw(0) : start();
  window.addEventListener("resize", () => { resize(); if (reduce) draw(0); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", (e) => { tx = e.clientX / W; ty = e.clientY / H; }, { passive: true });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  new MutationObserver(() => { readColors(); if (reduce) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();

// Fade sections in as they scroll into view
(function () {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  els.forEach((el) => io.observe(el));
})();

// Waitlist form — sends to Netlify Forms once the site is hosted on Netlify
(function () {
  const form = document.getElementById("wlForm");
  if (!form) return;
  const msg = document.getElementById("wlMsg");
  const btn = document.getElementById("wlBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "wl-msg";

    // Opened from your own computer: there is nowhere to save emails yet
    const local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local) {
      msg.classList.add("info");
      msg.textContent = "Preview mode: emails are saved once the site is live on Netlify.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Joining…";
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      msg.textContent = "You're on the list. We'll email you when your spot opens.";
      form.reset();
    } catch (err) {
      msg.classList.add("err");
      msg.textContent = "Couldn't save your email right now. Please try again in a moment.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Join waitlist";
    }
  });
})();

/* ---------------- copy contract address ---------------- */
(function () {
  const btn = document.getElementById("caCopy");
  const addr = document.getElementById("caAddr");
  if (!btn || !addr) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(addr.textContent.trim());
      btn.textContent = "Copied ✓";
    } catch (e) {
      // clipboard blocked: select the text so it can be copied by hand
      const r = document.createRange(); r.selectNodeContents(addr);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = "Press Ctrl+C";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  });
})();

/* ------------------------------------------------------------------
   Assets: badge, CoinGecko id, and a rough implied volatility used
   to estimate option premiums. Fallback prices are used only if the
   live price request fails.
------------------------------------------------------------------- */
const COINS = {
  BTC:     { g: "₿", bg: "#f7931a", id: "bitcoin", img: "1/small/bitcoin.png",              iv: 0.50, stock: false, fb: 80800 },
  cbBTC:   { g: "₿", bg: "#2f5bff", id: "coinbase-wrapped-btc", img: "40143/small/cbbtc.webp", iv: 0.50, stock: false, fb: 80800 },
  ETH:     { g: "Ξ", bg: "#627eea", id: "ethereum", img: "279/small/ethereum.png",             iv: 0.65, stock: false, fb: 2350 },
  SOL:     { g: "◎", bg: "linear-gradient(135deg,#9945ff,#14f195)", id: "solana", img: "4128/small/solana.png",          iv: 0.80, stock: false, fb: 101 },
  JitoSOL: { g: "◎", bg: "linear-gradient(135deg,#1d9e75,#7bdcb5)", id: "jito-staked-sol", img: "28046/small/JitoSOL_Token_Logo_Green.png", iv: 0.80, stock: false, fb: 132 },
  xNVDA:   { g: "N", bg: "#5f9e1a", id: "nvidia-xstock", img: "55633/small/Ticker_NVDA__Company_Name_NVIDIA_Corp__size_200x200_2x.png",    iv: 0.45, stock: true, fb: 218 },
  xAAPL:   { g: "A", bg: "#5b6474", id: "apple-xstock", img: "55586/small/Ticker_AAPL__Company_Name_Apple_Inc.__size_200x200_2x.png",     iv: 0.28, stock: true, fb: 347 },
  xTSLA:   { g: "T", bg: "#d6333c", id: "tesla-xstock", img: "55638/small/Ticker_TSLA__Company_Name_Tesla_Inc.__size_200x200_2x.png",     iv: 0.60, stock: true, fb: 407 },
  xMSFT:   { g: "M", bg: "#1f7ae0", id: "microsoft-xstock", img: "55630/small/Ticker_MSFT__Company_Name_Microsoft_Inc.__size_200x200_2x.png", iv: 0.27, stock: true, fb: 534 },
  xGOOGL:  { g: "G", bg: "#3a7cf0", id: "alphabet-xstock", img: "55610/small/Ticker_GOOG__Company_Name_Alphabet_Inc.__size_200x200_2x.png",  iv: 0.32, stock: true, fb: 326 },
};

// Current prices: { BTC: { p: 80833, ch: 1.3 }, ... }
const PRICES = {};
let PRICES_LIVE = false;
Object.keys(COINS).forEach((s) => (PRICES[s] = { p: COINS[s].fb, ch: 0 }));

const fmtUsd = (v) => v >= 1000
  ? "$" + Math.round(v).toLocaleString("en-US")
  : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const IMG_BASE = "https://coin-images.coingecko.com/coins/images/";
// Token image from CoinGecko; if it fails to load, the coloured glyph badge shows instead
const coinBadge = (sym) => {
  const c = COINS[sym] || { g: sym[0], bg: "#64748b" };
  const img = c.img ? `<img src="${IMG_BASE}${c.img}" alt="" onload="this.parentNode.classList.add('has-img')" onerror="this.remove()">` : "";
  return `<span class="coin" style="--c:${c.bg}" aria-hidden="true">${c.g}${img}</span>`;
};

async function loadPrices() {
  const ids = Object.values(COINS).map((c) => c.id).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  try {
    // reuse prices fetched in the last 60s (keeps us under the free API limit)
    let data = null;
    try {
      const cached = JSON.parse(sessionStorage.getItem("halcyon-prices") || "null");
      if (cached && Date.now() - cached.t < 60000) data = cached.data;
    } catch (e) {}
    if (!data) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
      try { sessionStorage.setItem("halcyon-prices", JSON.stringify({ t: Date.now(), data })); } catch (e) {}
    }
    for (const [sym, c] of Object.entries(COINS)) {
      const d = data[c.id];
      if (d && d.usd) PRICES[sym] = { p: d.usd, ch: d.usd_24h_change || 0 };
    }
    PRICES_LIVE = true;
  } catch (e) {
    // keep the last known prices
  }
  renderTicker();
  renderExample();
}

// Asset strip with badges, live price and 24h change
function renderTicker() {
  const track = document.querySelector(".ticker-track");
  if (!track) return;
  const item = (s, hidden) => {
    const { p, ch } = PRICES[s];
    const chHtml = PRICES_LIVE ? `<em class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(2)}%</em>` : "";
    return `<span class="tk"${hidden ? ' aria-hidden="true"' : ""}>${coinBadge(s)}<b>${s}</b><span>${fmtUsd(p)}</span>${chHtml}</span>`;
  };
  const syms = Object.keys(COINS);
  track.innerHTML = syms.map((s) => item(s)).join("") + syms.map((s) => item(s, true)).join("");
}

/* ---------------- option maths (Black-Scholes estimate) ---------------- */
function normCdf(x) {
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
function bsPrice(side, S, K, days, iv, r = 0.04) {
  const T = days / 365;
  const d1 = (Math.log(S / K) + (r + iv * iv / 2) * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  return side === "call"
    ? S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2)
    : K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}
function niceStrike(x) {
  const step = x < 20 ? 0.5 : x < 200 ? 5 : x < 1000 ? 10 : x < 5000 ? 50 : x < 20000 ? 250 : 1000;
  return Math.round(x / step) * step;
}
// Build a full quote from the live price
function makeQuote(sym, side, days, otm, qty) {
  const S = PRICES[sym].p;
  const K = niceStrike(side === "call" ? S * (1 + otm) : S * (1 - otm));
  const perUnit = bsPrice(side, S, K, days, COINS[sym].iv);
  const premium = perUnit * qty;
  const collateral = side === "call" ? S * qty : K * qty;
  return { S, K, premium, collateral, days };
}
const aprOf = (prem, coll, days) => (prem / coll) * (365 / days) * 100;

// "An example" section uses the live ETH price
function renderExample() {
  const q = makeQuote("ETH", "call", 14, 0.09, 2);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("exSpot", fmtUsd(q.S));
  document.querySelectorAll(".exStrike").forEach((el) => (el.textContent = fmtUsd(q.K)));
  document.querySelectorAll(".exPrem").forEach((el) => (el.textContent = "$" + Math.round(q.premium)));
}

/* ---------------- auto-playing quote demo ---------------- */
(function () {
  const demo = document.getElementById("demo");
  renderTicker();
  renderExample();
  // wait up to 4s for the first live prices before the demo starts
  const firstLoad = Promise.race([loadPrices(), new Promise((r) => setTimeout(r, 4000))]);
  setInterval(loadPrices, 60000); // refresh every minute
  if (!demo) return;

  const DESKS = ["Arcadia Desk", "Northline MM", "Kestrel Trading", "Bluewater Cap", "Meridian Flow"];
  const scenarios = [
    { side: "call", assets: ["xNVDA", "BTC", "SOL"],   pick: 0, days: 14, otm: 0.08, qty: 50 },
    { side: "put",  assets: ["ETH", "xAAPL", "BTC"],   pick: 0, days: 7,  otm: 0.07, qty: 2 },
    { side: "call", assets: ["SOL", "xTSLA", "ETH"],   pick: 1, days: 30, otm: 0.10, qty: 20 },
    { side: "put",  assets: ["BTC", "xMSFT", "SOL"],   pick: 0, days: 14, otm: 0.07, qty: 0.5 },
    { side: "call", assets: ["xGOOGL", "ETH", "SOL"],  pick: 2, days: 21, otm: 0.12, qty: 100 },
  ];

  const $ = (id) => document.getElementById(id);
  const seg = demo.querySelector(".seg");
  const segBtns = demo.querySelectorAll(".seg-btn");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (id, v) => { const el = $(id); el.textContent = v; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); };
  const status = (s) => ($("demoStatus").textContent = s);
  const source = () => ($("demoSource").textContent = PRICES_LIVE ? "live prices · est. quotes" : "sample prices");
  let i = 0;

  async function run(sc) {
    const sym = sc.assets[sc.pick];
    const q = makeQuote(sym, sc.side, sc.days, sc.otm, sc.qty);
    const sizeLabel = COINS[sym].stock ? `${sc.qty} sh` : `${sc.qty} ${sym}`;

    // desks bid around the model price
    const bids = DESKS.slice().sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2))
      .map((name) => {
        const prem = q.premium * (0.93 + Math.random() * 0.09);
        return [name, prem, aprOf(prem, q.collateral, sc.days)];
      });

    source();
    $("demoStep").textContent = "1 / 3";
    seg.dataset.side = sc.side;
    segBtns.forEach((b) => b.classList.toggle("active", b.dataset.side === sc.side));
    $("assetRow").innerHTML = sc.assets.map((t) => {
      const { p, ch } = PRICES[t];
      const chHtml = PRICES_LIVE ? ` <em class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</em>` : "";
      return `<div class="asset">${coinBadge(t)}<div><b>${t}</b><small>${fmtUsd(p)}${chHtml}</small></div></div>`;
    }).join("");
    ["strike", "expiry", "size"].forEach((k) => ($(k).textContent = "—"));
    $("bidsList").innerHTML = "";
    $("demoBtn").textContent = "Request quotes";
    status("Choosing asset");
    await wait(900);
    $("assetRow").children[sc.pick].classList.add("sel");
    await wait(700);

    $("demoStep").textContent = "2 / 3";
    status(`Spot ${fmtUsd(q.S)} · setting terms`);
    setVal("strike", fmtUsd(q.K)); await wait(450);
    setVal("expiry", `${sc.days}d`); await wait(450);
    setVal("size", sizeLabel); await wait(800);

    $("demoStep").textContent = "3 / 3";
    $("demoBtn").textContent = "Collecting bids…";
    status("Broadcasting to desks");
    const shown = [];
    for (const b of bids) {
      await wait(550);
      shown.push(b);
      shown.sort((a, c) => c[1] - a[1]);
      $("bidsList").innerHTML = shown.map((x, n) =>
        `<div class="bid${n === 0 ? " best" : ""}"><span>${x[0]}</span><span>${fmtNum(x[1])} USDC</span><span>${x[2].toFixed(1)}%</span></div>`).join("");
    }
    const best = shown[0];
    await wait(600);
    $("demoBtn").textContent = `Accept · +${fmtNum(best[1])} USDC`;
    status(`Best bid from ${best[0]}`);
    await wait(1400);
    status("Settled onchain ✓");
    await wait(1600);
  }

  (async function loop() {
    status("Loading live prices…");
    await firstLoad;
    for (;;) await run(scenarios[i++ % scenarios.length]);
  })();
})();

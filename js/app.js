// STANDBOY live board: read-only chain reads (RPC race), stands visual,
// copy buttons, wallet check. No wallet connection, no transactions.
const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CONFIG = {
  nft: "0x6043a590F315B9fF44aD3b3298198f89b6b4b548",
  token: "0xC2515e15586183d4E8e1D3Ec9AA4d1Bb53107eDb",
  claim: "0x2caf4b66C2AF9bd18CcA0EAc139dA71B808fcFA2",
  maxSupply: 5000,
  perClaim: 250000,
};
const RPCS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed-public.bnbchain.org",
  "https://bsc-mainnet.public.blastapi.io",
  "https://bsc-rpc.publicnode.com",
];
const SEL = {
  totalMinted: "0xa2309ff8",
  mintOpen: "0x24bbd049",
  totalClaimed: "0xd54ad2a1",
  claimOpen: "0x4b8bcb58",
  claimsRemaining: "0x754c463f",
  seatOf: "0xb9cd92c3",
  claimedById: "0x4c80ee12",
  balanceOf: "0x70a08231",
  ownerOf: "0x6352211e",
};
const MARKET_ADDR = "0x7F2DC95214ef7182C0A6Fc5F9f94C0718aa22987";
const MSEL = {
  listedIds: "0x7093f47f",
  listingOf: "0x84696967",
  feeBps: "0x9e663553",
};
function fmt(n) { return n.toLocaleString("en-US"); }
async function rpcCall(to, data) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] });
  const tries = RPCS.map((url) =>
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((j) => {
        if (!j.result || j.result === "0x") throw new Error("empty");
        return BigInt(j.result);
      })
  );
  return Promise.any(tries);
}
function encAddr(a) { return "0x" + a.replace(/^0x/, "").toLowerCase().padStart(64, "0"); }
function encUint(n) { return "0x" + BigInt(n).toString(16).padStart(64, "0"); }

// Count-up tween untuk angka papan.
function tween(el, to, suffix) {
  if (!el) return;
  const from = parseInt((el.dataset.v || "0"), 10);
  el.dataset.v = String(to);
  if (from === to) { el.textContent = fmt(to) + (suffix || ""); return; }
  const t0 = performance.now(), dur = 700;
  function step(t) {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))) + (suffix || "");
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
// Stadium wave melintasi tribun.
function doWave() {
  const el = document.getElementById("stands");
  if (!el || document.hidden) return;
  el.classList.remove("waving");
  void el.offsetWidth;
  el.classList.add("waving");
  setTimeout(() => el.classList.remove("waving"), 2400);
}
setInterval(doWave, 9000);

// Stands visual: 8 terrace rows x 60 seats; filled share follows minted count.
function drawStands(minted) {
  const el = document.getElementById("stands");
  if (!el) return;
  el.innerHTML = "";
  const rows = 8, cols = 60, total = rows * cols;
  const filled = Math.round((minted / CONFIG.maxSupply) * total);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row = document.createElement("div");
    row.className = "srow";
    const standCls = ["n", "e", "s", "w"][Math.floor(r / 2)];
    for (let c = 0; c < cols; c++) {
      const s = document.createElement("span");
      s.className = "seat" + (idx < filled ? " " + standCls : " dim");
      s.style.setProperty("--c", c);
      row.appendChild(s);
      idx++;
    }
    el.appendChild(row);
  }
}
drawStands(0);

async function refresh() {
  try {
    const [minted, mOpen, claimed, cOpen, cLeft] = await Promise.all([
      rpcCall(CONFIG.nft, SEL.totalMinted),
      rpcCall(CONFIG.nft, SEL.mintOpen),
      rpcCall(CONFIG.claim, SEL.totalClaimed),
      rpcCall(CONFIG.claim, SEL.claimOpen),
      rpcCall(CONFIG.claim, SEL.claimsRemaining),
    ]);
    const m = Number(minted), cl = Number(claimed);
    const prevM = window.STANDBOY ? window.STANDBOY.minted : null;
    tween(document.getElementById("b-minted"), m);
    tween(document.getElementById("b-left"), CONFIG.maxSupply - m);
    tween(document.getElementById("b-claimed"), cl);
    document.getElementById("b-next").textContent = m >= CONFIG.maxSupply ? "FULL" : "Nº " + fmt(m + 1);
    window.__SB_MINTED = m;
    if (window.SB) { window.SB.setNext(m + 1); window.SB.setStands(m); }
    var xp = document.getElementById("xp-fill"), xn = document.getElementById("xp-num"), hl = document.getElementById("hud-level");
    if (xp) xp.style.width = (m / CONFIG.maxSupply * 100).toFixed(1) + "%";
    if (xn) xn.textContent = (m / CONFIG.maxSupply * 100).toFixed(1) + "%";
    if (hl) hl.textContent = m >= 3750 ? "FLAG END" : m >= 2500 ? "DRUM END" : m >= 1250 ? "FAMILY STAND" : "KOP END";
    if (prevM !== null && m > prevM) {
      document.querySelectorAll(".bcell").forEach((c) => c.classList.add("flash"));
      setTimeout(() => document.querySelectorAll(".bcell").forEach((c) => c.classList.remove("flash")), 900);
      doWave();
    }
    document.getElementById("mint-status").textContent = mOpen === 1n ? "Mint is open" : "Opening soon";
    tween(document.getElementById("c-claimed"), cl);
    tween(document.getElementById("c-left"), Number(cLeft));
    document.getElementById("c-status").textContent = cOpen === 1n ? "OPEN" : "SOON";
    document.getElementById("strip-text").textContent =
      (mOpen === 1n ? "MINT IS LIVE" : "STANDS FILLING SOON") + " · FREE TO TAKE · ONE PER AGENT";
    drawStands(m);
    window.STANDBOY = { minted: m, claimed: cl };
  } catch (e) {
    // Chain not live yet or RPC unreachable: leave placeholders.
  }
}
refresh();
setInterval(refresh, 30000);
setTimeout(doWave, 1200);

// Scroll reveal untuk section.
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".rv").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
}

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const src = document.getElementById(btn.getAttribute("data-copy"));
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src.textContent.trim());
      const old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = old), 1600);
    } catch (e) {}
  });
});

const __checkBtn = document.getElementById("check-btn");
if (__checkBtn) __checkBtn.addEventListener("click", async () => {
  const input = document.getElementById("wallet-input").value.trim();
  const res = document.getElementById("check-res");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input)) { res.textContent = "Enter a full wallet address."; return; }
  res.textContent = "Checking…";
  try {
    const seat = Number(await rpcCall(CONFIG.nft, SEL.seatOf.slice(0, 10) + encAddr(input).slice(2)));
    if (seat === 0) { res.textContent = "No spot yet for this wallet."; return; }
    const claimed = await rpcCall(CONFIG.claim, SEL.claimedById.slice(0, 10) + encUint(seat).slice(2));
    res.textContent = "Spot Nº " + fmt(seat) + (claimed === 1n ? " · BOY already claimed for this spot." : " · 250,000 BOY ready to claim.");
  } catch (e) {
    res.textContent = "Could not read the chain right now. Try again in a moment.";
  }
});

/* ===== v3: notice board, maskot bicara, find-a-spot, confetti, tabel tribun ===== */
(function () {
  var S = { minted: 0 };
  function fmt(n) { return n.toLocaleString("en-US"); }

  // notice board berganti
  var notes = [
    "Mint is free. It has always been free.",
    "One spot per agent. House rule.",
    "Holding a spot pays 250,000 BOY.",
    "Claims land straight in the project wallet.",
    "Four stands. 5,000 numbered spots."
  ];
  var nt = document.getElementById("notice-text"), ni = 0;
  if (nt && !reduced) setInterval(function () {
    nt.classList.add("fade");
    setTimeout(function () { ni = (ni + 1) % notes.length; nt.textContent = notes[ni]; nt.classList.remove("fade"); }, 360);
  }, 4200);

  // maskot bicara
  var mascot = document.getElementById("mascot"), bubble = document.getElementById("bubble");
  var lines = ["Pick a spot, any spot.", "Kop End is filling up nicely.", "Every spot pays 250,000 BOY.", "See you on the stand!", "Free means free. Zero. Nothing."];
  var li = 0, bTimer = null;
  if (mascot && bubble) mascot.addEventListener("click", function () {
    li = (li + 1) % lines.length;
    bubble.textContent = (li === 1 && lastNext) ? ("Spot Nº " + lastNext + " has your name on it.") : lines[li];
    bubble.classList.add("show");
    mascot.classList.remove("hop"); void mascot.offsetWidth; mascot.classList.add("hop");
    clearTimeout(bTimer); bTimer = setTimeout(function () { bubble.classList.remove("show"); }, 2400);
  });

  var lastNext = null;
  window.SB = { setNext: function (n) { lastNext = n; } };

  // tabel tribun
  window.SB.setStands = function (minted) {
    var bounds = [1250, 2500, 3750, 5000];
    for (var i = 0; i < 4; i++) {
      var lo = i === 0 ? 0 : bounds[i - 1];
      var f = Math.max(0, Math.min(1250, minted - lo));
      var cell = document.getElementById("st-" + i), bar = document.getElementById("sf-" + i);
      if (cell) cell.textContent = fmt(f) + " / 1,250";
      if (bar) bar.style.width = (f / 1250 * 100).toFixed(1) + "%";
    }
  };

  // find me a spot
  var fb = document.getElementById("findspot"), res = document.getElementById("spot-res");
  if (fb && res) fb.addEventListener("click", function () {
    var minted = (window.__SB_MINTED || 0);
    if (minted >= 5000) { res.textContent = "Sold out. Every seat has a name now."; return; }
    fb.disabled = true;
    var t0 = Date.now();
    var iv = setInterval(function () {
      var fake = minted + 1 + Math.floor(Math.random() * (5000 - minted));
      res.textContent = "Scanning the stand… Nº " + fmt(fake);
      if (Date.now() - t0 > 750) {
        clearInterval(iv);
        var pick = minted + 1 + Math.floor(Math.random() * (5000 - minted));
        res.textContent = "Spot Nº " + fmt(pick) + " is open. It could be yours.";
        fb.disabled = false;
      }
    }, 60);
  });

  // confetti saat copy
  var COLORS = ["#35d07f", "#ffc53d", "#ff6b4a", "#4ac3ff"];
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (reduced) return;
      var r = btn.getBoundingClientRect();
      for (var i = 0; i < 14; i++) {
        var bit = document.createElement("span");
        bit.className = "confetti-bit";
        bit.style.background = COLORS[i % 4];
        bit.style.left = (r.left + r.width / 2) + "px";
        bit.style.top = (r.top + window.scrollY) + "px";
        bit.style.position = "absolute";
        document.body.appendChild(bit);
        var dx = (Math.random() - 0.5) * 190, dy = -(30 + Math.random() * 90);
        bit.animate([
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: "translate(" + dx + "px," + (dy + 150) + "px) rotate(" + (Math.random() * 340 - 170) + "deg)", opacity: 0 }
        ], { duration: 750 + Math.random() * 350, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = (function (el) { return function () { el.remove(); }; })(bit);
      }
    });
  });
})();

/* ===== v4 game layer: partikel hero, parallax maskot, mini-game ===== */
(function () {
  // partikel ambience hero (debu lampu stadion)
  var cv = document.getElementById("fx");
  if (cv && !reduced) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, P = [];
    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = cv.width = Math.floor(r.width); H = cv.height = Math.floor(r.height);
    }
    size(); addEventListener("resize", size);
    for (var i = 0; i < 42; i++) P.push({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 0.6, v: Math.random() * 0.22 + 0.05, o: Math.random() * 0.5 + 0.15 });
    (function loop() {
      if (!document.hidden && W) {
        ctx.clearRect(0, 0, W, H);
        P.forEach(function (p) {
          p.y -= p.v / H * 8; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
          ctx.globalAlpha = p.o; ctx.fillStyle = "#FFE9A8";
          ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.s, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(loop);
    })();
    // parallax ringan mengikuti pointer di hero
    var hero = cv.parentElement, mascotEl = document.getElementById("mascot");
    hero.addEventListener("pointermove", function (e) {
      if (!mascotEl) return;
      var r = hero.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      mascotEl.style.transform = "translate(" + (dx * 10).toFixed(1) + "px," + (dy * 6).toFixed(1) + "px)";
    });
  }

  // mini-game: Catch a falling spot
  var startBtn = document.getElementById("game-start"), field = document.getElementById("gamefield"),
      sEl = document.getElementById("g-score"), tEl = document.getElementById("g-time"),
      bEl = document.getElementById("g-best"), resEl = document.getElementById("game-res"),
      idle = document.getElementById("game-idle");
  if (!startBtn || !field) return;
  var best = 0; try { best = parseInt(localStorage.getItem("sb-best") || "0", 10) || 0; } catch (e) {}
  if (bEl) bEl.textContent = best;
  var playing = false, score = 0, spawnIv = null, tickIv = null;
  function spawn() {
    if (!playing) return;
    var d = document.createElement("button");
    var green = Math.random() < 0.22;
    d.type = "button"; d.className = "drop" + (green ? " green" : "");
    d.textContent = green ? "+3" : "+1";
    d.style.left = (4 + Math.random() * 86) + "%";
    d.style.animationDuration = (1.5 + Math.random() * 1.1) + "s";
    d.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      if (!playing || d.classList.contains("pop")) return;
      score += green ? 3 : 1;
      if (sEl) sEl.textContent = score;
      d.classList.add("pop");
      setTimeout(function () { d.remove(); }, 190);
    });
    d.addEventListener("animationend", function () { d.remove(); });
    field.appendChild(d);
  }
  startBtn.addEventListener("click", function () {
    if (playing) return;
    playing = true; score = 0;
    if (sEl) sEl.textContent = "0";
    if (resEl) resEl.textContent = "";
    if (idle) idle.style.display = "none";
    field.querySelectorAll(".drop").forEach(function (d) { d.remove(); });
    startBtn.disabled = true; startBtn.textContent = "Playing…";
    var left = 20;
    if (tEl) tEl.textContent = left;
    spawnIv = setInterval(spawn, 560); spawn();
    tickIv = setInterval(function () {
      left -= 1;
      if (tEl) tEl.textContent = Math.max(0, left);
      if (left <= 0) {
        clearInterval(tickIv); clearInterval(spawnIv);
        playing = false;
        field.querySelectorAll(".drop").forEach(function (d) { d.remove(); });
        if (score > best) {
          best = score; try { localStorage.setItem("sb-best", String(best)); } catch (e) {}
          if (bEl) bEl.textContent = best;
          if (resEl) resEl.textContent = "New best: " + score + ". The stand applauds politely.";
        } else {
          if (resEl) resEl.textContent = "Time. You caught " + score + ". Best stays " + best + ".";
        }
        startBtn.disabled = false; startBtn.textContent = "Play again";
      }
    }, 1000);
  });
})();

/* tombol market: arahkan ke checker wallet di Gate 02 */
(function () {
  var b = document.getElementById("mkt-check-btn");
  if (!b) return;
  b.addEventListener("click", function () {
    var input = document.getElementById("wallet-input");
    var mint = document.getElementById("mint");
    if (mint) mint.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, reduced ? 0 : 550);
  });
})();

/* ===== market: daftar listing + aksi (dipakai beranda dan market.html) ===== */
function standOfSpot(id) {
  if (id <= 1250) return { name: "KOP END", cls: "n" };
  if (id <= 2500) return { name: "FAMILY STAND", cls: "e" };
  if (id <= 3750) return { name: "DRUM END", cls: "s" };
  return { name: "FLAG END", cls: "w" };
}
function weiToBnb(w) {
  const s = w.toString().padStart(19, "0");
  const whole = s.slice(0, -18) || "0";
  let frac = s.slice(-18).replace(/0+$/, "");
  return frac ? whole + "." + frac : whole;
}
function bnbToWei(txt) {
  const m = String(txt).trim().match(/^(\d+)(?:\.(\d{1,18}))?$/);
  if (!m) return null;
  return BigInt(m[1]) * (10n ** 18n) + BigInt((m[2] || "").padEnd(18, "0"));
}
async function fetchListings() {
  const raw = await rpcCall(MARKET_ADDR, MSEL.listedIds);
  const hex = raw.toString(16).padStart(64 * 4, "0");
  const words = [];
  for (let i = 0; i + 64 <= hex.length; i += 64) words.push(BigInt("0x" + hex.slice(i, i + 64)));
  const len = Number(words[1] || 0n);
  const ids = [];
  for (let i = 0; i < len; i++) ids.push(Number(words[2 + i]));
  const out = [];
  for (const id of ids) {
    const lo = await rpcCall(MARKET_ADDR, MSEL.listingOf.slice(0, 10) + encUint(id).slice(2));
    const h = lo.toString(16).padStart(64 * 3, "0");
    out.push({
      id,
      seller: "0x" + h.slice(24, 64),
      price: BigInt("0x" + h.slice(64, 128)),
      feeBps: Number(BigInt("0x" + h.slice(128, 192))),
    });
    const cl = await rpcCall(CONFIG.nft, SEL.claimedById.slice(0, 10) + encUint(id).slice(2));
    out[out.length - 1].claimed = cl === 1n;
  }
  return out;
}
function myShort(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }
async function renderMarketCards(el, opts) {
  if (!el) return;
  try {
    const list = await fetchListings();
    const cnt = document.getElementById("mk-count");
    if (cnt) cnt.textContent = String(list.length);
    const fl = document.getElementById("mk-floor");
    if (fl && list.length) {
      let min = list[0].price;
      for (const l of list) if (l.price < min) min = l.price;
      fl.textContent = weiToBnb(min);
    } else if (fl) fl.textContent = "-";
    const shown = opts && opts.limit ? list.slice(0, opts.limit) : list;
    if (!shown.length) {
      el.innerHTML = '<p class="mkt-empty">No spots listed yet. First seller makes history.</p>';
      return;
    }
    el.innerHTML = "";
    for (const l of shown) {
      const st = standOfSpot(l.id);
      const card = document.createElement("div");
      card.className = "mcard";
      card.innerHTML =
        '<img src="art/' + l.id + '.svg" alt="STANDBOY PASS #' + l.id + '" loading="lazy">' +
        '<div class="mc-no">Nº ' + String(l.id).padStart(4, "0") + "</div>" +
        '<div class="mc-stand ' + st.cls + '">' + st.name + "</div>" +
        '<div class="mc-price">' + weiToBnb(l.price) + " BNB</div>" +
        (window.SB_ACCOUNT && l.seller.toLowerCase() === window.SB_ACCOUNT
          ? '<button class="btn small ghost mc-act" data-delist="' + l.id + '">Delist</button>'
          : '<button class="btn small gold mc-act" data-buy="' + l.id + '" data-price="' + l.price.toString() + '">Buy</button>') +
        '<div class="mc-note">' + (l.claimed ? "BOY already collected" : "250,000 BOY unclaimed") + "</div>";
      el.appendChild(card);
    }
    el.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => sbBuy(BigInt(b.dataset.price), Number(b.dataset.buy), b)));
    el.querySelectorAll("[data-delist]").forEach((b) => b.addEventListener("click", () => sbDelist(Number(b.dataset.delist), b)));
  } catch (e) {
    el.innerHTML = '<p class="mkt-empty">Market could not be read right now. Try again in a moment.</p>';
  }
}
function sbSetStatus(txt, cls) {
  const el = document.getElementById("mkt-status");
  if (!el) return;
  el.textContent = txt;
  el.className = "mkt-status" + (cls ? " " + cls : "");
}
async function sbRequireWallet() {
  if (!window.ethereum) { sbSetStatus("No browser wallet found. Open this page in a wallet browser or install MetaMask.", "err"); return null; }
  const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accs || !accs.length) return null;
  const acct = accs[0].toLowerCase();
  window.SB_ACCOUNT = acct;
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  if (chain !== "0x38") {
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); }
    catch (e) { sbSetStatus("Please switch your wallet to BNB Smart Chain (chain 56).", "err"); return null; }
  }
  const wbtn = document.getElementById("wallet-btn");
  if (wbtn) wbtn.textContent = myShort(acct);
  const waddr = document.getElementById("wallet-addr");
  if (waddr) { waddr.style.display = ""; waddr.textContent = acct; }
  return acct;
}
async function sbSend(to, data, value) {
  const acct = await sbRequireWallet();
  if (!acct) return null;
  const txh = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: acct, to, data, value: "0x" + (value || 0n).toString(16) }] });
  return txh;
}
async function sbReadAs(acct, to, data) {
  const r = await window.ethereum.request({ method: "eth_call", params: [{ from: acct, to, data }, "latest"] });
  return BigInt(r);
}
async function sbBuy(price, id, btn) {
  try {
    if (btn) btn.disabled = true;
    sbSetStatus("Confirm the purchase in your wallet…");
    const txh = await sbSend(MARKET_ADDR, "0x8a3a2b0f" + encUint(id).slice(2), price);
    if (!txh) { sbSetStatus("Purchase cancelled."); if (btn) btn.disabled = false; return; }
    sbSetStatus("Purchase sent: " + txh.slice(0, 14) + "… Reloading the market.", "ok");
    setTimeout(() => location.reload(), 3500);
  } catch (e) {
    sbSetStatus("Purchase failed: " + ((e && e.message) || e).toString().slice(0, 140), "err");
    if (btn) btn.disabled = false;
  }
}
async function sbDelist(id, btn) {
  try {
    if (btn) btn.disabled = true;
    sbSetStatus("Confirm the delist in your wallet…");
    const txh = await sbSend(MARKET_ADDR, "0x2c74b6c4" + encUint(id).slice(2), 0n);
    if (!txh) { sbSetStatus("Delist cancelled."); if (btn) btn.disabled = false; return; }
    sbSetStatus("Delisted: " + txh.slice(0, 14) + "… Reloading the market.", "ok");
    setTimeout(() => location.reload(), 3500);
  } catch (e) {
    sbSetStatus("Delist failed: " + ((e && e.message) || e).toString().slice(0, 140), "err");
    if (btn) btn.disabled = false;
  }
}
async function sbListFlow() {
  const res = document.getElementById("list-res");
  const setR = (t, cls) => { if (res) { res.textContent = t; res.className = "mkt-status" + (cls ? " " + cls : ""); } sbSetStatus(t, cls); };
  try {
    const acct = await sbRequireWallet();
    if (!acct) return;
    const seat = Number(await sbReadAs(acct, CONFIG.nft, SEL.seatOf.slice(0, 10) + encAddr(acct).slice(2)));
    if (!seat) { setR("This wallet holds no STANDBOY spot yet. Mint one first, it is free."); return; }
    const priceTxt = (document.getElementById("list-price").value || "").trim();
    const price = bnbToWei(priceTxt);
    if (!price || price <= 0n) { setR("Enter a price in BNB, for example 0.05.", "err"); return; }
    const approved = await sbReadAs(acct, CONFIG.nft, "0x081812fc" + encAddr(acct).slice(2) + encUint(seat).slice(2));
    const approvedAddr = "0x" + approved.toString(16).padStart(64, "0").slice(24);
    if (approvedAddr.toLowerCase() !== MARKET_ADDR.toLowerCase()) {
      setR("Step 1 of 2: approve the market to hold spot Nº " + seat + " in escrow. Confirm in your wallet…");
      const txh = await sbSend(CONFIG.nft, "0x095ea7b3" + MARKET_ADDR.slice(2).toLowerCase().padStart(64, "0") + encUint(seat).slice(2), 0n);
      if (!txh) { setR("Approval cancelled."); return; }
      setR("Approval sent. Wait a few seconds, then press List my spot again to finish step 2.");
      return;
    }
    setR("Step 2 of 2: listing spot Nº " + seat + " at " + priceTxt + " BNB. Confirm in your wallet…");
    const txh2 = await sbSend(MARKET_ADDR, "0x336843f0" + encUint(seat).slice(2) + ("0x" + price.toString(16).padStart(64, "0")).slice(2), 0n);
    if (!txh2) { setR("Listing cancelled."); return; }
    setR("Listed! Spot Nº " + seat + " is on the market. Reloading…", "ok");
    setTimeout(() => location.reload(), 3500);
  } catch (e) {
    setR("Listing failed: " + ((e && e.message) || e).toString().slice(0, 140), "err");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.getElementById("mkt-cards");
  if (cards) renderMarketCards(cards, { limit: cards.dataset.limit ? Number(cards.dataset.limit) : 0 });
  const wb = document.getElementById("wallet-btn");
  if (wb) wb.addEventListener("click", async () => { const a = await sbRequireWallet(); if (a && cards) renderMarketCards(cards, { limit: cards.dataset.limit ? Number(cards.dataset.limit) : 0 }); });
  const lb = document.getElementById("list-btn");
  if (lb) lb.addEventListener("click", sbListFlow);
});

/* Page behaviour: render content from data.js, carousel, nav, gallery, lightbox */
(function () {
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Initials avatar when no photo is provided */
  function avatar(name, seed = 0) {
    const palette = ["#0f5132", "#8b1c24", "#1f5fa8", "#7a4d0f", "#5b3fa0", "#167a4a"];
    const initials = name.replace(/^(Dr\.|Prof\.)\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const bg = palette[(name.length + seed) % palette.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="38" font-weight="700" fill="#fff">${initials || "?"}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- HERO CAROUSEL ---------- */
  const track = $("#heroTrack"), dots = $("#heroDots");
  S.slides.forEach((sl, i) => {
    const el = document.createElement("div");
    el.className = `slide ${sl.type}`;
    const H = i === 0 ? "h1" : "h2";
    el.innerHTML = `
      <div class="bg" style="background-image:url('${sl.img}')"></div>
      <div class="slide-inner">
        <div class="slide-text">
          <p class="eyebrow">${esc(sl.kicker)}</p>
          <${H}>${esc(sl.title)}</${H}>
          <p>${esc(sl.text)}</p>
          ${i === 0 ? '<a class="btn" href="#simulation">See the simulation</a>' : ""}
        </div>
        <img class="slide-img" src="${sl.img}" alt="${esc(sl.title)}" ${i > 1 ? 'loading="lazy"' : ""} />
      </div>`;
    track.appendChild(el);
    const d = document.createElement("button");
    d.setAttribute("aria-label", `Slide ${i + 1}`);
    d.onclick = () => go(i, true);
    dots.appendChild(d);
  });
  let cur = 0, timer;
  function go(i, user) {
    const n = S.slides.length;
    cur = (i + n) % n;
    track.style.transform = `translateX(-${cur * 100}%)`;
    $$(".slide", track).forEach((s, k) => s.classList.toggle("current", k === cur));
    $$("button", dots).forEach((d, k) => d.classList.toggle("on", k === cur));
    if (user) restart();
  }
  function restart() { clearInterval(timer); timer = setInterval(() => go(cur + 1), 6500); }
  $("#heroPrev").onclick = () => go(cur - 1, true);
  $("#heroNext").onclick = () => go(cur + 1, true);
  let tx = null;
  track.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  track.addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), true);
    tx = null;
  });
  $("#hero").addEventListener("mouseenter", () => clearInterval(timer));
  $("#hero").addEventListener("mouseleave", restart);
  go(0); restart();

  /* ---------- HOME CONTENT ---------- */
  $("#stats").innerHTML = S.stats.map((s) => `<div class="stat reveal"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("");
  $("#projTitle").textContent = S.project.title;
  $("#projSummary").textContent = S.project.summary;
  $("#fundedBy").textContent = S.project.fundedBy;
  $("#duration").textContent = S.project.duration;
  $("#pipeline").innerHTML = S.pipeline.map((p) => `
    <article class="pipe reveal"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy" data-lightbox />
    <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div></article>`).join("");
  $("#gallery").innerHTML = S.gallery.map((g) => `
    <figure class="reveal"><img src="${g.img}" alt="${esc(g.caption)}" loading="lazy" data-lightbox data-caption="${esc(g.caption)}" /><figcaption>${esc(g.caption)}</figcaption></figure>`).join("");

  /* ---------- TEAM ---------- */
  $("#leaders").innerHTML = S.leaders.map((l, i) => `
    <div class="leader reveal"><img src="${l.photo || avatar(l.name, i)}" alt="${esc(l.name)}" loading="lazy" />
    <div><span class="role">${esc(l.role)}</span><h4>${esc(l.name)}</h4><p>${esc(l.dept)}</p></div></div>`).join("");

  const teamKeys = Object.keys(S.teams);
  const tabs = $("#teamTabs"), panel = $("#teamPanel");
  const tabList = ["All", ...teamKeys];
  tabs.innerHTML = tabList.map((k) => `<button data-k="${k}">${k === "Elec" ? "Electrical" : k}</button>`).join("");
  function showTeam(k) {
    $$("button", tabs).forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    const keys = k === "All" ? teamKeys : [k];
    const focus = k === "All" ? "" : `<div class="team-focus"><b>${esc(S.teams[k].label)}:</b> ${esc(S.teams[k].focus)}</div>`;
    let idx = 0;
    const cards = keys.flatMap((key) => S.teams[key].members.map((m) => {
      const i = idx++;
      return `<div class="member" style="animation-delay:${i * 40}ms"><img src="${m.photo || avatar(m.name, i)}" alt="${esc(m.name)}" loading="lazy" />
      <h4>${esc(m.name)}</h4><p>${esc(m.role)}</p><span class="dept">${esc(key === "Elec" ? "EEE" : key)}</span></div>`;
    })).join("");
    panel.innerHTML = focus + `<div class="members">${cards}</div>`;
  }
  tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showTeam(b.dataset.k); });
  showTeam("All");

  /* ---------- RESOURCES ---------- */
  $("#funding").innerHTML = S.funding.map((f) => `<div class="fund reveal"><div class="abbr">${esc(f.abbr)}</div><h4>${esc(f.name)}</h4><p>${esc(f.note)}</p></div>`).join("");
  $("#tech").innerHTML = S.tech.map((t) => `<div class="tech-item reveal"><span class="t">${esc(t.tag)}</span><h4>${esc(t.name)}</h4><p>${esc(t.text)}</p></div>`).join("");
  $("#docs").innerHTML = S.documents.map((d) => {
    const ext = /^https?:/.test(d.url);
    return `<a class="doc reveal" href="${d.url}" ${ext ? 'target="_blank" rel="noopener"' : ""}>${esc(d.title)}<small>${esc(d.type)} ↗</small></a>`;
  }).join("");

  /* ---------- CONTACT ---------- */
  const C = S.contact;
  $("#cAddress").textContent = C.address;
  if (C.email) { $("#cEmail").textContent = C.email; $("#cEmail").href = "mailto:" + C.email; } else $("#cEmailWrap").remove();
  if (C.phone) $("#cPhone").textContent = C.phone; else $("#cPhoneWrap").remove();
  $("#cGithub").textContent = S.project.github.replace(/^https?:\/\//, "");
  $("#cGithub").href = S.project.github;
  $("#cMap").src = "https://maps.google.com/maps?q=" + encodeURIComponent(C.mapQuery) + "&z=15&output=embed";
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (!C.email) { $("#formNote").textContent = "Contact email not configured yet (set contact.email in js/data.js)."; return; }
    const body = `${f.get("message")}\n\n— ${f.get("name")} <${f.get("email")}>`;
    location.href = `mailto:${C.email}?subject=${encodeURIComponent(f.get("subject") || "Website enquiry")}&body=${encodeURIComponent(body)}`;
    $("#formNote").textContent = "Opening your email app…";
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- NAV: scroll-spy, mobile menu ---------- */
  const nav = $("#nav"), links = $$("#navLinks a"), toTop = $("#toTop");
  const sections = links.map((a) => $(a.getAttribute("href")));
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 700);
    const probe = y + window.innerHeight * 0.35;
    let active = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= probe) active = i; });
    if (window.innerHeight + y >= document.body.scrollHeight - 4) active = sections.length - 1;
    links.forEach((a, i) => a.classList.toggle("active", i === active));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $("#navToggle").onclick = () => $("#navLinks").classList.toggle("open");
  links.forEach((a) => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));
  toTop.onclick = () => window.scrollTo({ top: 0 });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Auto-gallery: every image in assets/img/photos/ ----------
     photos.json is generated by the deploy workflow; caption = file name
     ("shahbagh-site-visit.jpg" → "Shahbagh site visit"). */
  fetch("assets/img/photos/photos.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : []))
    .then((files) => {
      const known = new Set(S.gallery.map((g) => g.img));
      const gal = $("#gallery");
      files.forEach((f) => {
        const src = "assets/img/photos/" + f;
        if (known.has(src)) return;
        let cap = f.replace(/\.[^.]+$/, "").replace(/^\d+[-_ ]+/, "").replace(/[-_]+/g, " ").trim();
        cap = cap.charAt(0).toUpperCase() + cap.slice(1);
        const fig = document.createElement("figure");
        fig.className = "reveal";
        fig.innerHTML = `<img src="${encodeURI(src)}" alt="${esc(cap)}" loading="lazy" data-lightbox data-caption="${esc(cap)}" /><figcaption>${esc(cap)}</figcaption>`;
        gal.appendChild(fig);
        io.observe(fig);
      });
    })
    .catch(() => {});

  /* ---------- Auto-videos: every video in assets/videos/ (videos.json from workflow) ---------- */
  const nameToCaption = (f) => {
    const c = f.replace(/\.[^.]+$/, "").replace(/^\d+[-_ ]+/, "").replace(/[-_]+/g, " ").trim();
    return c.charAt(0).toUpperCase() + c.slice(1);
  };
  fetch("assets/videos/videos.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : []))
    .then((files) => {
      if (!files.length) return;
      $("#videos").innerHTML = files.map((f) => {
        const cap = nameToCaption(f);
        return `<figure class="reveal"><video src="${encodeURI("assets/videos/" + f)}" controls preload="metadata" playsinline></video><figcaption>${esc(cap)}</figcaption></figure>`;
      }).join("");
      $("#videosBlock").hidden = false;
      $$("#videos .reveal").forEach((el) => io.observe(el));
    })
    .catch(() => {});

  /* ---------- LIGHTBOX ---------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  let lbList = [], lbI = 0;
  function openLB(img) {
    lbList = $$("img[data-lightbox]");
    lbI = lbList.indexOf(img);
    showLB();
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  }
  function showLB() {
    const im = lbList[(lbI + lbList.length) % lbList.length];
    lbImg.src = im.src; lbCap.textContent = im.dataset.caption || im.alt;
  }
  function closeLB() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); }
  document.addEventListener("click", (e) => { const im = e.target.closest("img[data-lightbox]"); if (im) openLB(im); });
  $("#lbClose").onclick = closeLB;
  $("#lbPrev").onclick = () => { lbI--; showLB(); };
  $("#lbNext").onclick = () => { lbI++; showLB(); };
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLB(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") { lbI--; showLB(); }
    if (e.key === "ArrowRight") { lbI++; showLB(); }
  });
})();

// ===== Dados da empresa: AJUSTAR AQUI e o site inteiro atualiza =====
const CONFIG = {
  whatsapp: "5511900000000",            // só números, com DDI 55 + DDD
  telefone: "(11) 90000-0000",
  email: "contato@sl7flex.com.br",
  instagram: "sl7flex",
  instagramLabel: "@sl7flex",
  horario: "Segunda a sábado, 08h às 20h",
  coletaAte: "14h",
  entregaAte: "21h",
  cnpj: "",                              // ex.: "CNPJ 00.000.000/0001-00"

  // Cidades atendidas: aparecem na lista e no mapa da seção Cobertura
  cidades: [
    { nome: "São Paulo – Capital",   lat: -23.5505, lng: -46.6333, principal: true },
    { nome: "Guarulhos",             lat: -23.4538, lng: -46.5333 },
    { nome: "Osasco",                lat: -23.5329, lng: -46.7920 },
    { nome: "Barueri",               lat: -23.5107, lng: -46.8761 },
    { nome: "Carapicuíba",           lat: -23.5235, lng: -46.8407 },
    { nome: "Santo André",           lat: -23.6639, lng: -46.5383 },
    { nome: "São Bernardo do Campo", lat: -23.6914, lng: -46.5646 },
    { nome: "São Caetano do Sul",    lat: -23.6229, lng: -46.5548 },
    { nome: "Diadema",               lat: -23.6813, lng: -46.6205 },
    { nome: "Mauá",                  lat: -23.6677, lng: -46.4613 },
    { nome: "Taboão da Serra",       lat: -23.6019, lng: -46.7526 },
    { nome: "Cotia",                 lat: -23.6022, lng: -46.9190 },
    { nome: "Embu das Artes",        lat: -23.6489, lng: -46.8522 },
    { nome: "Itapevi",               lat: -23.5488, lng: -46.9327 },
    { nome: "Jandira",               lat: -23.5275, lng: -46.9023 },
    { nome: "Ribeirão Pires",        lat: -23.7067, lng: -46.4058 },
  ],
};

const whatsUrl = (msg = "Olá! Vim pelo site e quero saber mais sobre as entregas da SL7 Flex.") =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

// Preenche textos e links a partir do CONFIG
document.querySelectorAll("[data-cfg]").forEach(el => {
  const v = CONFIG[el.dataset.cfg];
  if (v !== undefined) el.textContent = v;
});
document.querySelectorAll(".js-whats").forEach(a => { a.href = whatsUrl(); a.target = "_blank"; a.rel = "noopener"; });
document.querySelectorAll(".js-mail").forEach(a => { a.href = `mailto:${CONFIG.email}`; });
document.querySelectorAll(".js-insta").forEach(a => { a.href = `https://instagram.com/${CONFIG.instagram}`; a.target = "_blank"; a.rel = "noopener"; });
document.getElementById("year").textContent = new Date().getFullYear();

// Vídeo do hero: versão leve no celular; sem vídeo para quem pede menos movimento
const heroVideo = document.getElementById("heroVideo");
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  heroVideo.src = matchMedia("(max-width: 860px)").matches ? heroVideo.dataset.srcMobile : heroVideo.dataset.src;
  heroVideo.play().catch(() => {});
}

// Cobertura: lista de cidades + mapa
const cityList = document.getElementById("cityList");
const cityButtons = CONFIG.cidades.map(c => {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = c.nome;
  li.append(b);
  cityList.append(li);
  return b;
});

// Mapa: MapLibre + OpenFreeMap (gratuito, uso comercial liberado, sem chave)
// Divisas dos municípios vêm de js/cidades-geo.js (IBGE)
if (window.maplibregl) {
  const geo = window.CIDADES_GEO || { type: "FeatureCollection", features: [] };
  const principais = CONFIG.cidades.filter(c => c.principal).map(c => c.nome.split(" –")[0]);
  geo.features.forEach((f, i) => { f.id = i; f.properties.principal = principais.includes(f.properties.nome); });

  // Enquadramento de um conjunto de polígonos
  const bboxOf = feats => {
    const b = [[180, 90], [-180, -90]];
    const walk = c => typeof c[0] === "number"
      ? (b[0][0] = Math.min(b[0][0], c[0]), b[0][1] = Math.min(b[0][1], c[1]), b[1][0] = Math.max(b[1][0], c[0]), b[1][1] = Math.max(b[1][1], c[1]))
      : c.forEach(walk);
    feats.forEach(f => walk(f.geometry.coordinates));
    return b;
  };

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/dark",
    bounds: geo.features.length ? bboxOf(geo.features) : [[-46.95, -23.73], [-46.38, -23.43]],
    fitBoundsOptions: { padding: 20 },
    scrollZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: { compact: true },
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

  const cor = ["case", ["get", "principal"], "#2f7bff", "#ff2d46"];
  const ativo = ["any", ["boolean", ["feature-state", "hover"], false], ["boolean", ["feature-state", "ativo"], false]];

  map.on("load", () => {
    map.addSource("municipios", { type: "geojson", data: geo });
    map.addLayer({
      id: "municipios-fill", type: "fill", source: "municipios",
      paint: { "fill-color": cor, "fill-opacity": ["case", ativo, .38, .16] },
    });
    map.addLayer({
      id: "municipios-borda-glow", type: "line", source: "municipios",
      paint: { "line-color": cor, "line-width": ["case", ativo, 8, 5], "line-blur": 6, "line-opacity": .5 },
    });
    map.addLayer({
      id: "municipios-borda", type: "line", source: "municipios",
      paint: { "line-color": ["case", ativo, "#ffffff", cor], "line-width": ["case", ativo, 2, 1.3] },
    });

    // Destaque ao passar o mouse e nome da cidade
    const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "map-label", offset: 8 });
    let hoverId = null;
    map.on("mousemove", "municipios-fill", e => {
      const f = e.features[0];
      if (hoverId !== null) map.setFeatureState({ source: "municipios", id: hoverId }, { hover: false });
      hoverId = f.id;
      map.setFeatureState({ source: "municipios", id: hoverId }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      tip.setLngLat(e.lngLat).setText(f.properties.nome).addTo(map);
    });
    map.on("mouseleave", "municipios-fill", () => {
      if (hoverId !== null) map.setFeatureState({ source: "municipios", id: hoverId }, { hover: false });
      hoverId = null;
      map.getCanvas().style.cursor = "";
      tip.remove();
    });
  });

  // Pinos com pulso no centro de cada cidade
  CONFIG.cidades.forEach(c => {
    const el = document.createElement("div");
    el.className = "pin" + (c.principal ? " pin--main" : "");
    el.innerHTML = "<span></span>";
    el.title = c.nome;
    new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
  });

  // Clicar na cidade da lista: destaca a divisa e enquadra o município
  const nomeBase = n => n.split(" –")[0];
  let ativoId = null;
  cityButtons.forEach((b, i) => b.addEventListener("click", () => {
    cityButtons.forEach(x => x.classList.toggle("is-active", x === b));
    const c = CONFIG.cidades[i];
    const f = geo.features.find(f => f.properties.nome === nomeBase(c.nome));
    if (ativoId !== null) map.setFeatureState({ source: "municipios", id: ativoId }, { ativo: false });
    if (f) {
      ativoId = f.id;
      map.setFeatureState({ source: "municipios", id: ativoId }, { ativo: true });
      map.fitBounds(bboxOf([f]), { padding: 40, duration: 900 });
    } else {
      map.flyTo({ center: [c.lng, c.lat], zoom: 12, duration: 900 });
    }
  }));
}

// Header com fundo ao rolar
const header = document.querySelector(".header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Menu mobile
const nav = document.getElementById("nav");
const toggle = document.getElementById("navToggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
}));

// Animação de entrada + contadores
const fmt = n => n.toLocaleString("pt-BR");
const countUp = el => {
  const target = +el.dataset.count;
  const start = performance.now();
  const dur = 1600;
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

document.querySelectorAll(".section__head, .card, .step, .feature, .split__text, .cities, .faq, .form, .stat")
  .forEach(el => el.classList.add("reveal"));

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-visible");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Formulário -> abre WhatsApp com os dados preenchidos
document.getElementById("leadForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = e.target;
  let ok = true;
  form.querySelectorAll("[required]").forEach(i => {
    const bad = !i.value.trim();
    i.classList.toggle("is-invalid", bad);
    if (bad) ok = false;
  });
  const note = document.getElementById("formNote");
  if (!ok) { note.textContent = "Preencha nome, empresa e WhatsApp para continuar."; return; }

  const d = Object.fromEntries(new FormData(form));
  const msg = [
    "Olá! Quero contratar a SL7 Flex.",
    `Responsável: ${d.nome}`,
    `Empresa: ${d.empresa}`,
    `WhatsApp: ${d.whatsapp}`,
    d.email && `E-mail: ${d.email}`,
    `Canal: ${d.canal}`,
    `Pacotes/dia: ${d.volume}`,
    d.endereco && `Coleta em: ${d.endereco}`,
  ].filter(Boolean).join("\n");

  window.open(whatsUrl(msg), "_blank", "noopener");
  note.textContent = "Abrimos o WhatsApp com seus dados. É só enviar a mensagem!";
});

// Logo: volta para o início (hero) e limpa o # da URL
document.querySelectorAll(".js-top").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", location.pathname + location.search);
  nav.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
}));

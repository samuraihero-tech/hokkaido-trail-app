(function () {
  const data = window.TRAIL_MVP_DATA;
  const officialMaps = window.TRAIL_MVP_ROUTE_MAPS || [];
  let map;
  let routeLayer;
  let surfaceLayer;
  let shadeLayer;
  let markerLayers = new Map();
  let activeLayers = new Set(data.layerDefinitions.filter((l) => l.enabled).map((l) => l.key));
  let currentComfort = null;

  const layerMeta = Object.fromEntries(data.layerDefinitions.map((layer) => [layer.key, layer]));

  function initMap() {
    map = L.map("map", {
      zoomControl: false,
      attributionControl: true
    }).setView(data.center, 12);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    routeLayer = L.polyline(data.route, {
      color: "#123828",
      weight: 5,
      opacity: 0.86,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    // Demo overlay polygons. These represent planned layers, not real data.
    surfaceLayer = L.polygon([
      [43.614, 144.445], [43.608, 144.428], [43.590, 144.408], [43.575, 144.395], [43.582, 144.420], [43.603, 144.451]
    ], { color: "#d06b39", fillColor: "#d06b39", fillOpacity: 0.18, weight: 1.5, dashArray: "5 5" });

    shadeLayer = L.polygon([
      [43.603, 144.430], [43.592, 144.398], [43.563, 144.376], [43.538, 144.366], [43.549, 144.392], [43.580, 144.415]
    ], { color: "#4c7e54", fillColor: "#4c7e54", fillOpacity: 0.16, weight: 1.5, dashArray: "5 5" });

    renderMarkers();
    fitRoute();

    // Safety: when opened from local files or after layout fonts load,
    // Leaflet may need a resize recalculation.
    setTimeout(() => map.invalidateSize(), 150);
    window.addEventListener("resize", () => map.invalidateSize());
  }

  function getMarkerIcon(place) {
    const layer = layerMeta[place.layer] || {};
    const iconText = layer.icon || "地";
    const className = `custom-marker marker-${place.layer || "default"}`;
    return L.divIcon({
      className: "custom-marker-wrap",
      html: `<div class="${className}" title="${escapeHtml(place.name)}">${escapeHtml(iconText)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  }

  function renderMarkers() {
    markerLayers.forEach((layer) => map.removeLayer(layer));
    markerLayers.clear();

    data.places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], { icon: getMarkerIcon(place) });
      marker.bindPopup(`
        <div class="place-popup">
          <h3>${escapeHtml(place.name)}</h3>
          <p>${escapeHtml(getLayerLabel(place.layer))}</p>
          <p>${place.verified ? "観光協会確認済み" : "未確認 / サンプル"}</p>
          <button type="button" data-place-id="${place.id}">詳細を見る</button>
        </div>
      `);
      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.querySelector(`[data-place-id="${place.id}"]`);
          if (btn) btn.addEventListener("click", () => openPlaceDetail(place));
        }, 0);
      });
      markerLayers.set(place.id, marker);
      if (activeLayers.has(place.layer)) marker.addTo(map);
    });

    updateOverlayLayers();
  }

  function updateOverlayLayers() {
    if (activeLayers.has("surfaceTemp")) surfaceLayer.addTo(map);
    else map.removeLayer(surfaceLayer);

    if (activeLayers.has("shade")) shadeLayer.addTo(map);
    else map.removeLayer(shadeLayer);

    data.places.forEach((place) => {
      const marker = markerLayers.get(place.id);
      if (!marker) return;
      if (activeLayers.has(place.layer)) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
  }

  function renderLayerControls() {
    const root = document.getElementById("layerControls");
    root.innerHTML = "";
    data.layerDefinitions.forEach((layer) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "layer-chip";
      button.setAttribute("aria-pressed", activeLayers.has(layer.key) ? "true" : "false");
      button.innerHTML = `<span class="layer-dot" style="color: ${layer.color}"></span>${layer.label}`;
      button.addEventListener("click", () => {
        if (activeLayers.has(layer.key)) activeLayers.delete(layer.key);
        else activeLayers.add(layer.key);
        button.setAttribute("aria-pressed", activeLayers.has(layer.key) ? "true" : "false");
        updateOverlayLayers();
      });
      root.appendChild(button);
    });
  }


  function renderOfficialMaps() {
    const root = document.getElementById("officialMapList");
    if (!root) return;
    if (!officialMaps.length) {
      root.innerHTML = `<p class="muted compact">公式KMLはまだ読み込まれていません。</p>`;
      return;
    }
    root.innerHTML = officialMaps.map((item, index) => `
      <article class="official-map-item">
        <div class="official-map-item-head">
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.note || item.status || "公式Google My Mapsを参照します。")}</p>
          </div>
          <span class="map-type-badge">${escapeHtml(item.label || "公式")}</span>
        </div>
        <div class="official-map-item-actions">
          <button class="mini-button" type="button" data-official-map-index="${index}">地図を表示</button>
          <a class="mini-link" href="${escapeHtml(item.viewerUrl)}" target="_blank" rel="noopener">別タブで開く</a>
        </div>
      </article>
    `).join("");
    root.querySelectorAll("[data-official-map-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = officialMaps[Number(button.dataset.officialMapIndex)];
        if (item) openOfficialMap(item);
      });
    });
  }

  function openOfficialMap(item) {
    const template = document.getElementById("officialMapTemplate");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("officialMapTitle").textContent = item.name;
    fragment.getElementById("officialMapDescription").textContent = item.description || item.note || "公式Google My Mapsを参照表示しています。";
    fragment.getElementById("officialMapFrame").src = item.embedUrl;
    fragment.getElementById("officialMapOpen").href = item.viewerUrl;
    fragment.getElementById("officialMapKml").href = item.localKml;
    fragment.getElementById("officialMapStatus").textContent = item.status || "NetworkLink型KMLとして参照しています。";
    openDrawer(fragment);
  }

  function renderChecklist() {
    const root = document.getElementById("checklist");
    root.innerHTML = data.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  async function getWeather() {
    // Try live weather. Fall back to static sample if API/network is unavailable.
    const [lat, lng] = data.center;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=precipitation_probability,uv_index&timezone=Asia%2FTokyo&forecast_days=1`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("weather response error");
      const json = await res.json();
      const current = json.current || {};
      const hourly = json.hourly || {};
      return {
        temperature: Math.round(current.temperature_2m ?? data.sampleWeather.temperature),
        apparentTemperature: Math.round(current.apparent_temperature ?? data.sampleWeather.apparentTemperature),
        humidity: Math.round(current.relative_humidity_2m ?? data.sampleWeather.humidity),
        windSpeed: Math.round((current.wind_speed_10m ?? data.sampleWeather.windSpeed) * 10) / 10,
        precipitationProbability: Math.round(hourly.precipitation_probability?.[0] ?? data.sampleWeather.precipitationProbability),
        uvIndex: Math.round((hourly.uv_index?.[0] ?? data.sampleWeather.uvIndex) * 10) / 10,
        updatedAt: "Open-Meteo取得 / 失敗時はサンプル"
      };
    } catch (e) {
      return data.sampleWeather;
    }
  }

  async function updateComfort() {
    const weather = await getWeather();
    currentComfort = window.ComfortScore.calculateComfortScore({
      weather,
      center: data.center,
      places: data.places
    });
    currentComfort.weather = weather;

    document.getElementById("comfortScore").textContent = currentComfort.score;
    document.getElementById("scoreRingValue").textContent = currentComfort.score;
    document.getElementById("comfortStatus").textContent = currentComfort.status;
    document.getElementById("comfortReason").textContent = currentComfort.reason;
    document.getElementById("heatRisk").textContent = currentComfort.heatRisk;
    document.getElementById("rainRisk").textContent = currentComfort.rainRisk;
    document.getElementById("terrainLoad").textContent = currentComfort.terrainLoad;

    const ring = document.querySelector(".score-ring");
    const deg = Math.round(currentComfort.score * 3.6);
    ring.style.background = `conic-gradient(var(--forest-2) 0deg, var(--forest-2) ${deg}deg, #e5e2d6 ${deg}deg 360deg)`;

    if (currentComfort.nearestWater) {
      document.getElementById("nextPointName").textContent = currentComfort.nearestWater.name;
      document.getElementById("nextPointMeta").textContent = `現在地基準で約${currentComfort.nearestWater.distance.toFixed(1)}km。水分補給・休憩計画に利用できます。`;
    }
  }

  function openScoreDetail() {
    if (!currentComfort) return;
    const template = document.getElementById("scoreDetailTemplate");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("detailScore").textContent = currentComfort.score;
    fragment.getElementById("detailStatus").textContent = currentComfort.status;
    fragment.getElementById("detailReason").textContent = currentComfort.reason;
    fragment.getElementById("factorGrid").innerHTML = currentComfort.factors.map((factor) => `
      <div class="factor-item">
        <div>
          <strong>${escapeHtml(factor.title)}</strong>
          <p>${escapeHtml(factor.text)}</p>
        </div>
        <span class="badge ${factor.className}">${escapeHtml(factor.status)}</span>
      </div>
    `).join("");
    fragment.getElementById("actionList").innerHTML = currentComfort.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
    openDrawer(fragment);
  }

  function openPlaceDetail(place) {
    const verifiedText = place.verified ? "観光協会確認済み" : "未確認 / サンプル表示";
    const distance = window.ComfortScore.distanceKm(data.center, [place.lat, place.lng]).toFixed(1);
    const html = document.createElement("div");
    html.innerHTML = `
      <div class="drawer-section">
        <p class="eyebrow">Place Detail</p>
        <h2>${escapeHtml(place.name)}</h2>
        <p class="muted">${escapeHtml(place.description)}</p>
        <div class="factor-grid">
          <div class="factor-item"><strong>カテゴリ</strong><span class="badge good">${escapeHtml(place.sourceCategory || getLayerLabel(place.layer))}</span></div>
          <div class="factor-item"><strong>現在地基準の距離</strong><span>${distance}km</span></div>
          <div class="factor-item"><strong>確認状況</strong><span class="badge ${place.verified ? "good" : "caution"}">${verifiedText}</span></div>
        </div>
      </div>
      <div class="drawer-section">
        <h3>メモ・注意</h3>
        <p class="muted">${escapeHtml(place.notes)}</p>
        <p><a class="secondary-button" style="display:inline-block;text-decoration:none;width:auto" target="_blank" rel="noopener" href="${place.googleMaps}">Google Mapsで開く</a></p>
      </div>
    `;
    openDrawer(html);
  }

  function openAdmin() {
    const template = document.getElementById("adminTemplate");
    const fragment = template.content.cloneNode(true);
    fragment.getElementById("adminPlaceCount").textContent = data.places.length;
    const unverified = data.places.filter((place) => !place.verified).length;
    const warnings = data.places.filter((place) => ["bear", "danger"].includes(place.layer)).length;
    fragment.getElementById("adminUnverifiedCount").textContent = unverified;
    fragment.getElementById("adminWarningCount").textContent = warnings;
    fragment.getElementById("adminTableBody").innerHTML = data.places.slice(0, 10).map((place) => `
      <tr>
        <td>${escapeHtml(place.name)}</td>
        <td>${escapeHtml(getLayerLabel(place.layer))}</td>
        <td>${place.verified ? "確認済み" : "未確認"}</td>
        <td>2026/05/21</td>
      </tr>
    `).join("");
    openDrawer(fragment);
  }

  function openDrawer(content) {
    const drawer = document.getElementById("detailDrawer");
    const drawerContent = document.getElementById("drawerContent");
    drawerContent.innerHTML = "";
    drawerContent.appendChild(content);
    document.getElementById("drawerBackdrop").hidden = false;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    const drawer = document.getElementById("detailDrawer");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.getElementById("drawerBackdrop").hidden = true;
  }

  function fitRoute() {
    const bounds = L.latLngBounds(data.route);
    map.fitBounds(bounds, { padding: [70, 70] });
  }

  function filterPlaces(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      data.places.forEach((place) => {
        if (activeLayers.has(place.layer)) markerLayers.get(place.id)?.addTo(map);
      });
      return;
    }
    data.places.forEach((place) => {
      const marker = markerLayers.get(place.id);
      const text = `${place.name} ${place.category} ${place.sourceCategory || ""} ${getLayerLabel(place.layer)} ${place.description} ${place.notes || ""}`.toLowerCase();
      if (text.includes(normalized) && activeLayers.has(place.layer)) marker.addTo(map);
      else map.removeLayer(marker);
    });
  }

  function getLayerLabel(key) {
    return layerMeta[key]?.label || key;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }

  function bindEvents() {
    document.getElementById("openScoreButton").addEventListener("click", openScoreDetail);
    document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
    document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);
    document.getElementById("adminButton").addEventListener("click", openAdmin);
    document.getElementById("fitRouteButton").addEventListener("click", fitRoute);
    document.getElementById("resetLayers").addEventListener("click", () => {
      activeLayers = new Set(data.layerDefinitions.filter((l) => l.enabled).map((l) => l.key));
      renderLayerControls();
      updateOverlayLayers();
    });
    document.getElementById("searchInput").addEventListener("input", (event) => filterPlaces(event.target.value));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function init() {
    renderLayerControls();
    renderOfficialMaps();
    renderChecklist();
    bindEvents();
    if (!window.L) {
      document.getElementById("map").innerHTML = `
        <div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:#dfe8dc;color:#123828;text-align:center;">
          <div style="max-width:520px;background:rgba(255,253,248,.9);border-radius:24px;padding:24px;box-shadow:0 18px 55px rgba(18,56,40,.16);">
            <h2 style="margin:0 0 8px;">地図ライブラリを読み込めませんでした</h2>
            <p style="margin:0;color:#647067;line-height:1.6;">Leaflet CDNとOpenStreetMapを利用しています。インターネット接続がある状態で、READMEの手順どおりローカルサーバーから開いてください。</p>
          </div>
        </div>`;
      updateComfort();
      return;
    }
    initMap();
    updateComfort();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

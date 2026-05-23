(function () {
  const data = window.TRAIL_MVP_DATA || {};
  const places = data.places || [];
  const sosReports = data.sosReports || [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function layerLabel(key) {
    const layer = (data.layerDefinitions || []).find((item) => item.key === key);
    return layer ? layer.label : key;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function countByLayer(layer) {
    return places.filter((place) => place.layer === layer || place.category === layer).length;
  }

  function renderMiniPlaces(rootId, filter, limit) {
    const root = document.getElementById(rootId);
    if (!root) return;
    const rows = places.filter(filter).slice(0, limit);
    root.innerHTML = rows.map((place) => `
      <article class="compact-row">
        <div>
          <strong>${escapeHtml(place.name)}</strong>
          <span>${escapeHtml(layerLabel(place.layer))} / ${place.verified ? "確認済み" : "未確認"}</span>
        </div>
        <em>${escapeHtml(place.sourceCategory || place.category)}</em>
      </article>
    `).join("");
  }

  function renderSos(rootId, limit) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = sosReports.slice(0, limit).map((report) => `
      <article class="sos-row ${escapeHtml(report.priority)}">
        <div>
          <strong>${escapeHtml(report.title)}</strong>
          <span>${escapeHtml(report.location)} / ${escapeHtml(report.time)}</span>
        </div>
        <em>${escapeHtml(report.status)}</em>
      </article>
    `).join("");
  }

  function renderAdminCategoryCards() {
    const root = document.getElementById("adminCategoryCards");
    if (!root) return;
    const categories = [
      { key: "vending", label: "自販機", icon: "自", review: "補給導線", last: "2026/05/21", priority: "中", needs: 6 },
      { key: "convenience", label: "コンビニ", icon: "コ", review: "営業時間確認", last: "2026/05/20", priority: "中", needs: 4 },
      { key: "toilet", label: "トイレ", icon: "厠", review: "季節閉鎖確認", last: "2026/05/18", priority: "高", needs: 11 },
      { key: "accommodation", label: "宿泊", icon: "宿", review: "予約導線", last: "2026/05/17", priority: "中", needs: 7 },
      { key: "food", label: "飲食", icon: "食", review: "営業日確認", last: "2026/05/21", priority: "低", needs: 5 },
      { key: "water", label: "水場", icon: "水", review: "飲用可否確認", last: "2026/05/16", priority: "高", needs: 13 },
      { key: "parking", label: "駐車場", icon: "P", review: "送迎候補", last: "2026/05/19", priority: "中", needs: 3 },
      { key: "danger", label: "危険/注意", icon: "!", review: "即時共有", last: "2026/05/22", priority: "高", needs: 9 },
      { key: "rest", label: "休憩所", icon: "休", review: "設置候補", last: "2026/05/15", priority: "高", needs: 8 },
      { key: "sign", label: "案内看板", icon: "案", review: "分岐案内", last: "2026/05/14", priority: "中", needs: 6 }
    ];
    root.innerHTML = categories.map((category) => {
      const count = category.key === "danger"
        ? places.filter((place) => ["danger", "bear"].includes(place.layer)).length
        : category.key === "rest" || category.key === "sign"
          ? category.needs + 4
          : countByLayer(category.key);
      const unverified = category.key === "danger"
        ? places.filter((place) => ["danger", "bear"].includes(place.layer) && !place.verified).length
        : category.key === "rest" || category.key === "sign"
          ? Math.max(2, Math.round(category.needs / 2))
          : places.filter((place) => (place.layer === category.key || place.category === category.key) && !place.verified).length;
      return `
        <article class="admin-category-card">
          <div class="admin-category-icon">${escapeHtml(category.icon)}</div>
          <div>
            <strong>${escapeHtml(category.label)}</strong>
            <span>${escapeHtml(category.review)}</span>
          </div>
          <em>${count}件</em>
          <small>未確認 ${unverified}件 / 要確認 ${category.needs}件 / 最終更新 ${escapeHtml(category.last)} / 優先度 ${escapeHtml(category.priority)}</small>
        </article>
      `;
    }).join("");
  }

  function renderAdminEmergencyLogs() {
    const root = document.getElementById("adminEmergencyLogBody");
    if (!root) return;
    const logs = [
      { time: "10:18", type: "通信途絶", sender: "ユーザー", location: "川湯温泉〜神の子池", route: "MKT", status: "未対応", owner: "未割当", updated: "2分前" },
      { time: "09:52", type: "体調不良", sender: "ガイド", location: "斜里岳山麓", route: "Trail & Train③", status: "対応中", owner: "川湯VC", updated: "8分前" },
      { time: "09:31", type: "ヒグマ", sender: "ユーザー", location: "羅臼方面", route: "UKT", status: "ガイド確認中", owner: "羅臼連絡員", updated: "14分前" },
      { time: "08:48", type: "道迷い", sender: "ユーザー", location: "屈斜路カルデラ", route: "KCT", status: "対応中", owner: "阿寒摩周観光協会", updated: "31分前" },
      { time: "08:12", type: "悪天候", sender: "ガイド", location: "遠矢駅周辺", route: "Trail & Train②", status: "解決済み", owner: "釧路担当", updated: "52分前" }
    ];
    root.innerHTML = logs.map((report, index) => `
      <tr>
        <td>${escapeHtml(report.time)}</td>
        <td>${escapeHtml(report.type)}</td>
        <td>${escapeHtml(report.sender)}</td>
        <td>${escapeHtml(report.location)}</td>
        <td>${escapeHtml(report.route)}</td>
        <td><span class="log-status ${report.status === "未対応" ? "high" : report.status === "解決済み" ? "" : "medium"}">${escapeHtml(report.status)}</span></td>
        <td>${escapeHtml(report.owner)}</td>
        <td>${escapeHtml(report.updated)}</td>
        <td>
          <div class="admin-log-actions">
            <button type="button" data-admin-log-action="対応開始" data-log-index="${index}">対応開始</button>
            <button type="button" data-admin-log-action="ガイドへ連絡" data-log-index="${index}">ガイドへ連絡</button>
            <button type="button" data-admin-log-action="ユーザーへ連絡" data-log-index="${index}">ユーザーへ連絡</button>
            <button type="button" data-admin-log-action="位置を地図で確認" data-log-index="${index}">位置確認</button>
            <button type="button" data-admin-log-action="解決済みにする" data-log-index="${index}">解決済み</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderAdminFacilities() {
    const root = document.getElementById("facilityCandidateGrid");
    if (!root) return;
    const candidates = [
      { area: "川湯温泉〜神の子池", issue: "水場・トイレ空白が長い", action: "簡易トイレ・休憩所", priority: "高", data: "補給空白16.2km / SOS 11件", status: "設置候補" },
      { area: "遠矢駅周辺", issue: "自販機候補はあるが未確認", action: "現地確認", priority: "中", data: "Trail & Train②利用420人/月", status: "現地確認中" },
      { area: "斜里岳山麓", issue: "利用者が多いが休憩所が少ない", action: "ベンチ・案内看板", priority: "高", data: "途中離脱12% / 滞在長め", status: "協議中" },
      { area: "羅臼方面", issue: "ヒグマ注意報告が多い", action: "注意看板", priority: "高", data: "ヒグマ報告5件 / 高リスク通知", status: "未確認" }
    ];
    root.innerHTML = candidates.map((item) => `
      <article class="facility-candidate-card">
        <div>
          <p class="card-label">${escapeHtml(item.status)}</p>
          <h3>${escapeHtml(item.area)}</h3>
        </div>
        <dl>
          <div><dt>課題</dt><dd>${escapeHtml(item.issue)}</dd></div>
          <div><dt>推奨整備</dt><dd>${escapeHtml(item.action)}</dd></div>
          <div><dt>根拠データ</dt><dd>${escapeHtml(item.data)}</dd></div>
        </dl>
        <span class="priority-badge ${item.priority === "高" ? "high" : "medium"}">優先度 ${escapeHtml(item.priority)}</span>
      </article>
    `).join("");
  }

  function renderAdminAnalytics() {
    const routeRoot = document.getElementById("adminRouteAnalyticsBody");
    const insightRoot = document.getElementById("adminInsightGrid");
    const routes = [
      { name: "MKT", users: "312人", duration: "2泊3日", sos: "6件", exit: "4%", stay: "川湯温泉・摩周湖", need: "トイレ・水場" },
      { name: "KCT", users: "184人", duration: "7.8時間", sos: "4件", exit: "7%", stay: "屈斜路湖畔", need: "休憩所" },
      { name: "UKT", users: "98人", duration: "8.2時間", sos: "5件", exit: "12%", stay: "神の子池・裏摩周", need: "ヒグマ注意看板" },
      { name: "Trail & Train②", users: "420人", duration: "5.1時間", sos: "2件", exit: "3%", stay: "遠矢駅・硫黄山", need: "自販機" }
    ];
    if (routeRoot) {
      routeRoot.innerHTML = routes.map((route) => `
        <tr>
          <td><strong>${escapeHtml(route.name)}</strong></td>
          <td>${escapeHtml(route.users)}</td>
          <td>${escapeHtml(route.duration)}</td>
          <td>${escapeHtml(route.sos)}</td>
          <td>${escapeHtml(route.exit)}</td>
          <td>${escapeHtml(route.stay)}</td>
          <td>${escapeHtml(route.need)}</td>
        </tr>
      `).join("");
    }
    const insights = [
      { area: "広域", issue: "トイレ空白が8km以上の区間が3箇所あります", action: "仮設・協力施設の候補調査", priority: "高", data: "補給空白区間6 / 離脱率5.8%" },
      { area: "補給未経由ユーザー", issue: "自販機・コンビニを経由しない利用者のSOS率が高い", action: "推奨補給導線の表示強化", priority: "高", data: "SOS率 +1.9pt" },
      { area: "川湯温泉〜神の子池", issue: "休憩所ニーズが高い", action: "休憩所候補の現地確認", priority: "高", data: "問い合わせ11件 / 滞在長め" },
      { area: "Trail & Train②", issue: "利用者が多く飲食・土産導線の整備余地あり", action: "駅周辺事業者との連携", priority: "中", data: "420人/月 / 離脱率3%" },
      { area: "羅臼方面", issue: "ヒグマ注意報告が多い", action: "注意看板の設置優先度を上げる", priority: "高", data: "高リスク通知5件" }
    ];
    if (insightRoot) {
      insightRoot.innerHTML = insights.map((item) => `
        <article class="admin-insight-card">
          <span>${escapeHtml(item.area)}</span>
          <strong>${escapeHtml(item.issue)}</strong>
          <p>${escapeHtml(item.action)}</p>
          <em>優先度 ${escapeHtml(item.priority)} / ${escapeHtml(item.data)}</em>
        </article>
      `).join("");
    }
  }

  function initAdminInteractions() {
    const tabs = document.querySelectorAll("[data-admin-tab]");
    const panels = document.querySelectorAll("[data-admin-panel]");
    const emergencyStatus = document.getElementById("adminEmergencyStatus");
    const placeStatus = document.getElementById("adminPlaceStatus");
    const exportStatus = document.getElementById("adminExportStatus");
    const placeForm = document.getElementById("adminPlaceForm");
    const newPlaceButton = document.getElementById("newPlaceButton");
    const publishButton = document.getElementById("adminPublishButton");
    const areas = {
      kawayu: {
        name: "川湯温泉街付近",
        users: "420人/月",
        duration: "5.1時間",
        sos: "2件",
        unverified: "14件",
        facilities: "3件",
        issue: "水場・宿泊・交通の確認優先度が高い",
        action: "休憩所候補の現地確認、自販機候補の確認、ヒグマ注意情報の更新"
      },
      toya: {
        name: "遠矢駅周辺",
        users: "286人/月",
        duration: "4.6時間",
        sos: "1件",
        unverified: "9件",
        facilities: "4件",
        issue: "自販機候補はあるが営業状況と導線が未確認",
        action: "駅周辺事業者への確認、Trail & Train導線の案内看板候補化"
      },
      rausu: {
        name: "羅臼方面",
        users: "146人/月",
        duration: "8.4時間",
        sos: "5件",
        unverified: "18件",
        facilities: "5件",
        issue: "ヒグマ注意報告と悪天候時の離脱判断が多い",
        action: "注意看板の設置検討、ガイド向け警戒通知の強化"
      },
      train2: {
        name: "Trail & Train② 火山＆森コース",
        users: "420人/月",
        duration: "5.1時間",
        sos: "2件",
        unverified: "7件",
        facilities: "2件",
        issue: "利用者が多く、飲食・土産導線の整備余地がある",
        action: "飲食店・土産店との連携、自販機候補の現地確認"
      }
    };

    function switchTab(tabName) {
      tabs.forEach((button) => button.setAttribute("aria-pressed", button.dataset.adminTab === tabName ? "true" : "false"));
      panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === tabName));
    }

    function updateArea(area) {
      setText("adminAreaName", area.name);
      setText("adminAreaUsers", area.users);
      setText("adminAreaDuration", area.duration);
      setText("adminAreaSos", area.sos);
      setText("adminAreaUnverified", area.unverified);
      setText("adminAreaFacilities", area.facilities);
      setText("adminAreaIssue", area.issue);
      setText("adminAreaAction", area.action);
    }

    function downloadCsv(kind) {
      const rows = {
        usage: [["date", "users", "delayed"], ["2026-05-24", "86", "18%"]],
        routes: [["route", "users", "avg_time", "sos"], ["MKT", "312", "2泊3日", "6"]],
        emergency: [["time", "type", "location", "status"], ["10:18", "通信途絶", "川湯温泉〜神の子池", "未対応"]],
        places: [["name", "category", "verified"], ["川湯温泉水場", "水場", "確認済み"]],
        facilities: [["area", "recommendation", "priority"], ["川湯温泉〜神の子池", "簡易トイレ・休憩所", "高"]]
      };
      const csv = (rows[kind] || rows.usage).map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trail-${kind}-demo.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (exportStatus) exportStatus.textContent = `${kind} CSVを出力しました。`;
    }

    tabs.forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.adminTab));
    });

    document.querySelectorAll("[data-admin-area]").forEach((button) => {
      button.addEventListener("click", () => {
        const area = areas[button.dataset.adminArea];
        if (area) updateArea(area);
      });
    });

    document.querySelectorAll("[data-admin-log-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (emergencyStatus) emergencyStatus.textContent = `ログ${Number(button.dataset.logIndex) + 1}: 「${button.dataset.adminLogAction}」で対応状態を更新しました。実通信は行っていません。`;
        if (button.dataset.adminLogAction === "位置を地図で確認") updateArea(areas.kawayu);
      });
    });

    if (newPlaceButton && placeForm) {
      newPlaceButton.addEventListener("click", () => {
        placeForm.hidden = !placeForm.hidden;
        if (!placeForm.hidden) placeForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (placeForm) {
      placeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (placeStatus) placeStatus.textContent = "地点候補として登録しました。現地確認タスクに追加するデモ状態です。";
      });
    }

    document.querySelectorAll("[data-admin-export]").forEach((button) => {
      button.addEventListener("click", () => downloadCsv(button.dataset.adminExport));
    });

    if (publishButton) {
      publishButton.addEventListener("click", () => {
        publishButton.textContent = "公開更新を予約しました";
      });
    }
  }

  function initAdmin() {
    const verified = places.filter((place) => place.verified).length;
    const unverified = places.filter((place) => !place.verified).length;
    const needsReview = places.filter((place) => ["water", "toilet", "danger", "bear"].includes(place.layer)).length;
    const warnings = places.filter((place) => ["bear", "danger"].includes(place.layer)).length;
    const openLogs = sosReports.filter((report) => report.status !== "完了").length;
    setText("adminVerifiedCount", verified);
    setText("adminUnverifiedCount", unverified);
    setText("adminNeedsReviewCount", needsReview);
    setText("adminPlaceCount", places.length);
    setText("adminWarningCount", warnings);
    setText("adminOpenLogCount", openLogs);
    renderAdminCategoryCards();
    renderAdminEmergencyLogs();
    renderAdminFacilities();
    renderAdminAnalytics();
    initAdminInteractions();
  }

  function initGuide() {
    const active = sosReports.filter((report) => report.status !== "完了").length;
    setText("guideActiveSos", active);
    setText("guideGuestCount", "18");
    setText("guideRouteScore", "82");
    renderMiniPlaces("guideSupplyRows", (place) => ["water", "vending", "convenience", "toilet"].includes(place.layer), 5);
    renderSos("guideSosRows", 3);
    initGuideMobile();
  }

  function initGuideMobile() {
    const supply = places.find((place) => ["water", "vending", "convenience", "toilet"].includes(place.layer));
    if (supply) {
      setText("guideNextSupplyName", supply.name);
      setText("guideNextSupplyMeta", `${layerLabel(supply.layer)} / 次の集合地点まで約1.8km / 現地確認: ${supply.verified ? "済" : "未確認"}`);
    }

    const participants = [
      {
        id: "sato",
        name: "佐藤 花",
        relation: "同行中",
        status: "通常",
        statusKey: "normal",
        updated: "1分前",
        signal: "良好",
        confirmed: true,
        meetup: "1.8km",
        memo: "先頭付近で安定。次の分岐で集合予定。",
        map: { left: 42, top: 58 }
      },
      {
        id: "tanaka",
        name: "田中 誠",
        relation: "650m先行",
        status: "通常",
        statusKey: "normal",
        updated: "3分前",
        signal: "良好",
        confirmed: true,
        meetup: "1.2km",
        memo: "ペースが速め。集合地点で待機指示候補。",
        map: { left: 60, top: 46 }
      },
      {
        id: "suzuki",
        name: "鈴木 美咲",
        relation: "180m後方",
        status: "足首注意",
        statusKey: "caution",
        updated: "4分前",
        signal: "良好",
        confirmed: false,
        meetup: "2.0km",
        memo: "足首注意、ペース低下。休憩と水分確認が必要。",
        map: { left: 33, top: 66 }
      },
      {
        id: "takahashi",
        name: "高橋 蓮",
        relation: "ルート外れ120m",
        status: "ルート外れ",
        statusKey: "urgent",
        updated: "2分前",
        signal: "やや不安定",
        confirmed: false,
        meetup: "2.4km",
        memo: "予定ルートから外れています。現在地確認と待機指示を推奨。",
        map: { left: 70, top: 31 }
      },
      {
        id: "ito",
        name: "伊藤 葵",
        relation: "420m後方",
        status: "水分確認",
        statusKey: "caution",
        updated: "6分前",
        signal: "やや不安定",
        confirmed: true,
        meetup: "2.3km",
        memo: "暑さで水分消費が早い可能性。補給確認を推奨。",
        map: { left: 25, top: 73 }
      },
      {
        id: "watanabe",
        name: "渡辺 悠",
        relation: "760m後方",
        status: "位置未更新",
        statusKey: "stale",
        updated: "18分前",
        signal: "未更新",
        confirmed: false,
        meetup: "2.8km",
        memo: "位置情報が15分以上更新されていません。現在地再送を依頼してください。",
        map: { left: 18, top: 42 }
      }
    ];

    let selectedParticipant = participants.find((participant) => !participant.confirmed) || participants[0];
    const liveList = document.getElementById("participantLiveList");
    const mapDots = document.getElementById("guideMapDots");
    const unconfirmedNames = document.getElementById("guideUnconfirmedNames");
    const alertList = document.getElementById("guideAlertList");
    const alertCount = document.getElementById("guideAlertCount");
    const reportStatus = document.getElementById("guideReportStatus");
    const reportPreview = document.getElementById("guideReportPreview");
    const contactStatus = document.getElementById("guideContactStatus");
    const emergencyCheck = document.getElementById("guideEmergencyCheck");
    const reportButtons = document.querySelectorAll("[data-guide-report]");
    const contactButtons = document.querySelectorAll("[data-guide-contact]");

    function renderGuideSummary() {
      const confirmed = participants.filter((participant) => participant.confirmed).length;
      const unconfirmed = participants.filter((participant) => !participant.confirmed).map((participant) => participant.name);
      setText("guideConfirmedCount", `${confirmed}/6確認`);
      setText("guideCheckSummary", `${confirmed}/6`);
      if (unconfirmedNames) {
        unconfirmedNames.textContent = unconfirmed.length
          ? `未確認者：${unconfirmed.join("、")}`
          : "全員確認済みです。";
      }
    }

    function renderAlerts() {
      const alerts = [
        { level: "urgent", text: "渡辺 悠：位置情報が18分更新されていません" },
        { level: "urgent", text: "高橋 蓮：予定ルートから120m外れています" },
        { level: "caution", text: "鈴木 美咲：足首注意、ペース低下" },
        { level: "caution", text: "伊藤 葵：ガイドから420m後方、水分確認" }
      ];
      if (alertCount) alertCount.textContent = `${alerts.length}件`;
      if (alertList) {
        alertList.innerHTML = alerts.map((alert) => `
          <article class="${escapeHtml(alert.level)}">${escapeHtml(alert.text)}</article>
        `).join("");
      }
    }

    function renderMapDots() {
      if (!mapDots) return;
      mapDots.innerHTML = participants.map((participant) => `
        <button
          class="guide-map-dot ${escapeHtml(participant.statusKey)}"
          type="button"
          data-participant-id="${escapeHtml(participant.id)}"
          style="left:${participant.map.left}%;top:${participant.map.top}%"
          aria-label="${escapeHtml(participant.name)} ${escapeHtml(participant.status)}"
        >${escapeHtml(participant.name.slice(0, 1))}</button>
      `).join("");
    }

    function renderParticipants() {
      if (!liveList) return;
      liveList.innerHTML = participants.map((participant) => {
        const active = selectedParticipant?.id === participant.id ? " active" : "";
        return `
          <article class="participant-live-card ${escapeHtml(participant.statusKey)}${active}" data-participant-card="${escapeHtml(participant.id)}">
            <button class="participant-live-main" type="button" data-participant-id="${escapeHtml(participant.id)}">
              <span class="participant-status-dot ${escapeHtml(participant.statusKey)}"></span>
              <div>
                <strong>${escapeHtml(participant.name)}</strong>
                <span>${escapeHtml(participant.relation)} / ${escapeHtml(participant.status)}</span>
              </div>
              <em>${escapeHtml(participant.updated)}</em>
            </button>
            <div class="participant-live-meta">
              <span>通信：${escapeHtml(participant.signal)}</span>
              <span>集合地点まで：${escapeHtml(participant.meetup)}</span>
            </div>
            ${active ? renderParticipantDetail(participant) : ""}
          </article>
        `;
      }).join("");
    }

    function renderParticipantDetail(participant) {
      const messages = ["ペースを落としてください", "次の分岐で待機してください", "水分を取ってください", "現在地を再送してください", "ガイドが向かいます"];
      return `
        <div class="participant-detail">
          <dl>
            <div><dt>現在の状態</dt><dd>${escapeHtml(participant.status)}</dd></div>
            <div><dt>最終位置更新</dt><dd>${escapeHtml(participant.updated)}</dd></div>
            <div><dt>ガイドから</dt><dd>${escapeHtml(participant.relation)}</dd></div>
            <div><dt>集合地点まで</dt><dd>${escapeHtml(participant.meetup)}</dd></div>
          </dl>
          <p>${escapeHtml(participant.memo)}</p>
          <div class="preset-message-grid">
            ${messages.map((message) => `<button type="button" data-guide-message="${escapeHtml(message)}" data-participant-name="${escapeHtml(participant.name)}">${escapeHtml(message)}</button>`).join("")}
          </div>
        </div>
      `;
    }

    function selectParticipant(id) {
      const participant = participants.find((item) => item.id === id);
      if (!participant) return;
      selectedParticipant = participant;
      renderParticipants();
    }

    renderGuideSummary();
    renderAlerts();
    renderMapDots();
    renderParticipants();

    if (liveList) {
      liveList.addEventListener("click", (event) => {
        const participantButton = event.target.closest("[data-participant-id]");
        if (participantButton) selectParticipant(participantButton.dataset.participantId);
        const messageButton = event.target.closest("[data-guide-message]");
        if (messageButton && contactStatus) {
          contactStatus.textContent = `${messageButton.dataset.participantName}さんへ「${messageButton.dataset.guideMessage}」を送信するデモ状態にしました。`;
        }
      });
    }

    if (mapDots) {
      mapDots.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-participant-id]");
        if (dot) {
          selectParticipant(dot.dataset.participantId);
          document.getElementById("participants")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    reportButtons.forEach((button) => {
      button.addEventListener("click", () => {
        reportButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const type = button.dataset.guideReport;
        if (reportPreview) {
          reportPreview.innerHTML = `
            <strong>報告内容</strong>
            <span>報告種別：${escapeHtml(type)}</span>
            <span>発生場所：現在地</span>
            <span>共有範囲：管理者のみ / 参加者全員 / 近隣ユーザー</span>
            <span>メモ：未入力</span>
          `;
        }
        if (reportStatus) reportStatus.textContent = `「${type}」を管理者へ報告し、参加者へ注意喚起するデモ状態にしました。`;
      });
    });

    contactButtons.forEach((button) => {
      button.addEventListener("click", () => {
        contactButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const action = button.dataset.guideContact;
        const targetName = selectedParticipant?.name || "選択中の参加者";
        const unconfirmed = participants.filter((participant) => !participant.confirmed).map((participant) => participant.name);
        if (contactStatus) {
          if (action === "選択した参加者へ個別連絡") {
            contactStatus.textContent = `${targetName}さんとのアプリ内チャットを開くデモ状態にしました。`;
          } else if (action.includes("未確認者")) {
            contactStatus.textContent = `未確認者（${unconfirmed.join("、")}）へ現在地確認を送るデモ状態にしました。`;
          } else {
            contactStatus.textContent = `「${action}」をアプリ内通話/チャット風に開始するデモ状態にしました。`;
          }
        }
      });
    });

    if (emergencyCheck) {
      emergencyCheck.addEventListener("click", () => {
        const unchecked = participants.filter((participant) => !participant.confirmed);
        emergencyCheck.classList.add("active");
        if (contactStatus) contactStatus.textContent = unchecked.length
          ? `全員確認を開始しました。未確認 ${unchecked.length}名（${unchecked.map((participant) => participant.name).join("、")}）に確認が必要です。`
          : "全員確認済みです。管理者へ安全確認を共有するデモ状態にしました。";
      });
    }
  }

  function initPartner() {
    const courses = [
      { id: "wetland", name: "釧路湿原ショート", distance: "12.4km", supplyGap: 4.8, incidents: 3, risks: "ぬかるみ / 道迷い", score: 46, multiplier: 1.08 },
      { id: "kawayu", name: "川湯温泉 - 神の子池", distance: "21.8km", supplyGap: 16.2, incidents: 11, risks: "補給空白 / ヒグマ", score: 78, multiplier: 1.42 },
      { id: "shiretoko", name: "知床斜里 - 羅臼", distance: "28.6km", supplyGap: 18.5, incidents: 14, risks: "高低差 / 悪天候", score: 86, multiplier: 1.68 },
      { id: "akan", name: "阿寒・摩周連絡", distance: "24.1km", supplyGap: 13.4, incidents: 8, risks: "山間部 / 通信不安", score: 69, multiplier: 1.31 }
    ];
    renderCourseRiskTable(courses);
    initPremiumSimulator(courses);
    const avgScore = Math.round(courses.reduce((sum, course) => sum + course.score, 0) / courses.length);
    const avgMultiplier = courses.reduce((sum, course) => sum + course.multiplier, 0) / courses.length;
    setText("insuranceAverageScore", avgScore);
    setText("insuranceAverageMultiplier", `${avgMultiplier.toFixed(2)}x`);
    const reportButton = document.getElementById("monthlyRiskReportButton");
    if (reportButton) {
      reportButton.addEventListener("click", () => {
        reportButton.textContent = "月次リスクレポートを生成しました";
      });
    }
  }

  function renderCourseRiskTable(courses) {
    const root = document.getElementById("courseRiskTableBody");
    if (!root) return;
    root.innerHTML = courses.map((course) => `
      <tr>
        <td><strong>${escapeHtml(course.name)}</strong></td>
        <td>${escapeHtml(course.distance)}</td>
        <td>${course.supplyGap.toFixed(1)}km</td>
        <td>${course.incidents}件</td>
        <td>${escapeHtml(course.risks)}</td>
        <td><span class="risk-score ${course.score >= 80 ? "high" : course.score >= 65 ? "medium" : "low"}">${course.score}</span></td>
        <td><strong>${course.multiplier.toFixed(2)}x</strong></td>
      </tr>
    `).join("");
  }

  function initPremiumSimulator(courses) {
    const courseInput = document.getElementById("simCourse");
    const tempInput = document.getElementById("simTemp");
    const rainInput = document.getElementById("simRain");
    const nightInput = document.getElementById("simNight");
    const guideInput = document.getElementById("simGuide");
    const supplyInput = document.getElementById("simSupply");
    const bearInput = document.getElementById("simBear");
    if (!courseInput || !tempInput || !rainInput || !nightInput || !guideInput || !supplyInput || !bearInput) return;

    function calculate() {
      const course = courses.find((item) => item.id === courseInput.value) || courses[0];
      const temp = Number(tempInput.value || 0);
      const rain = Number(rainInput.value || 0);
      let score = course.score;
      if (temp >= 30) score += 10;
      else if (temp >= 28) score += 6;
      if (rain >= 30) score += 10;
      else if (rain >= 10) score += 5;
      if (nightInput.checked) score += 12;
      if (!guideInput.checked) score += 8;
      if (supplyInput.checked) score -= 9;
      else score += 7;
      if (bearInput.checked) score += 7;
      score = Math.max(20, Math.min(100, Math.round(score)));
      const grade = score >= 85 ? "高リスク" : score >= 70 ? "注意" : score >= 55 ? "標準+" : "標準";
      const multiplier = Math.max(1, 0.72 + score / 100 + (nightInput.checked ? 0.08 : 0) - (guideInput.checked ? 0.08 : 0));
      const condition = score >= 85 ? "条件付き引受 / ガイド同行・位置共有を推奨" : score >= 70 ? "割増引受 / 出発前チェック必須" : "標準引受 / 推奨ルート利用で割引候補";
      const memo = [
        course.supplyGap >= 15 ? "補給空白が15km以上です。" : "補給空白は許容範囲です。",
        temp >= 30 ? "最高気温30℃以上のため熱中症リスクを加算。" : "気温条件は中程度です。",
        supplyInput.checked ? "自販機・コンビニ経由により事故率低下を反映。" : "補給地点未経由のため行動リスクを加算。"
      ].join(" ");
      setText("simRiskScore", score);
      setText("simRiskGrade", grade);
      setText("simMultiplier", `${multiplier.toFixed(2)}x`);
      setText("simCondition", condition);
      setText("simMemo", memo);
    }

    [courseInput, tempInput, rainInput, nightInput, guideInput, supplyInput, bearInput].forEach((input) => {
      input.addEventListener("input", calculate);
      input.addEventListener("change", calculate);
    });
    calculate();
  }

  function init() {
    const page = document.body.dataset.page;
    if (page === "admin") initAdmin();
    if (page === "guide") initGuide();
    if (page === "partner") initPartner();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

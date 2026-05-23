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
      { key: "vending", label: "自販機", icon: "自", review: "補給導線" },
      { key: "convenience", label: "コンビニ", icon: "コ", review: "営業時間確認" },
      { key: "toilet", label: "トイレ", icon: "厠", review: "季節閉鎖確認" },
      { key: "accommodation", label: "宿泊", icon: "宿", review: "予約導線" },
      { key: "food", label: "飲食", icon: "食", review: "営業日確認" },
      { key: "water", label: "水場", icon: "水", review: "飲用可否確認" },
      { key: "parking", label: "駐車場", icon: "P", review: "送迎候補" },
      { key: "danger", label: "危険/注意", icon: "!", review: "即時共有" }
    ];
    root.innerHTML = categories.map((category) => {
      const count = category.key === "danger"
        ? places.filter((place) => ["danger", "bear"].includes(place.layer)).length
        : countByLayer(category.key);
      const unverified = category.key === "danger"
        ? places.filter((place) => ["danger", "bear"].includes(place.layer) && !place.verified).length
        : places.filter((place) => (place.layer === category.key || place.category === category.key) && !place.verified).length;
      return `
        <article class="admin-category-card">
          <div class="admin-category-icon">${escapeHtml(category.icon)}</div>
          <div>
            <strong>${escapeHtml(category.label)}</strong>
            <span>${escapeHtml(category.review)}</span>
          </div>
          <em>${count}件</em>
          <small>未確認 ${unverified}件</small>
        </article>
      `;
    }).join("");
  }

  function renderAdminEmergencyLogs() {
    const root = document.getElementById("adminEmergencyLogBody");
    if (!root) return;
    const assignees = ["阿寒摩周観光協会", "川湯VC", "現地ガイドA", "羅臼連絡員"];
    const typeLabels = {
      medical: "体調・救護",
      navigation: "道迷い",
      network: "通信",
      support: "相談"
    };
    root.innerHTML = sosReports.map((report, index) => `
      <tr>
        <td>${escapeHtml(report.time)}</td>
        <td>${escapeHtml(typeLabels[report.type] || report.type || "連絡")}</td>
        <td>${escapeHtml(report.location)}</td>
        <td><span class="log-status ${escapeHtml(report.priority)}">${escapeHtml(report.status)}</span></td>
        <td>${escapeHtml(assignees[index % assignees.length])}</td>
      </tr>
    `).join("");
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

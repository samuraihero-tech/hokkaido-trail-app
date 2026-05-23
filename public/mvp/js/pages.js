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
      setText("guideNextSupplyMeta", `${layerLabel(supply.layer)} / 現地確認: ${supply.verified ? "済" : "未確認"}`);
    }

    const checklist = document.getElementById("participantChecklist");
    const checkedCount = document.getElementById("guideCheckedCount");
    const reportStatus = document.getElementById("guideReportStatus");
    const contactStatus = document.getElementById("guideContactStatus");
    const emergencyCheck = document.getElementById("guideEmergencyCheck");
    const reportButtons = document.querySelectorAll("[data-guide-report]");
    const contactButtons = document.querySelectorAll("[data-guide-contact]");

    function updateCheckedCount() {
      if (!checklist || !checkedCount) return;
      const boxes = [...checklist.querySelectorAll("input[type='checkbox']")];
      const checked = boxes.filter((box) => box.checked).length;
      checkedCount.textContent = `${checked}/${boxes.length}`;
    }

    if (checklist) {
      checklist.addEventListener("change", updateCheckedCount);
      updateCheckedCount();
    }

    reportButtons.forEach((button) => {
      button.addEventListener("click", () => {
        reportButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        if (reportStatus) reportStatus.textContent = `「${button.dataset.guideReport}」を管理者へ報告するデモ状態にしました。`;
      });
    });

    contactButtons.forEach((button) => {
      button.addEventListener("click", () => {
        contactButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        if (contactStatus) contactStatus.textContent = `「${button.dataset.guideContact}」を選択しました。実通信は行っていません。`;
      });
    });

    if (emergencyCheck) {
      emergencyCheck.addEventListener("click", () => {
        const unchecked = checklist ? [...checklist.querySelectorAll("input:not(:checked)")].length : 0;
        emergencyCheck.classList.add("active");
        if (contactStatus) contactStatus.textContent = unchecked
          ? `全員確認を開始しました。未確認 ${unchecked}名に個別確認が必要です。`
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

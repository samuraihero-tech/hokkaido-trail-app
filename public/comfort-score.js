(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function riskLabel(points, thresholds) {
    if (points <= thresholds.low) return "低";
    if (points <= thresholds.mid) return "中";
    return "高";
  }

  function distanceKm(a, b) {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function getPenaltyBreakdown({ weather, nearestWaterKm, hasBearWarning }) {
    const temp = weather.temperature;
    const wind = weather.windSpeed;
    const rain = weather.precipitationProbability;
    const uv = weather.uvIndex;
    const humidity = weather.humidity;

    const heatPenalty = temp > 28 ? 18 : temp > 24 ? 10 : temp < 5 ? 14 : temp < 10 ? 7 : 0;
    const humidityPenalty = humidity > 80 ? 5 : humidity > 70 ? 2 : 0;
    const windPenalty = wind > 10 ? 12 : wind > 6 ? 6 : 0;
    const rainPenalty = rain > 70 ? 20 : rain > 40 ? 12 : rain > 20 ? 5 : 0;
    const uvPenalty = uv >= 8 ? 8 : uv >= 6 ? 5 : uv >= 4 ? 2 : 0;
    const waterPenalty = nearestWaterKm > 10 ? 15 : nearestWaterKm > 5 ? 8 : nearestWaterKm > 2 ? 3 : 0;
    const terrainPenalty = 8; // Demo route: medium terrain load
    const bearPenalty = hasBearWarning ? 7 : 0;
    const surfacePenalty = temp > 24 ? 4 : 2; // seasonal satellite heat tendency sample

    return {
      heatPenalty: heatPenalty + humidityPenalty + uvPenalty + surfacePenalty,
      rainPenalty,
      terrainPenalty,
      windPenalty,
      waterPenalty,
      bearPenalty,
      total: heatPenalty + humidityPenalty + uvPenalty + surfacePenalty + rainPenalty + terrainPenalty + windPenalty + waterPenalty + bearPenalty
    };
  }

  function calculateComfortScore({ weather, center, places }) {
    const waterPlaces = places.filter((p) => ["water", "vending", "convenience"].includes(p.category));
    const waterDistances = waterPlaces.map((p) => ({ ...p, distance: distanceKm(center, [p.lat, p.lng]) })).sort((a, b) => a.distance - b.distance);
    const nearestWater = waterDistances[0];
    const bearDistances = places.filter((p) => p.category === "bear").map((p) => distanceKm(center, [p.lat, p.lng]));
    const hasBearWarning = bearDistances.some((d) => d < 8);
    const nearestWaterKm = nearestWater ? nearestWater.distance : 99;
    const penalties = getPenaltyBreakdown({ weather, nearestWaterKm, hasBearWarning });
    const score = clamp(Math.round(100 - penalties.total), 0, 100);

    const status = score >= 80 ? "歩行に適しています" : score >= 65 ? "注意して行動できます" : score >= 45 ? "慎重な判断が必要です" : "行動計画の見直しを推奨";
    const reason = score >= 80
      ? "気温が快適で、風が弱く、近くに水場があります。"
      : score >= 65
        ? "一部に注意要素があります。水分・雨具・時間帯を確認してください。"
        : "天気・補給・地形のリスクが高めです。無理のない行程にしてください。";

    const factors = [
      {
        title: "気温・体感",
        status: penalties.heatPenalty <= 5 ? "良好" : penalties.heatPenalty <= 14 ? "注意" : "警戒",
        className: penalties.heatPenalty <= 5 ? "good" : penalties.heatPenalty <= 14 ? "caution" : "alert",
        text: `${weather.temperature}℃ / 体感 ${weather.apparentTemperature}℃。地表温度は衛星データの季節傾向として表示想定。`
      },
      {
        title: "雨・風",
        status: penalties.rainPenalty + penalties.windPenalty <= 5 ? "良好" : penalties.rainPenalty + penalties.windPenalty <= 14 ? "注意" : "警戒",
        className: penalties.rainPenalty + penalties.windPenalty <= 5 ? "good" : penalties.rainPenalty + penalties.windPenalty <= 14 ? "caution" : "alert",
        text: `降水確率 ${weather.precipitationProbability}% / 風速 ${weather.windSpeed}m/s。`
      },
      {
        title: "補給地点",
        status: penalties.waterPenalty <= 3 ? "良好" : penalties.waterPenalty <= 8 ? "注意" : "警戒",
        className: penalties.waterPenalty <= 3 ? "good" : penalties.waterPenalty <= 8 ? "caution" : "alert",
        text: nearestWater ? `最寄りの補給候補「${nearestWater.name}」まで約${nearestWater.distance.toFixed(1)}km。` : "近くの補給候補が未登録です。"
      },
      {
        title: "地形負荷",
        status: "注意",
        className: "caution",
        text: "デモルートは中程度の標高差・勾配を想定。雨天後は足元状態に注意。"
      },
      {
        title: "ヒグマ注意",
        status: hasBearWarning ? "注意" : "良好",
        className: hasBearWarning ? "caution" : "good",
        text: hasBearWarning ? "ヒグマ注意エリアが周辺にあります。現地情報を確認してください。" : "近距離の注意情報は未登録です。"
      }
    ];

    const actions = [
      "水は2L以上を目安に携行してください。",
      "08:30前後の出発を推奨。13:00〜15:00は暑さに注意。",
      "ヒグマ鈴など現地ルールに沿った装備を確認してください。",
      "オフライン地図を保存し、通信不安定時に備えてください。"
    ];

    return {
      score,
      status,
      reason,
      heatRisk: riskLabel(penalties.heatPenalty, { low: 7, mid: 14 }),
      rainRisk: riskLabel(penalties.rainPenalty + penalties.windPenalty, { low: 5, mid: 14 }),
      terrainLoad: "中",
      nearestWater,
      penalties,
      factors,
      actions
    };
  }

  window.ComfortScore = { calculateComfortScore, distanceKm };
})();

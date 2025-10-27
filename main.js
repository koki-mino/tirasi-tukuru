// --- 小道具（距離計算: Haversine, m） ---
const distM = (a, b) => {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s1 = toRad(a.lat), s2 = toRad(b.lat);
  const A = Math.sin(dLat/2)**2 + Math.cos(s1)*Math.cos(s2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(A));
};

// --- 地図初期化 ---
const map = L.map('map').setView([36.34, 139.45], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OSM contributors'
}).addTo(map);

const markers = L.layerGroup().addTo(map);
const meMarker = L.layerGroup().addTo(map);
let features = []; // GeoJSON Feature[]
let tapMode = false;

// --- UI ---
const placeList = document.getElementById('placeList');
const quizBox   = document.getElementById('quizBox');
const quizList  = document.getElementById('quizList');
document.getElementById('tapMode').addEventListener('change', e => tapMode = e.target.checked);

// in-app ブラウザっぽいときの注意
(() => {
  const ua = navigator.userAgent.toLowerCase();
  if (/line|instagram|fbav|fb_iab|tiktok/.test(ua)) {
    document.getElementById('tip').innerHTML =
      'アプリ内ブラウザでは位置情報が拒否されることがあります。右上のメニューから「ブラウザで開く」を選んでください。';
  }
})();

// --- チェックポイント読み込み ---
const fc = await fetch('data/places.geojson').then(r => r.json());
features = fc.features;

// 地図に表示 & リスト化
features.forEach(f => {
  const [lng, lat] = f.geometry.coordinates;
  const { name, radius } = f.properties;

  // マーカー & 半径円
  const m = L.marker([lat, lng]).bindPopup(name);
  const c = L.circle([lat, lng], { radius, color:'#0f766e', fillOpacity:0.08 });
  markers.addLayer(m); markers.addLayer(c);

  // リスト
  const li = document.createElement('li');
  li.textContent = name;
  const b = document.createElement('span'); b.className='badge'; b.textContent = `半径${radius}m`;
  li.appendChild(b);
  placeList.appendChild(li);
});

// --- 判定 & クイズ表示 ---
function evaluateAndShow(my) {
  // 現在地マーカー更新
  meMarker.clearLayers();
  L.marker([my.lat, my.lng]).addTo(meMarker).bindPopup('あなたの場所');

  // 判定
  const inside = features.filter(f => {
    const [lng, lat] = f.geometry.coordinates;
    const p = { lat, lng };
    const d = distM(my, p);
    return d <= (f.properties.radius ?? 120);
  });

  if (inside.length) {
    quizBox.classList.remove('hidden');
    quizList.innerHTML = inside.map(f => {
      const {name, quiz, answer} = f.properties;
      return `<li><strong>${name}</strong>：${quiz}
        <details><summary>答えを見る</summary><p>${answer}</p></details></li>`;
    }).join('');
  } else {
    quizBox.classList.remove('hidden');
    quizList.innerHTML = `<li>近くのチェックポイントに行くとクイズが解放されます。</li>`;
  }
}

// --- 位置情報取得（ユーザー操作で開始：権限通りやすい） ---
document.getElementById('locBtn').addEventListener('click', () => {
  if (tapMode) {
    alert('地図をタップして現在地の代わりにします。');
    const once = e => {
      const my = { lat: e.latlng.lat, lng: e.latlng.lng };
      evaluateAndShow(my);
      map.off('click', once);
      map.setView([my.lat, my.lng], 17);
    };
    map.on('click', once);
    return;
  }

  if (!('geolocation' in navigator)) {
    alert('この端末は位置情報に対応していません。タップ代用モードを使ってください。');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const my = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      evaluateAndShow(my);
      map.setView([my.lat, my.lng], 17);
    },
    err => {
      const msg = {1:'許可が拒否されました',2:'取得できませんでした',3:'タイムアウト'}[err.code] || '取得エラー';
      alert('位置情報エラー：' + msg + '\n「サイトの権限」で位置情報を許可してください。');
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
});

// --- PWA: サービスワーカー登録（オフライン閲覧） ---
if ('serviceWorker' in navigator) {
  try { navigator.serviceWorker.register('service-worker.js'); } catch {}
}

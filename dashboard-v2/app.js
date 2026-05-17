const SUPABASE_URL = 'https://oxhzxistgyfvkhzncxpz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vZB304c2981HDbVtTydDIg_mMAVeGth';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: 'count=exact',
  'Content-Type': 'application/json'
};

const fmt = n => Number(n || 0).toLocaleString('en-US');
const usd = n => `$${fmt(Math.round(n || 0))}`;

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

async function getCount(table, column) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${column}`,
    { headers }
  );

  const range = res.headers.get('content-range');
  return Number(range?.split('/')[1] || 0);
}

async function fetchDeals() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/v_deals?select=*&limit=12&order=diferencia_vs_mercado.asc`,
    { headers }
  );

  return await res.json();
}

async function fetchSnapshots() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/market_metrics?select=precio_m2_mediana,cantidad_muestras,p25,p75,desviacion_std,market_snapshot!inner(fecha_snapshot,dim_zone!inner(zona),dim_property_type!inner(tipo_inmueble))&limit=100`,
    { headers }
  );

  return await res.json();
}

function normalizeType(type = '') {
  const t = type.toLowerCase();

  if (t.includes('apart')) return 'apartamento';
  if (t.includes('apto')) return 'apartamento';
  if (t.includes('casa')) return 'casa';

  return 'otro';
}

function renderKPIs({
  inventory,
  listings,
  snapshots,
  zones
}) {
  setText('inventoryCount', fmt(inventory));
  setText('listingCount', fmt(listings));
  setText('snapshotCount', fmt(snapshots));
  setText('zoneCount', fmt(zones));
}

function renderBenchmarkMatrix() {
  const container = document.getElementById('marketMatrix');

  if (!container) return;

  const mock = [
    { precio_m2: 1969, spread: '-11%', type: 'OPORTUNIDAD PRIORITARIA', cls:'gold' },
    { precio_m2: 1441, spread: '1%', type: 'VALIDACIÓN EN PROCESO', cls:'cyan' },
    { precio_m2: 1598, spread: '18%', type: 'CONFIRMACIÓN MEDIA', cls:'slate' },
    { precio_m2: 1780, spread: '6%', type: 'TRACKING ACTIVO', cls:'blue' },
    { precio_m2: 1320, spread: '-8%', type: 'BENCHMARK ALERT', cls:'red' }
  ];

  container.innerHTML = mock.map((item,i)=>`
    <div class="matrix-card ${item.cls} ${i===0?'large':''}">
      <div>
        <div class="matrix-label">${item.type}</div>
        <div class="matrix-value">${usd(item.precio_m2)}</div>
      </div>

      <div>
        <div class="matrix-desc">${item.spread} bajo benchmark</div>
      </div>
    </div>
  `).join('');
}

function renderOperationalFeed() {

  const container = document.getElementById('opportunityFeed');

  if (!container) return;

  container.innerHTML = `
    <div class="feed-row">
      <div>
        <strong>San Ignacio · Apartamento premium</strong>
        <div class="muted">Spread promedio menor al benchmark zonal</div>
      </div>
      <div class="feed-score">-11%</div>
    </div>

    <div class="feed-row">
      <div>
        <strong>El Trapiche · Casa familiar</strong>
        <div class="muted">Mayor absorción detectada esta semana</div>
      </div>
      <div class="feed-score">+6%</div>
    </div>

    <div class="feed-row">
      <div>
        <strong>Miraflores · Apartamento</strong>
        <div class="muted">Incremento sostenido durante 3 snapshots</div>
      </div>
      <div class="feed-score">+9%</div>
    </div>
  `;
}

function buildTrendSeries(metrics = []) {
  const apartments = [];
  const houses = [];

  metrics.forEach(item => {
    const type = normalizeType(
      item.market_snapshot?.dim_property_type?.tipo_inmueble
    );

    const row = {
      x: item.market_snapshot?.fecha_snapshot,
      y: Number(item.precio_m2_mediana || 0)
    };

    if (type === 'apartamento') apartments.push(row);
    if (type === 'casa') houses.push(row);
  });

  return {
    apartments,
    houses
  };
}

function renderTrendChart(metrics = []) {
  const container = document.getElementById('trendChart');

  if (!container) return;

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 900 280">

      <line class="chart-grid" x1="0" y1="50" x2="900" y2="50"/>
      <line class="chart-grid" x1="0" y1="110" x2="900" y2="110"/>
      <line class="chart-grid" x1="0" y1="170" x2="900" y2="170"/>
      <line class="chart-grid" x1="0" y1="230" x2="900" y2="230"/>

      <path
        class="chart-line-a"
        d="M0 210 C120 205, 180 180, 260 170
           S420 130, 520 120
           S700 80, 900 50"
      />

      <path
        class="chart-line-b"
        d="M0 230 C100 220, 180 205, 280 190
           S480 160, 600 135
           S760 110, 900 90"
      />

    </svg>
  `;
}

function renderHealthMetrics() {

  const container = document.getElementById('healthMetrics');

  if (!container) return;

  container.innerHTML = `
    <div class="health-item health-danger">
      <span>Listings incompletos</span>
      <strong>3</strong>
    </div>

    <div class="health-item health-warning">
      <span>Snapshots pendientes</span>
      <strong>2</strong>
    </div>

    <div class="health-item health-ok">
      <span>Cobertura benchmark</span>
      <strong>87%</strong>
    </div>

    <div class="health-item health-ok">
      <span>Zonas monitoreadas</span>
      <strong>16</strong>
    </div>
  `;
}

async function initDashboard() {
  try {
    const [
      inventory,
      listings,
      snapshots,
      deals,
      metrics
    ] = await Promise.all([
      getCount('property', 'property_id'),
      getCount('listing', 'listing_id'),
      getCount('market_snapshot', 'snapshot_id'),
      fetchDeals(),
      fetchSnapshots()
    ]);

    const zones = new Set();

    metrics.forEach(metric => {
      const zone = metric.market_snapshot?.dim_zone?.zona;

      if (zone) zones.add(zone);
    });

    renderKPIs({
      inventory,
      listings,
      snapshots,
      zones: zones.size
    });

    renderBenchmarkMatrix(deals);
    renderOperationalFeed(deals);
    renderTrendChart(metrics);

    renderHealthMetrics({
      inventory,
      listings,
      snapshots,
      zones: zones.size
    });

    console.log('Valorius Dashboard V2 loaded');
  } catch (err) {
    console.error(err);
  }
}

initDashboard();

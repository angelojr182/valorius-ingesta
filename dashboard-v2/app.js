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

function renderBenchmarkMatrix(deals = []) {
  const container = document.getElementById('marketMatrix');

  if (!container) return;

  const styles = ['gold', 'cyan', 'slate', 'blue', 'red'];

  container.innerHTML = deals.slice(0, 5).map((deal, i) => {
    const spread = Math.round(
      Number(deal.diferencia_vs_mercado || 0) * 100
    );

    return `
      <div class="matrix-card ${styles[i]} ${i === 0 ? 'large' : ''}">
        <div>
          <div class="matrix-label">
            ${i === 0 ? 'ALTA PRIORIDAD' : 'TRACKING'}
          </div>

          <div class="matrix-value">
            ${usd(deal.precio_m2)}
          </div>
        </div>

        <div>
          <div class="matrix-desc">
            ${spread}% vs benchmark
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderOperationalFeed(deals = []) {
  const container = document.getElementById('opportunityFeed');

  if (!container) return;

  container.innerHTML = deals.map(deal => {
    const spread = Math.round(
      Number(deal.diferencia_vs_mercado || 0) * 100
    );

    return `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${deal.estatus_inversion || 'Oportunidad detectada'}</strong>
          <span class="muted">${spread}%</span>
        </div>

        <div style="margin-top:10px">
          <div class="muted">
            USD/m²: ${usd(deal.precio_m2)}
          </div>

          <div class="muted">
            ${deal.indice_validacion || 'Validación activa'}
          </div>
        </div>
      </div>
    `;
  }).join('');
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

  const { apartments, houses } = buildTrendSeries(metrics);

  container.innerHTML = `
    <div style="padding:24px">
      <div class="muted">Apartamentos: ${apartments.length} puntos</div>
      <div class="muted">Casas: ${houses.length} puntos</div>
    </div>
  `;
}

function renderHealthMetrics({
  inventory,
  listings,
  snapshots,
  zones
}) {
  const container = document.getElementById('healthMetrics');

  if (!container) return;

  container.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <strong>Inventario</strong>
      <p class="muted">${fmt(inventory)}</p>
    </div>

    <div class="card" style="margin-bottom:12px">
      <strong>Listings</strong>
      <p class="muted">${fmt(listings)}</p>
    </div>

    <div class="card" style="margin-bottom:12px">
      <strong>Snapshots</strong>
      <p class="muted">${fmt(snapshots)}</p>
    </div>

    <div class="card">
      <strong>Zonas</strong>
      <p class="muted">${fmt(zones)}</p>
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

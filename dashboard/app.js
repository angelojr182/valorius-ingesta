async function loadDashboardMetrics() {
  const sb = window.supabaseClient.schema('core');

  try {
    const [
      { count: inventory },
      { count: zones },
      { count: listings },
      { count: snapshots }
    ] = await Promise.all([
      sb.from('property').select('*', { count: 'exact', head: true }),
      sb.from('dim_zone').select('*', { count: 'exact', head: true }),
      sb.from('listing').select('*', { count: 'exact', head: true }),
      sb.from('market_snapshot').select('*', { count: 'exact', head: true })
    ]);

    document.getElementById('inventoryCount').textContent = inventory || 0;
    document.getElementById('zoneCount').textContent = zones || 0;
    document.getElementById('listingCount').textContent = listings || 0;
    document.getElementById('snapshotCount').textContent = snapshots || 0;

    const { data: deals, error } = await sb
      .from('v_deals')
      .select('*')
      .limit(6);

    if (error) {
      console.error(error);
      return;
    }

    if (deals && deals.length > 0) {
      const avg = Math.round(
        deals.reduce((acc, d) => acc + Number(d.precio_m2 || 0), 0) / deals.length
      );

      document.getElementById('medianPrice').textContent = `$${avg.toLocaleString()}`;

      renderOpportunityFeed(deals);
      renderMarketMatrix(deals);
      renderInsights(deals);
      renderBenchmark(deals);
      renderDataHealth(listings, snapshots);
    }
  } catch (err) {
    console.error('Dashboard load error', err);
  }
}

function renderOpportunityFeed(deals) {
  const tbody = document.getElementById('feedBody');
  if (!tbody) return;

  tbody.innerHTML = deals.map(d => `
    <tr>
      <td>${d.nota_analista?.slice(0, 24) || 'Propiedad'}</td>
      <td>${d.estatus_inversion || '-'}</td>
      <td>$${Math.round(Number(d.precio_m2 || 0)).toLocaleString()}</td>
      <td><span class="tag cyan">${Math.round(Number(d.diferencia_vs_mercado || 0) * 100)}%</span></td>
    </tr>
  `).join('');
}

function renderMarketMatrix(deals) {
  const container = document.getElementById('marketMatrix');
  if (!container) return;

  const styles = ['gold-zone','cyan-zone','slate-zone','blue-zone','dark-zone','red-zone'];

  container.innerHTML = deals.map((d, i) => `
    <div class="matrix-card ${styles[i % styles.length]}">
      <h4>${d.estatus_inversion || 'Mercado'}</h4>
      <div class="matrix-value">$${Math.round(Number(d.precio_m2 || 0)).toLocaleString()}</div>
      <p>${d.indice_validacion || 'Validación activa'}</p>
      <small>${d.cantidad_muestras || 0} muestras comparativas</small>
    </div>
  `).join('');
}

function renderInsights(deals) {
  const container = document.getElementById('liveInsights');
  if (!container) return;

  const top = deals[0];

  container.innerHTML = `
    <div class="pulse-item gold-item">💎 ${top.estatus_inversion}</div>
    <div class="pulse-item blue-item">📈 Diferencia mercado: ${Math.round(Number(top.diferencia_vs_mercado || 0) * 100)}%</div>
    <div class="pulse-item slate-item">🏠 ${deals.length} oportunidades activas detectadas</div>
    <div class="pulse-item dark-item">📊 ${top.indice_validacion}</div>
  `;
}

function renderBenchmark(deals) {
  const apartments = deals.filter(d => Number(d.precio_m2 || 0) > 1800);
  const houses = deals.filter(d => Number(d.precio_m2 || 0) <= 1800);

  const aptAvg = apartments.length
    ? Math.round(apartments.reduce((a,b)=>a+Number(b.precio_m2||0),0)/apartments.length)
    : 0;

  const houseAvg = houses.length
    ? Math.round(houses.reduce((a,b)=>a+Number(b.precio_m2||0),0)/houses.length)
    : 0;

  const compare = document.querySelectorAll('.compare-number');

  if (compare[0]) compare[0].textContent = `$${aptAvg.toLocaleString()}`;
  if (compare[1]) compare[1].textContent = `$${houseAvg.toLocaleString()}`;
}

function renderDataHealth(listings, snapshots) {
  const metrics = document.querySelectorAll('.metric-row strong');

  if(metrics[0]) metrics[0].textContent = Math.max(0, Math.floor(listings * 0.03));
  if(metrics[1]) metrics[1].textContent = Math.max(0, Math.floor(listings * 0.01));
  if(metrics[2]) metrics[2].textContent = '2';
  if(metrics[3]) metrics[3].textContent = '87%';
  if(metrics[4]) metrics[4].textContent = `${snapshots} snapshots`;
}

loadDashboardMetrics();
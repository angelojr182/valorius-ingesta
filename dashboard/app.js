async function loadDashboardMetrics() {
  const sb = window.supabaseClient;

  const [{ count: inventory }, { count: zones }, { count: listings }, { count: snapshots }] = await Promise.all([
    sb.from('property').select('*', { count: 'exact', head: true }),
    sb.from('dim_zone').select('*', { count: 'exact', head: true }),
    sb.from('listing').select('*', { count: 'exact', head: true }),
    sb.from('market_snapshot').select('*', { count: 'exact', head: true })
  ]);

  document.getElementById('inventoryCount').textContent = inventory || 0;
  document.getElementById('zoneCount').textContent = zones || 0;
  document.getElementById('listingCount').textContent = listings || 0;
  document.getElementById('snapshotCount').textContent = snapshots || 0;

  const { data: deals } = await sb
    .from('v_deals')
    .select('*')
    .order('score', { ascending: false })
    .limit(6);

  if (deals && deals.length > 0) {
    const avg = Math.round(
      deals.reduce((acc, d) => acc + (d.price_per_m2 || 0), 0) / deals.length
    );

    document.getElementById('medianPrice').textContent = `$${avg.toLocaleString()}`;

    renderOpportunityFeed(deals);
    renderMarketMatrix(deals);
    renderInsights(deals);
  }
}

function renderOpportunityFeed(deals) {
  const tbody = document.getElementById('feedBody');
  if (!tbody) return;

  tbody.innerHTML = deals.map(d => `
    <tr>
      <td>${d.title || 'Propiedad'}</td>
      <td>${d.property_type || '-'}</td>
      <td>$${Math.round(d.price_per_m2 || 0).toLocaleString()}</td>
      <td><span class="tag cyan">${Math.round(d.score || 0)}</span></td>
    </tr>
  `).join('');
}

function renderMarketMatrix(deals) {
  const container = document.getElementById('marketMatrix');
  if (!container) return;

  const styles = ['gold-zone','cyan-zone','slate-zone','blue-zone','dark-zone','red-zone'];

  container.innerHTML = deals.map((d, i) => `
    <div class="matrix-card ${styles[i % styles.length]}">
      <h4>${d.zone || 'Zona'}</h4>
      <div class="matrix-value">$${Math.round(d.price_per_m2 || 0)}</div>
      <p>${d.property_type || 'Propiedad'} · Score ${Math.round(d.score || 0)}</p>
      <small>${d.status_inversion || 'Monitoreado'}</small>
    </div>
  `).join('');
}

function renderInsights(deals) {
  const container = document.getElementById('liveInsights');
  if (!container) return;

  const topDeal = deals[0];
  const avgScore = Math.round(deals.reduce((a,b)=>a+(b.score||0),0)/deals.length);

  container.innerHTML = `
    <div class="pulse-item gold-item">💎 ${topDeal.zone || 'Zona'} lidera oportunidades detectadas</div>
    <div class="pulse-item blue-item">📈 ${topDeal.property_type || 'Mercado'} supera benchmark esperado</div>
    <div class="pulse-item slate-item">🏠 ${deals.length} propiedades bajo monitoreo prioritario</div>
    <div class="pulse-item dark-item">📊 Score promedio dashboard: ${avgScore}</div>
  `;
}

loadDashboardMetrics();
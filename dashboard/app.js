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
    .limit(1);

  if (deals && deals.length > 0) {
    const firstDeal = deals[0];

    if (firstDeal.price_per_m2) {
      document.getElementById('medianPrice').textContent = `$${Math.round(firstDeal.price_per_m2).toLocaleString()}`;
    }
  }
}

loadDashboardMetrics();
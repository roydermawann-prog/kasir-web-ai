const API_URL = '/api';
let categoryChart = null;

// Alert helper (used for errors)
function showAlert(message, type = 'success') {
  const alertDiv = document.getElementById('alert');
  if (!alertDiv) return;
  alertDiv.textContent = message;
  alertDiv.className = 'alert ' + type;
  alertDiv.style.display = 'block';
  setTimeout(() => alertDiv.style.display = 'none', 3000);
}

// Load stats & chart & recent orders
async function loadStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      fetch(API_URL + '/products'),
      fetch(API_URL + '/orders')
    ]);
    const products = await productsRes.json();
    const orders = await ordersRes.json();

    // Update stats cards
    const statProducts = document.getElementById('statProducts');
    const statOrders = document.getElementById('statOrders');
    const statAvgPrice = document.getElementById('statAvgPrice');
    if (statProducts) statProducts.textContent = products.length;
    if (statOrders) statOrders.textContent = orders.length;
    if (statAvgPrice) {
      if (products.length > 0) {
        const avg = Math.round(products.reduce((sum, p) => sum + Number(p.price), 0) / products.length);
        statAvgPrice.textContent = new Intl.NumberFormat('id-ID').format(avg);
      } else {
        statAvgPrice.textContent = '0';
      }
    }

    // Render chart
    renderCategoryChart(products);

    // Render recent orders (top 5)
    renderRecentOrders(orders.slice(0, 5));
  } catch (err) {
    console.error('Failed to load stats:', err);
    showAlert('Gagal memuat statistik', 'error');
  }
}

function renderCategoryChart(products) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  const categories = {};
  products.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  const labels = Object.keys(categories);
  const data = Object.values(categories);

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada orders</td></tr>';
    return;
  }
  orders.forEach(o => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><code>${o.order_code}</code></td>
      <td>${o.product}</td>
      <td>${o.quantity}</td>
      <td>${new Date(o.created_at).toLocaleString('id-ID')}</td>
    `;
    tbody.appendChild(row);
  });
}

// Initial load
loadStats();

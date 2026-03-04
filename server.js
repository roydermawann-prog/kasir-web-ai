const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route: Home page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kasir AI - Sistem Point of Sale</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; color: #333; }
        h1 { color: #2c3e50; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; margin: 20px 0; }
        .api-test { margin-top: 20px; }
        button { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #2980b9; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛒 Kasir AI</h1>
        <p>Sistem Point of Sale sederhana dengan Node.js + Express</p>
        
        <div class="status">
          <strong>✅ Server berjalan!</strong><br>
          Port: ${PORT}<br>
          Waktu: ${new Date().toLocaleString('id-ID')}
        </div>

        <div class="api-test">
          <h3>Test API:</h3>
          <button onclick="testAPI('products')">GET /api/products</button>
          <button onclick="testAPI('orders')">POST /api/orders</button>
          <pre id="result">Klik tombol di atas untuk test...</pre>
        </div>

        <h3>Endpoints tersedia:</h3>
        <ul>
          <li><code>GET /</code> - Halaman ini</li>
          <li><code>GET /api/status</code> - Status server</li>
          <li><code>GET /api/products</code> - List produk (dummy)</li>
          <li><code>POST /api/orders</code> - Buat pesanan baru</li>
        </ul>
      </div>

      <script>
        async function testAPI(endpoint) {
          const resultEl = document.getElementById('result');
          resultEl.textContent = 'Loading...';
          
          try {
            const response = await fetch('/api/' + endpoint, {
              method: endpoint === 'orders' ? 'POST' : 'GET',
              headers: { 'Content-Type': 'application/json' },
              body: endpoint === 'orders' ? JSON.stringify({ product: 'Kopi', qty: 2 }) : null
            });
            const data = await response.json();
            resultEl.textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            resultEl.textContent = 'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API: Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API: Products (dummy data)
app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Kopi Hitam', price: 15000, category: 'Minuman' },
    { id: 2, name: 'Teh Manis', price: 10000, category: 'Minuman' },
    { id: 3, name: 'Roti Bakar', price: 12000, category: 'Makanan' },
    { id: 4, name: 'Nasi Goreng', price: 25000, category: 'Makanan' },
    { id: 5, name: 'Jus Jeruk', price: 18000, category: 'Minuman' }
  ]);
});

// API: Create Order
app.post('/api/orders', (req, res) => {
  const { product, qty = 1 } = req.body;
  if (!product) {
    return res.status(400).json({ error: 'Product name required' });
  }
  const orderId = Date.now().toString(36).toUpperCase();
  res.status(201).json({
    success: true,
    orderId,
    product,
    quantity: qty,
    message: `Order ${orderId} created for ${qty}x ${product}`
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kasir AI Server running at http://0.0.0.0:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /api/status`);
  console.log(`   GET /api/products`);
  console.log(`   POST /api/orders`);
});

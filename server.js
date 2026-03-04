const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'kasir.db');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error connecting to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database at', DB_PATH);
  }
});

// Initialize tables (auto-create if not exist)
db.serialize(() => {
  // Products table
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('❌ Error creating products table:', err.message);
    else console.log('✅ Products table ready');
  });

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE NOT NULL,
    product TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('❌ Error creating orders table:', err.message);
    else console.log('✅ Orders table ready');
  });

  // Seed initial products if table is empty
  db.get(`SELECT COUNT(*) as count FROM products`, (err, row) => {
    if (err) {
      console.error('❌ Error checking products:', err.message);
      return;
    }
    if (row.count === 0) {
      const initialProducts = [
        ['Kopi Hitam', 15000, 'Minuman'],
        ['Teh Manis', 10000, 'Minuman'],
        ['Roti Bakar', 12000, 'Makanan'],
        ['Nasi Goreng', 25000, 'Makanan'],
        ['Jus Jeruk', 18000, 'Minuman']
      ];
      const stmt = db.prepare(`INSERT INTO products (name, price, category) VALUES (?, ?, ?)`);
      initialProducts.forEach(p => stmt.run(p[0], p[1], p[2]));
      stmt.finalize();
      console.log('✅ Seeded initial products');
    }
  });
});

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
        <h1>🛒 Kasir AI (SQLite Edition)</h1>
        <p>Sistem Point of Sale dengan database SQLite</p>
        
        <div class="status">
          <strong>✅ Server berjalan!</strong><br>
          Port: ${PORT}<br>
          Database: kasir.db<br>
          Waktu: ${new Date().toLocaleString('id-ID')}
        </div>

        <div class="api-test">
          <h3>Test API:</h3>
          <button onclick="testAPI('products')">GET /api/products</button>
          <button onclick="testAPI('orders')">POST /api/orders</button>
          <button onclick="testAPI('orders-list')">GET /api/orders</button>
          <pre id="result">Klik tombol di atas untuk test...</pre>
        </div>

        <h3>Endpoints tersedia:</h3>
        <ul>
          <li><code>GET /</code> - Halaman ini</li>
          <li><code>GET /api/status</code> - Status server</li>
          <li><code>GET /api/products</code> - List produk dari DB</li>
          <li><code>GET /api/orders</code> - Riwayat orders</li>
          <li><code>POST /api/orders</code> - Buat pesanan baru (body: {product, qty})</li>
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
    version: '2.0.0',
    database: 'sqlite'
  });
});

// API: Get all products
app.get('/api/products', (req, res) => {
  db.all(`SELECT * FROM products ORDER BY id`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// API: Create order
app.post('/api/orders', (req, res) => {
  const { product, qty = 1 } = req.body;
  if (!product) {
    return res.status(400).json({ error: 'Product name required' });
  }
  const orderCode = Date.now().toString(36).toUpperCase();
  db.run(
    `INSERT INTO orders (order_code, product, quantity) VALUES (?, ?, ?)`,
    [orderCode, product, qty],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({
        success: true,
        orderId: this.lastID,
        orderCode,
        product,
        quantity: qty,
        message: `Order ${orderCode} created`
      });
    }
  );
});

// API: Get all orders
app.get('/api/orders', (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 50`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kasir AI Server (SQLite) running at http://0.0.0.0:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /api/status`);
  console.log(`   GET /api/products`);
  console.log(`   GET /api/orders`);
  console.log(`   POST /api/orders`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

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

// Routes
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/dashboard', (req, res) => {
  res.sendFile('dashboard.html', { root: path.join(__dirname, 'public') });
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

// API: Create product
app.post('/api/products', (req, res) => {
  const { name, price, category } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  db.run(
    `INSERT INTO products (name, price, category) VALUES (?, ?, ?)`,
    [name, price, category],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({
        success: true,
        id: this.lastID,
        name,
        price,
        category,
        message: 'Product created'
      });
    }
  );
});

// API: Update product
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, category } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  db.run(
    `UPDATE products SET name = ?, price = ?, category = ? WHERE id = ?`,
    [name, price, category, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({
        success: true,
        id: parseInt(id),
        name,
        price,
        category,
        message: 'Product updated'
      });
    }
  );
});

// API: Delete product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT name FROM products WHERE id = ?`, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productName = row.name;
    db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        success: true,
        message: `"${productName}" berhasil dihapus`,
        deletedProduct: productName
      });
    });
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

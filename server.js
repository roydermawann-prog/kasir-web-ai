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

// Route: Dashboard (Barang management)
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kasir AI - Dashboard Barang</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; height: 100vh; background: #f5f5f5; }
    /* Sidebar */
    .sidebar { width: 250px; background: #2c3e50; color: white; padding: 20px; }
    .sidebar h2 { margin-bottom: 30px; font-size: 1.5em; }
    .sidebar ul { list-style: none; }
    .sidebar li { margin-bottom: 10px; }
    .sidebar a { color: #ecf0f1; text-decoration: none; display: block; padding: 12px; border-radius: 5px; transition: background 0.3s; }
    .sidebar a:hover, .sidebar a.active { background: #34495e; }
    /* Main content */
    .main { flex: 1; padding: 30px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h1 { color: #2c3e50; }
    .btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; }
    .btn:hover { background: #2980b9; }
    .btn-danger { background: #e74c3c; }
    .btn-danger:hover { background: #c0392b; }
    .btn-success { background: #27ae60; }
    .btn-success:hover { background: #229954; }
    /* Form */
    .form-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
    .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
    .form-group { flex: 1; }
    .form-group label { display: block; margin-bottom: 5px; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    /* Table */
    .table-container { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #34495e; color: white; font-weight: 600; }
    tr:hover { background: #f9f9f9; }
    .action-btns { display: flex; gap: 5px; }
    .action-btns button { padding: 5px 10px; font-size: 12px; }
    .empty-state { text-align: center; padding: 40px; color: #999; }
    /* Alert */
    .alert { padding: 12px; border-radius: 5px; margin-bottom: 20px; display: none; }
    .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <div class="sidebar">
    <h2>🛒 Kasir AI</h2>
    <ul>
      <li><a href="/" class="">🏠 Home</a></li>
      <li><a href="/dashboard" class="active">📦 Barang</a></li>
      <li><a href="/api/orders" onclick="event.preventDefault(); alert('Halaman Orders belum tersedia')">🧾 Orders</a></li>
    </ul>
  </div>

  <!-- Main Content -->
  <div class="main">
    <div class="header">
      <h1>📦 Manajemen Barang</h1>
    </div>

    <!-- Alert -->
    <div id="alert" class="alert"></div>

    <!-- Form Add/Edit -->
    <div class="form-card">
      <h3 id="formTitle" style="margin-bottom: 15px;">Tambah Barang Baru</h3>
      <form id="productForm">
        <input type="hidden" id="editId">
        <div class="form-row">
          <div class="form-group">
            <label>Nama Barang</label>
            <input type="text" id="name" placeholder="Contoh: Kopi Hitam" required>
          </div>
          <div class="form-group">
            <label>Harga (Rp)</label>
            <input type="number" id="price" placeholder="15000" required min="0">
          </div>
          <div class="form-group">
            <label>Kategori</label>
            <select id="category" required>
              <option value="">Pilih kategori</option>
              <option value="Minuman">Minuman</option>
              <option value="Makanan">Makanan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" id="cancelBtn" class="btn" style="display: none;">Batal</button>
          <button type="submit" class="btn btn-success" id="submitBtn">Tambah Barang</button>
        </div>
      </form>
    </div>

    <!-- Products Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Barang</th>
            <th>Harga (Rp)</th>
            <th>Kategori</th>
            <th>Ditambahkan</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="productsTable">
          <tr><td colspan="6" class="empty-state">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const API_URL = '/api';
    const form = document.getElementById('productForm');
    const tableBody = document.getElementById('productsTable');
    const alertDiv = document.getElementById('alert');
    const formTitle = document.getElementById('formTitle');
    const editIdInput = document.getElementById('editId');
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const categoryInput = document.getElementById('category');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');

    let isEditing = false;

    function showAlert(message, type = 'success') {
      alertDiv.textContent = message;
      alertDiv.className = 'alert ' + type;
      alertDiv.style.display = 'block';
      setTimeout(() => alertDiv.style.display = 'none', 3000);
    }

    function loadProducts() {
      fetch(API_URL + '/products')
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          tableBody.innerHTML = '';
          if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada barang. Tambahkan barang pertama!</td></tr>';
            return;
          }
          data.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = \`
              <td>\${p.id}</td>
              <td>\${p.name}</td>
              <td>Rp \${Number(p.price).toLocaleString('id-ID')}</td>
              <td>\${p.category}</td>
              <td>\${new Date(p.created_at).toLocaleDateString('id-ID')}</td>
              <td>
                <div class="action-btns">
                  <button class="btn" onclick="editProduct(\${p.id}, '\${p.name}', \${p.price}, '\${p.category}')">Edit</button>
                  <button class="btn btn-danger" onclick="deleteProduct(\${p.id})">Hapus</button>
                </div>
              </td>
            \`;
            tableBody.appendChild(row);
          });
        })
        .catch(err => showAlert('Gagal memuat produk: ' + err.message, 'error'));
    }

    function editProduct(id, name, price, category) {
      isEditing = true;
      editIdInput.value = id;
      nameInput.value = name;
      priceInput.value = price;
      categoryInput.value = category;
      formTitle.textContent = 'Edit Barang';
      submitBtn.textContent = 'Update Barang';
      submitBtn.classList.remove('btn-success');
      submitBtn.classList.add('btn-danger');
      cancelBtn.style.display = 'inline-block';
      nameInput.focus();
    }

    function resetForm() {
      isEditing = false;
      form.reset();
      editIdInput.value = '';
      formTitle.textContent = 'Tambah Barang Baru';
      submitBtn.textContent = 'Tambah Barang';
      submitBtn.classList.remove('btn-danger');
      submitBtn.classList.add('btn-success');
      cancelBtn.style.display = 'none';
    }

    function deleteProduct(id) {
      if (!confirm('Hapus barang ini?')) return;
      fetch(API_URL + '/products/' + id, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          showAlert(data.message, 'success');
          loadProducts();
        })
        .catch(err => showAlert('Gagal menghapus: ' + err.message, 'error'));
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const price = parseFloat(priceInput.value);
      const category = categoryInput.value;

      if (!name || isNaN(price) || !category) {
        showAlert('Mohon lengkapi semua field', 'error');
        return;
      }

      const url = API_URL + (isEditing ? '/products/' + editIdInput.value : '/products');
      const method = isEditing ? 'PUT' : 'POST';
      const body = { name, price, category };

      fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          showAlert(isEditing ? 'Barang berhasil diupdate' : 'Barang berhasil ditambahkan', 'success');
          resetForm();
          loadProducts();
        })
        .catch(err => showAlert('Gagal: ' + err.message, 'error'));
    });

    cancelBtn.addEventListener('click', resetForm);

    // Initial load
    loadProducts();
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
  db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      success: true,
      message: `Product ${id} deleted`
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

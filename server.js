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
// Route: Dashboard (Barang management) - Modal Based UI
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
    .sidebar { width: 250px; background: #2c3e50; color: white; padding: 20px; }
    .sidebar h2 { margin-bottom: 30px; font-size: 1.5em; }
    .sidebar ul { list-style: none; }
    .sidebar li { margin-bottom: 10px; }
    .sidebar a { color: #ecf0f1; text-decoration: none; display: block; padding: 12px; border-radius: 5px; transition: background 0.3s; }
    .sidebar a:hover, .sidebar a.active { background: #34495e; }
    .main { flex: 1; padding: 30px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h1 { color: #2c3e50; }
    .btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s; }
    .btn:hover { background: #2980b9; }
    .btn-danger { background: #e74c3c; }
    .btn-danger:hover { background: #c0392b; }
    .btn-success { background: #27ae60; }
    .btn-success:hover { background: #229954; }
    .btn-secondary { background: #95a5a6; }
    .btn-secondary:hover { background: #7f8c8d; }
    .table-container { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #34495e; color: white; font-weight: 600; }
    tr:hover { background: #f9f9f9; }
    .action-btns { display: flex; gap: 5px; }
    .action-btns button { padding: 5px 10px; font-size: 12px; }
    .empty-state { text-align: center; padding: 40px; color: #999; }
    .alert { padding: 12px; border-radius: 5px; margin-bottom: 20px; display: none; }
    .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 10px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .modal-header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { color: #2c3e50; }
    .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; line-height: 1; }
    .modal-close:hover { color: #333; }
    .modal-body { padding: 20px; }
    .modal-footer { padding: 20px; border-top: 1px solid #eee; text-align: right; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; }
    .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #3498db; }
  </style>
</head>
<body>
  <div class="sidebar">
    <h2>🛒 Kasir AI</h2>
    <ul>
      <li><a href="/" class="">🏠 Home</a></li>
      <li><a href="/dashboard" class="active">📦 Barang</a></li>
      <li><a href="/api/orders" onclick="event.preventDefault(); alert('Halaman Orders belum tersedia')">🧾 Orders</a></li>
    </ul>
  </div>

  <div class="main">
    <div class="header">
      <h1>📦 Manajemen Barang</h1>
      <button class="btn btn-success" onclick="openModal()">+ Tambah Barang</button>
    </div>

    <div id="alert" class="alert"></div>

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

  <!-- Modal Form (Add/Edit) -->
  <div id="formModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 id="modalTitle">Tambah Barang</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="productForm">
          <input type="hidden" id="editId">
          <div class="form-group">
            <label for="name">Nama Barang</label>
            <input type="text" id="name" placeholder="Contoh: Kopi Hitam" required>
          </div>
          <div class="form-group">
            <label for="price">Harga (Rp)</label>
            <input type="text" id="price" placeholder="0" required>
          </div>
          <div class="form-group">
            <label for="category">Kategori</label>
            <select id="category" required>
              <option value="">Pilih kategori</option>
              <option value="Minuman">Minuman</option>
              <option value="Makanan">Makanan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button class="btn btn-success" onclick="submitForm()">Simpan</button>
      </div>
    </div>
  </div>

  <!-- Modal Delete Confirmation -->
  <div id="deleteModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3>Konfirmasi Hapus</h3>
        <button class="modal-close" onclick="closeDeleteModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>Hapus barang <strong id="deleteProductName"></strong>?</p>
        <p style="color: #e74c3c; margin-top: 10px;">Tindakan tidak dapat dibatalkan.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeDeleteModal()">Batal</button>
        <button class="btn btn-danger" id="confirmDeleteBtn">Hapus</button>
      </div>
    </div>
  </div>

  <script>
    const API_URL = '/api';
    const tableBody = document.getElementById('productsTable');
    const alertDiv = document.getElementById('alert');
    const formModal = document.getElementById('formModal');
    const deleteModal = document.getElementById('deleteModal');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const categoryInput = document.getElementById('category');
    const deleteProductName = document.getElementById('deleteProductName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    let isEditing = false;
    let deleteId = null;

    // Rupiah formatting
    const rupiahFormatters = [];
    priceInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      if (value) {
        const formatted = new Intl.NumberFormat('id-ID').format(value);
        rupiahFormatters[e.target] = value;
        e.target.value = formatted;
      } else {
        rupiahFormatters[e.target] = '';
      }
    });

    priceInput.addEventListener('blur', (e) => {
      if (!e.target.value) return;
      const raw = rupiahFormatters[e.target] || e.target.value.replace(/[^0-9]/g, '');
      e.target.value = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    });

    priceInput.addEventListener('focus', (e) => {
      if (e.target.value) {
        const raw = rupiahFormatters[e.target] || e.target.value.replace(/[^0-9]/g, '');
        e.target.value = raw;
      }
    });

    function showAlert(message, type = 'success') {
      alertDiv.textContent = message;
      alertDiv.className = 'alert ' + type;
      alertDiv.style.display = 'block';
      setTimeout(() => alertDiv.style.display = 'none', 3000);
    }

    function openModal(product = null) {
      isEditing = !!product;
      if (product) {
        modalTitle.textContent = 'Edit Barang';
        editIdInput.value = product.id;
        nameInput.value = product.name;
        priceInput.value = product.price ? new Intl.NumberFormat('id-ID').format(product.price) : '';
        categoryInput.value = product.category;
      } else {
        modalTitle.textContent = 'Tambah Barang Baru';
        document.getElementById('productForm').reset();
        editIdInput.value = '';
      }
      formModal.style.display = 'flex';
    }

    function closeModal() {
      formModal.style.display = 'none';
      document.getElementById('productForm').reset();
      editIdInput.value = '';
      isEditing = false;
    }

    function openDeleteModal(id, name) {
      deleteId = id;
      deleteProductName.textContent = name;
      deleteModal.style.display = 'flex';
    }

    function closeDeleteModal() {
      deleteModal.style.display = 'none';
      deleteId = null;
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
                  <button class="btn" onclick="openModal({id:\${p.id}, name:'\${p.name}', price:\${p.price}, category:'\${p.category}'})">Edit</button>
                  <button class="btn btn-danger" onclick="openDeleteModal(\${p.id}, '\${p.name}')">Hapus</button>
                </div>
              </td>
            \`;
            tableBody.appendChild(row);
          });
        })
        .catch(err => showAlert('Gagal memuat produk: ' + err.message, 'error'));
    }

    function submitForm() {
      const name = nameInput.value.trim();
      const rawPrice = priceInput.value.replace(/[^0-9]/g, '');
      const price = parseInt(rawPrice, 10);
      const category = categoryInput.value;

      if (!name || isNaN(price) || !category) {
        showAlert('Mohon lengkapi semua field dengan benar', 'error');
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
          closeModal();
          loadProducts();
        })
        .catch(err => showAlert('Gagal: ' + err.message, 'error'));
    }

    confirmDeleteBtn.addEventListener('click', () => {
      if (!deleteId) return;
      fetch(API_URL + '/products/' + deleteId, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          showAlert(data.message, 'success');
          closeDeleteModal();
          loadProducts();
        })
        .catch(err => showAlert('Gagal menghapus: ' + err.message, 'error'));
    });

    formModal.addEventListener('click', (e) => {
      if (e.target === formModal) closeModal();
    });
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });

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

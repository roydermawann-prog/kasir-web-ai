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
let alertTimeout;

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
  if (alertTimeout) clearTimeout(alertTimeout);
  alertDiv.textContent = message;
  alertDiv.className = 'alert ' + type;
  alertDiv.style.display = 'block';
  alertTimeout = setTimeout(() => alertDiv.style.display = 'none', 3000);
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
      } else {
        data.forEach(p => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>Rp ${Number(p.price).toLocaleString('id-ID')}</td>
            <td>${p.category}</td>
            <td>${new Date(p.created_at).toLocaleDateString('id-ID')}</td>
            <td>
              <div class="action-btns">
                <button class="btn" onclick="openModal({id:${p.id}, name:'${p.name}', price:${p.price}, category:'${p.category}'})">Edit</button>
                <button class="btn btn-danger" onclick="openDeleteModal(${p.id}, '${p.name}')">Hapus</button>
              </div>
            </td>
          `;
          tableBody.appendChild(row);
        });
      }
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

// Initial load
loadProducts();

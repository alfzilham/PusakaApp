// =================================================================
// PUSAKA — App Logic
// =================================================================
// Data model per peserta:
// { id, nama, status: 'belum' | 'hadir' | 'tidak-hadir', alasan, updatedAt }
//
// Setiap kategori (laki-laki / perempuan) punya storage key sendiri,
// sehingga datanya benar-benar terpisah. Disimpan di shared storage
// agar semua orang yang membuka link yang sama melihat data yang sama.
// =================================================================

let currentCategory = null; // 'laki-laki' | 'perempuan'
let participants = [];
let currentView = 'home';
let searchQuery = '';
let activeParticipantId = null; // untuk form modal
let pendingStatus = null;       // pilihan sementara di form modal

// -----------------------------------------------------------------
// API helpers (Vercel Serverless Functions + Neon Postgres)
// -----------------------------------------------------------------
async function apiGetParticipants(kategori) {
  const res = await fetch(`/api/participants?kategori=${encodeURIComponent(kategori)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal memuat data (HTTP ${res.status}).`);
  return data.participants || [];
}

async function apiImport(entries) {
  const res = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal import data (HTTP ${res.status}).`);
  return data;
}

async function apiUpload(participantId, imageBase64, mimeType) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, imageBase64, mimeType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal upload gambar (HTTP ${res.status}).`);
  return data;
}

async function apiUpdateAttendance(id, status, alasan, buktiTransferUrl, buktiDikonfirmasi) {
  const res = await fetch('/api/attendance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, alasan, buktiTransferUrl, buktiDikonfirmasi }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal menyimpan jawaban (HTTP ${res.status}).`);
  return data.participant;
}

async function apiDeleteCategory(kategori) {
  const res = await fetch(`/api/participants?kategori=${encodeURIComponent(kategori)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal menghapus data (HTTP ${res.status}).`);
  return true;
}

async function loadParticipants() {
  try {
    participants = await apiGetParticipants(currentCategory);
  } catch (err) {
    console.error('Pusaka: gagal memuat data peserta', err);
    participants = [];
    showToast(err.message || 'Gagal memuat data dari server.', 'error');
  }
}

// -----------------------------------------------------------------
// DOM refs
// -----------------------------------------------------------------
const el = (id) => document.getElementById(id);

const onboarding = el('onboarding');
const appShell = el('appShell');
const pickLakiBtn = el('pickLakiBtn');
const pickPerempuanBtn = el('pickPerempuanBtn');
const categoryBadge = el('categoryBadge');
const switchCategoryBtn = el('switchCategoryBtn');

const menuBtn = el('menuBtn');
const sidebar = el('sidebar');
const sidebarOverlay = el('sidebarOverlay');
const sidebarCloseBtn = el('sidebarCloseBtn');

const searchToggleBtn = el('searchToggleBtn');
const searchBar = el('searchBar');
const searchInput = el('searchInput');
const searchClearBtn = el('searchClearBtn');

const loadingOverlay = el('loadingOverlay');
const toast = el('toast');
const toastMessage = el('toastMessage');

const excelFileInput = el('excelFileInput');
const importExcelBtn = el('importExcelBtn');
const emptyImportBtn = el('emptyImportBtn');

const formModalOverlay = el('formModalOverlay');
const formParticipantName = el('formParticipantName');
const reasonField = el('reasonField');
const reasonInput = el('reasonInput');
const formSaveBtn = el('formSaveBtn');
const formCancelBtn = el('formCancelBtn');
const formCloseBtn = el('formCloseBtn');

const buktiField = el('buktiField');
const uploadArea = el('uploadArea');
const buktiInput = el('buktiInput');
const uploadPreview = el('uploadPreview');
const previewImage = el('previewImage');
const uploadRemoveBtn = el('uploadRemoveBtn');
const konfirmasiCheckbox = el('konfirmasiCheckbox');

const downloadMenuBtn = el('downloadMenuBtn');
const downloadModalOverlay = el('downloadModalOverlay');
const downloadCloseBtn = el('downloadCloseBtn');

const resetDataBtn = el('resetDataBtn');
const confirmModalOverlay = el('confirmModalOverlay');
const confirmTitle = el('confirmTitle');
const confirmText = el('confirmText');
const confirmCancelBtn = el('confirmCancelBtn');
const confirmOkBtn = el('confirmOkBtn');

// -----------------------------------------------------------------
// Onboarding / Category selection
// -----------------------------------------------------------------
function categoryLabel(cat) {
  return cat === 'laki-laki' ? 'Laki-laki' : 'Perempuan';
}

async function enterCategory(category) {
  currentCategory = category;
  categoryBadge.textContent = categoryLabel(category);
  el('emptyState').querySelector('p').textContent =
    `Belum ada data peserta ${categoryLabel(category).toLowerCase()}.`;

  onboarding.classList.add('hidden');
  appShell.classList.remove('hidden');

  setLoading(true);
  await loadParticipants();
  setLoading(false);
  setView('home');
}

function showOnboarding() {
  appShell.classList.add('hidden');
  onboarding.classList.remove('hidden');
  closeSidebar();
}

pickLakiBtn.addEventListener('click', () => enterCategory('laki-laki'));
pickPerempuanBtn.addEventListener('click', () => enterCategory('perempuan'));
switchCategoryBtn.addEventListener('click', showOnboarding);

// -----------------------------------------------------------------
// Sidebar
// -----------------------------------------------------------------
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}
menuBtn.addEventListener('click', openSidebar);
sidebarCloseBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

document.querySelectorAll('.sidebar-link[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setView(btn.dataset.view);
    closeSidebar();
  });
});

// -----------------------------------------------------------------
// View switching
// -----------------------------------------------------------------
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  el('view-' + view).classList.remove('hidden');

  document.querySelectorAll('.sidebar-link[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  render();
}

// -----------------------------------------------------------------
// Search bar
// -----------------------------------------------------------------
let searchOpen = false;
searchToggleBtn.addEventListener('click', () => {
  searchOpen = !searchOpen;
  searchBar.classList.toggle('open', searchOpen);
  if (searchOpen) {
    setTimeout(() => searchInput.focus(), 150);
  } else {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.remove('show');
    render();
  }
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClearBtn.classList.toggle('show', searchQuery.length > 0);
  render();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClearBtn.classList.remove('show');
  searchInput.focus();
  render();
});

// -----------------------------------------------------------------
// Toast
// -----------------------------------------------------------------
let toastTimer = null;
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.querySelector('i').className = type === 'success'
    ? 'bi bi-check-circle-fill'
    : 'bi bi-exclamation-circle-fill';
  toast.classList.toggle('toast-error', type === 'error');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  const duration = type === 'error' ? Math.min(7000, 2400 + message.length * 40) : 2400;
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// -----------------------------------------------------------------
// Loading overlay
// -----------------------------------------------------------------
function setLoading(isLoading) {
  loadingOverlay.classList.toggle('hidden', !isLoading);
}

// -----------------------------------------------------------------
// Excel Import
// -----------------------------------------------------------------
importExcelBtn.addEventListener('click', () => {
  excelFileInput.click();
  closeSidebar();
});
emptyImportBtn.addEventListener('click', () => excelFileInput.click());

excelFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validasi awal: pastikan library SheetJS sudah termuat
  if (typeof XLSX === 'undefined') {
    showToast('Gagal memuat library Excel. Cek koneksi internet lalu coba lagi.', 'error');
    excelFileInput.value = '';
    return;
  }

  setLoading(true);
  try {
    // --- 1. Baca file Excel ---
    let workbook;
    try {
      const data = await file.arrayBuffer();
      workbook = XLSX.read(data, { type: 'array' });
    } catch (parseErr) {
      throw new Error('File tidak terbaca sebagai Excel. Pastikan file berformat .xlsx atau .xls dan tidak rusak.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('File Excel tidak memiliki sheet/tab data.');
    }
    const firstSheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (!rows || rows.length === 0) {
      throw new Error('Sheet pertama kosong, tidak ada baris data.');
    }

    // --- 2. Susun entries dari baris Excel (Nama, Jenis Kelamin) ---
    const entries = [];
    let skippedNoGender = 0;

    rows.forEach((row, idx) => {
      const rawName = (row[0] ?? '').toString().trim();
      const rawGender = (row[1] ?? '').toString().trim().toLowerCase();
      if (!rawName) return;
      if (idx === 0 && rawName.toLowerCase() === 'nama') return; // skip header

      const isLaki = rawGender.startsWith('l') || rawGender.includes('laki');
      const isPerempuan = rawGender.startsWith('p') || rawGender.includes('perempuan') || rawGender.includes('wanita');

      if (!isLaki && !isPerempuan) {
        skippedNoGender++;
        return;
      }

      entries.push({ nama: rawName, kategori: isLaki ? 'laki-laki' : 'perempuan' });
    });

    if (entries.length === 0) {
      throw new Error(`Tidak ada baris yang berhasil dibaca. ${skippedNoGender} baris dilewati karena kolom kedua (Jenis Kelamin) kosong atau bukan "Laki-laki"/"Perempuan". Pastikan kolom A = Nama, kolom B = Jenis Kelamin.`);
    }

    // --- 3. Kirim ke server, deduplikasi nama ditangani database ---
    const result = await apiImport(entries);

    // --- 4. Refresh tampilan kategori yang sedang aktif ---
    await loadParticipants();
    render();

    const parts = [];
    if (result.addedLaki > 0) parts.push(`${result.addedLaki} laki-laki`);
    if (result.addedPerempuan > 0) parts.push(`${result.addedPerempuan} perempuan`);
    let msg = parts.length > 0 ? `Ditambahkan: ${parts.join(', ')}` : 'Tidak ada nama baru ditemukan (mungkin sudah pernah diimport)';
    if (skippedNoGender > 0) msg += `. ${skippedNoGender} baris dilewati (jenis kelamin tidak dikenali)`;
    showToast(msg);
  } catch (err) {
    console.error('Pusaka import error:', err);
    showToast((err && err.message) || 'Gagal membaca file Excel', 'error');
  } finally {
    setLoading(false);
    excelFileInput.value = '';
  }
});

// -----------------------------------------------------------------
// Form Modal (Isi Kehadiran)
// -----------------------------------------------------------------
let pendingBuktiBase64 = null;
let pendingBuktiMime = null;

function resetBuktiField() {
  pendingBuktiBase64 = null;
  pendingBuktiMime = null;
  buktiInput.value = '';
  uploadPreview.classList.add('hidden');
  uploadArea.classList.remove('hidden');
  previewImage.src = '';
  konfirmasiCheckbox.checked = false;
}

function openFormModal(participantId) {
  activeParticipantId = participantId;
  const p = participants.find((x) => x.id === participantId);
  if (!p) return;

  pendingStatus = p.status === 'belum' ? null : p.status;
  formParticipantName.textContent = p.nama;
  reasonInput.value = p.alasan || '';
  resetBuktiField();

  updateChoiceUI();
  formModalOverlay.classList.add('open');
}

function closeFormModal() {
  formModalOverlay.classList.remove('open');
  activeParticipantId = null;
  pendingStatus = null;
  resetBuktiField();
}

function updateSubmitBtnState() {
  if (!pendingStatus) {
    formSaveBtn.disabled = true;
    return;
  }
  if (pendingStatus === 'tidak-hadir') {
    formSaveBtn.disabled = false;
    return;
  }
  // Status hadir: harus ada gambar + checkbox
  formSaveBtn.disabled = !(pendingBuktiBase64 && konfirmasiCheckbox.checked);
}

function updateChoiceUI() {
  document.querySelectorAll('.choice-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.status === pendingStatus);
  });
  reasonField.classList.toggle('hidden', pendingStatus !== 'tidak-hadir');
  buktiField.classList.toggle('hidden', pendingStatus !== 'hadir');
  if (pendingStatus !== 'hadir') resetBuktiField();
  updateSubmitBtnState();
}

document.querySelectorAll('.choice-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    pendingStatus = btn.dataset.status;
    updateChoiceUI();
  });
});

// --- Upload gambar dengan kompresi Canvas API ---
uploadArea.addEventListener('click', () => buktiInput.click());

buktiInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const result = await compressImage(file);
    pendingBuktiBase64 = result.base64;
    pendingBuktiMime = result.mimeType;
    previewImage.src = `data:${result.mimeType};base64,${result.base64}`;
    uploadArea.classList.add('hidden');
    uploadPreview.classList.remove('hidden');
    updateSubmitBtnState();
  } catch (err) {
    console.error('Pusaka: gagal kompres gambar', err);
    showToast('Gagal membaca gambar. Coba file lain.', 'error');
  }
});

uploadRemoveBtn.addEventListener('click', () => {
  resetBuktiField();
  updateSubmitBtnState();
});

konfirmasiCheckbox.addEventListener('change', updateSubmitBtnState);

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Resize maks 1200px di sisi terpanjang
        let w = img.width;
        let h = img.height;
        const MAX = 1200;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const mimeType = file.type || 'image/jpeg';
        const quality = 0.7;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1];

        resolve({ base64, mimeType });
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

formSaveBtn.addEventListener('click', async () => {
  const p = participants.find((x) => x.id === activeParticipantId);
  if (!p || !pendingStatus) return;

  setLoading(true);
  try {
    let buktiTransferUrl = '';

    if (pendingStatus === 'hadir') {
      // Upload gambar dulu ke Vercel Blob
      const uploadResult = await apiUpload(p.id, pendingBuktiBase64, pendingBuktiMime);
      buktiTransferUrl = uploadResult.url;
    }

    const alasanToSave = pendingStatus === 'tidak-hadir' ? reasonInput.value.trim() : '';

    const updated = await apiUpdateAttendance(
      p.id,
      pendingStatus,
      alasanToSave,
      buktiTransferUrl,
      pendingStatus === 'hadir'
    );

    p.status = updated.status;
    p.alasan = updated.alasan;
    p.updatedAt = updated.updatedAt;
    p.buktiTransferUrl = updated.buktiTransferUrl;
    p.buktiDikonfirmasi = updated.buktiDikonfirmasi;

    closeFormModal();
    render();
    showToast('Jawaban tersimpan');
  } catch (err) {
    console.error('Pusaka: gagal menyimpan jawaban', err);
    showToast(err.message || 'Gagal menyimpan jawaban ke server.', 'error');
  } finally {
    setLoading(false);
  }
});

formCancelBtn.addEventListener('click', closeFormModal);
formCloseBtn.addEventListener('click', closeFormModal);
formModalOverlay.addEventListener('click', (e) => {
  if (e.target === formModalOverlay) closeFormModal();
});

// -----------------------------------------------------------------
// Download Modal
// -----------------------------------------------------------------
downloadMenuBtn.addEventListener('click', () => {
  downloadModalOverlay.classList.add('open');
  closeSidebar();
});
downloadCloseBtn.addEventListener('click', () => downloadModalOverlay.classList.remove('open'));
downloadModalOverlay.addEventListener('click', (e) => {
  if (e.target === downloadModalOverlay) downloadModalOverlay.classList.remove('open');
});

document.querySelectorAll('.download-option').forEach((btn) => {
  btn.addEventListener('click', () => {
    const format = btn.dataset.format;
    downloadModalOverlay.classList.remove('open');
    if (format === 'xlsx') downloadXlsx();
    if (format === 'pdf') downloadPdf();
    if (format === 'json') downloadJson();
  });
});

function statusLabel(status) {
  if (status === 'hadir') return 'Hadir';
  if (status === 'tidak-hadir') return 'Tidak Hadir';
  return 'Belum Mengisi';
}

function getSortedParticipants() {
  return [...participants].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

function downloadXlsx() {
  const rows = getSortedParticipants().map((p, i) => ({
    No: i + 1,
    Nama: p.nama,
    Status: statusLabel(p.status),
    Alasan: p.alasan || '',
    'Bukti Transfer': p.buktiTransferUrl || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 16 }, { wch: 40 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Presensi ${categoryLabel(currentCategory)}`);
  XLSX.writeFile(wb, `Pusaka-${categoryLabel(currentCategory)}-${dateStamp()}.xlsx`);
  showToast('File Excel diunduh');
}

function downloadPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Pusaka — Daftar Presensi ${categoryLabel(currentCategory)}`, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Diunduh pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 25);

  const rows = getSortedParticipants().map((p, i) => [
    i + 1,
    p.nama,
    statusLabel(p.status),
    p.alasan || '-',
    p.buktiTransferUrl || '-',
  ]);

  doc.autoTable({
    head: [['No', 'Nama', 'Status', 'Alasan', 'Bukti Transfer']],
    body: rows,
    startY: 32,
    headStyles: { fillColor: [140, 140, 140] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 22 }, 4: { cellWidth: 50 } },
  });

  doc.save(`Pusaka-${categoryLabel(currentCategory)}-${dateStamp()}.pdf`);
  showToast('File PDF diunduh');
}

function downloadJson() {
  const payload = {
    kategori: categoryLabel(currentCategory),
    exportedAt: new Date().toISOString(),
    total: participants.length,
    participants: getSortedParticipants().map((p) => ({
      ...p,
      statusLabel: statusLabel(p.status),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Pusaka-${categoryLabel(currentCategory)}-${dateStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('File JSON diunduh');
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// -----------------------------------------------------------------
// Reset Data
// -----------------------------------------------------------------
resetDataBtn.addEventListener('click', () => {
  closeSidebar();
  confirmTitle.textContent = `Hapus data ${categoryLabel(currentCategory).toLowerCase()}?`;
  confirmText.textContent = `Seluruh daftar peserta dan jawaban presensi kategori ${categoryLabel(currentCategory).toLowerCase()} akan dihapus permanen untuk semua orang. Tindakan ini tidak bisa dibatalkan.`;
  confirmModalOverlay.classList.add('open');
});

confirmCancelBtn.addEventListener('click', () => confirmModalOverlay.classList.remove('open'));
confirmModalOverlay.addEventListener('click', (e) => {
  if (e.target === confirmModalOverlay) confirmModalOverlay.classList.remove('open');
});

confirmOkBtn.addEventListener('click', async () => {
  setLoading(true);
  try {
    await apiDeleteCategory(currentCategory);
    participants = [];
    render();
    showToast(`Data ${categoryLabel(currentCategory).toLowerCase()} telah dihapus`);
  } catch (err) {
    console.error('Pusaka: gagal menghapus data', err);
    showToast(err.message || 'Gagal menghapus data di server.', 'error');
  } finally {
    setLoading(false);
    confirmModalOverlay.classList.remove('open');
  }
});

// -----------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------
function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function matchesSearch(p) {
  if (!searchQuery) return true;
  return p.nama.toLowerCase().includes(searchQuery);
}

function renderCard(p) {
  const card = document.createElement('button');
  card.className = 'participant-card';
  card.addEventListener('click', () => openFormModal(p.id));

  const pill = p.status === 'belum'
    ? `<span class="status-pill belum"><i class="bi bi-clock-history"></i>Belum</span>`
    : p.status === 'hadir'
      ? `<span class="status-pill hadir"><i class="bi bi-check-circle"></i>Hadir</span>`
      : `<span class="status-pill tidak-hadir"><i class="bi bi-x-circle"></i>Tidak Hadir</span>`;

  const reasonHtml = p.status === 'tidak-hadir' && p.alasan
    ? `<span class="p-reason">${escapeHtml(p.alasan)}</span>`
    : '';

  const buktiHtml = p.status === 'hadir' && p.buktiTransferUrl
    ? `<span class="p-bukti"><i class="bi bi-image"></i> Bukti transfer</span>`
    : '';

  card.innerHTML = `
    <span class="avatar-initial">${initials(p.nama)}</span>
    <span class="p-info">
      <span class="p-name">${escapeHtml(p.nama)}</span>
      ${reasonHtml}
      ${buktiHtml}
    </span>
    ${pill}
    <i class="bi bi-chevron-right p-chevron"></i>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const total = participants.length;
  const hadirArr = participants.filter((p) => p.status === 'hadir');
  const tidakArr = participants.filter((p) => p.status === 'tidak-hadir');
  const belumArr = participants.filter((p) => p.status === 'belum');

  el('statTotal').textContent = total;
  el('statHadir').textContent = hadirArr.length;
  el('statTidakHadir').textContent = tidakArr.length;
  el('statBelum').textContent = belumArr.length;

  if (currentView === 'home') {
    el('emptyState').classList.toggle('hidden', total > 0);
    const filtered = getSortedParticipants().filter(matchesSearch);
    const list = el('participantList');
    list.innerHTML = '';
    filtered.forEach((p) => list.appendChild(renderCard(p)));
  }

  if (currentView === 'hadir') {
    const filtered = [...hadirArr].sort((a, b) => a.nama.localeCompare(b.nama, 'id')).filter(matchesSearch);
    el('hadirCount').textContent = hadirArr.length;
    el('emptyHadir').classList.toggle('hidden', hadirArr.length > 0);
    const list = el('hadirList');
    list.innerHTML = '';
    filtered.forEach((p) => list.appendChild(renderCard(p)));
  }

  if (currentView === 'tidak-hadir') {
    const filtered = [...tidakArr].sort((a, b) => a.nama.localeCompare(b.nama, 'id')).filter(matchesSearch);
    el('tidakHadirCount').textContent = tidakArr.length;
    el('emptyTidakHadir').classList.toggle('hidden', tidakArr.length > 0);
    const list = el('tidakHadirList');
    list.innerHTML = '';
    filtered.forEach((p) => list.appendChild(renderCard(p)));
  }

  if (currentView === 'belum-isi') {
    const filtered = [...belumArr].sort((a, b) => a.nama.localeCompare(b.nama, 'id')).filter(matchesSearch);
    el('belumCount').textContent = belumArr.length;
    el('emptyBelum').classList.toggle('hidden', belumArr.length > 0);
    const list = el('belumList');
    list.innerHTML = '';
    filtered.forEach((p) => list.appendChild(renderCard(p)));
  }
}

// -----------------------------------------------------------------
// Init
// -----------------------------------------------------------------
function init() {
  // Selalu mulai dari onboarding — kategori tidak diingat antar sesi.
  appShell.classList.add('hidden');
  onboarding.classList.remove('hidden');
}

init();

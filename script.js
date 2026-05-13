  let currentType = 'keluar';
  let recentItems = [];
  const REQUEST_INTERVAL_MS = 10000; // 1 request per 10 detik
  let lastRequestTimestamp = Date.now() - REQUEST_INTERVAL_MS; // Allow immediate first submit

  function canSendRequest() {
    const now = Date.now();
    if (now - lastRequestTimestamp < REQUEST_INTERVAL_MS) {
      const remainingSeconds = Math.ceil((REQUEST_INTERVAL_MS - (now - lastRequestTimestamp)) / 1000);
      showToast(`Tunggu ${remainingSeconds} detik sebelum mengirim lagi`, 'error');
      return false;
    }
    lastRequestTimestamp = now;
    return true;
  }

  // Init tes
  function getTodayInGMT7() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt7 = new Date(utc + 7 * 60 * 60 * 1000);
    return gmt7.toISOString().split('T')[0];
  }

  const today = getTodayInGMT7();
  document.getElementById('fTanggal').value = today;

  const defaultUrl = 'https://script.google.com/macros/s/AKfycbxJrGMd9oJe8ZX2hiZc4UQ3CN1Z8rT0RYM3Ek5l9Ld326BeuhfG-99PKY9Dw8AGXQWM/exec';
  const savedUrl = localStorage.getItem('kas_script_url') || defaultUrl;
  document.getElementById('scriptUrl').value = savedUrl;
  document.getElementById('statusDot').classList.add('connected');
  document.getElementById('fTanggal').max = today;
  setType(currentType);

  function onUrlChange() {
    const v = document.getElementById('scriptUrl').value.trim();
    document.getElementById('statusDot').classList.toggle('connected', v.length > 10);
  }

  function validateTanggal() {
    const tanggalInput = document.getElementById('fTanggal');
    if (tanggalInput.value > today) {
      showToast('Tanggal tidak boleh lebih dari hari ini', 'error');
      tanggalInput.value = today;
      return false;
    }
    return true;
  }

  function saveUrl() {
    const url = document.getElementById('scriptUrl').value.trim();
    if (url) {
      localStorage.setItem('kas_script_url', url);
      showToast('URL tersimpan ✓', 'success');
      loadMonthlyData();
    } else {
      showToast('URL kosong!', 'error');
    }
  }

  function setType(t) {
    currentType = t;
    document.getElementById('btnMasuk').classList.toggle('active', t === 'masuk');
    document.getElementById('btnKeluar').classList.toggle('active', t === 'keluar');
  }

  function resetForm() {
    document.getElementById('fNo').value = '';
    document.getElementById('fTanggal').value = today;
    document.getElementById('fUraian').value = '';
    document.getElementById('fJenis').value = '';
    document.getElementById('fNominal').value = '';
    setType('keluar');
  }

  function formatRp(n) {
    return 'Rp\u00A0' + Number(n).toLocaleString('id-ID');
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.className = 'toast', 3000);
  }

  function addRecent(data) {
    recentItems.unshift(data);
    if (recentItems.length > 5) recentItems.pop();
    const sec = document.getElementById('recentSection');
    sec.style.display = 'block';
    document.getElementById('recentList').innerHTML = recentItems.map(d => `
      <div class="recent-item">
        <span class="badge ${d.type === 'masuk' ? 'badge-masuk' : 'badge-keluar'}">${d.type === 'masuk' ? '↓ MASUK' : '↑ KELUAR'}</span>
        <span class="recent-uraian">${d.uraian}</span>
        <span class="recent-date">${d.tanggal}</span>
        <span class="recent-nominal ${d.type === 'masuk' ? 'nominal-masuk' : 'nominal-keluar'}">${formatRp(d.nominal)}</span>
      </div>
    `).join('');
  }

  function parseIsoDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function isCurrentMonth(value) {
    const d = parseIsoDate(value);
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function renderMonthlyData(items) {
    const section = document.getElementById('monthSection');
    const list = document.getElementById('monthList');
    const summary = document.getElementById('monthSummary');

    section.style.display = 'block';
    if (!items.length) {
      summary.innerHTML = '';
      list.innerHTML = '<div class="recent-item" style="justify-content:center;color:var(--muted);">Tidak ada data bulan ini.</div>';
      setMonthLoading(false, 'Tidak ada data bulan ini');
      return;
    }

    const masukTotal = items.reduce((sum, item) => sum + Number(item.masuk || (item.type === 'masuk' ? item.nominal : 0) || 0), 0);
    const keluarTotal = items.reduce((sum, item) => sum + Number(item.keluar || (item.type === 'keluar' ? item.nominal : 0) || 0), 0);

    summary.innerHTML = `
      <div class="recent-item" style="justify-content:space-between;gap:10px;font-weight:600;">
        <span>${items.length} catatan bulan ini</span>
        <span class="summary-values"><span class="summary-value masuk">${formatRp(masukTotal)}</span> / <span class="summary-value keluar">${formatRp(keluarTotal)}</span></span>
      </div>
    `;

    list.innerHTML = items.map(row => `
      <div class="recent-item">
        <span class="recent-date">${row.tanggal || '-'}</span>
        <span class="badge ${row.type === 'masuk' ? 'badge-masuk' : 'badge-keluar'}">
          ${row.jenis || (row.type === 'masuk' ? '↓ MASUK' : '↑ KELUAR')}
        </span>
        <span class="recent-uraian">${row.uraian || '-'}</span>
        <span class="recent-nominal ${row.type === 'masuk' ? 'nominal-masuk' : 'nominal-keluar'}">
          ${formatRp(row.nominal || row.masuk || row.keluar || 0)}
        </span>
      </div>
    `).join('');
  }

  function setMonthLoading(isLoading, message = 'Memuat...') {
    const section = document.getElementById('monthSection');
    const loader = document.getElementById('monthLoader');
    const debugText = document.getElementById('monthDebugText');
    section.style.display = 'block';
    loader.style.visibility = isLoading ? 'visible' : 'hidden';
    debugText.textContent = message;
  }

  async function loadMonthlyData() {
    const scriptUrl = document.getElementById('scriptUrl').value.trim();
    if (!scriptUrl) return;

    setMonthLoading(true, 'Memuat data bulan ini...');
    try {
      const res = await fetch(scriptUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      setMonthLoading(false, `Response status=${json.status} rows=${data.length}`);
      if (json.status !== 'ok') {
        throw new Error(json.message || 'Data bulan ini tidak tersedia');
      }

      const monthly = data.map(item => ({
        uraian: item.uraian || item.keterangan || item.Uraian || '',
        tanggal: item.tanggal || item.date || item.Tanggal || '',
        jenis: item.jenis || item.Jenis || item.kategori || item.Kategori || item.category || item.Category || '',
        type: item.masuk && Number(item.masuk) > 0 ? 'masuk' : 'keluar',
        nominal: item.masuk || item.keluar || item.total || item.nominal || 0,
        masuk: item.masuk || 0,
        keluar: item.keluar || 0,
      }));

      renderMonthlyData(monthly);
    } catch (e) {
      console.warn('Gagal memuat data bulan ini', e);
      const section = document.getElementById('monthSection');
      const list = document.getElementById('monthList');
      const summary = document.getElementById('monthSummary');
      section.style.display = 'block';
      summary.innerHTML = '';
      setMonthLoading(false, `Error: ${e.message}`);
      list.innerHTML = '<div class="recent-item" style="justify-content:center;color:var(--muted);">Tidak dapat memuat data bulan ini.</div>';
    }
  }

  async function submitData() {
    if (!canSendRequest()) return;

    const scriptUrl = document.getElementById('scriptUrl').value.trim();
    const no = document.getElementById('fNo').value.trim();
    const tanggal = document.getElementById('fTanggal').value;
    const uraian = document.getElementById('fUraian').value.trim();
    const jenis = document.getElementById('fJenis').value;
    const nominal = document.getElementById('fNominal').value;

    if (!tanggal || !uraian || !jenis || !nominal) {
      showToast('Lengkapi semua field dulu!', 'error'); return;
    }
    if (!validateTanggal()) {
      return;
    }
    if (!scriptUrl) {
      showToast('Isi URL Apps Script dulu', 'error'); return;
    }

    const btn = document.getElementById('btnSubmit');
    const lbl = document.getElementById('btnLabel');
    const spin = document.getElementById('spinner');
    btn.disabled = true;
    lbl.textContent = 'Menyimpan…';
    spin.style.display = 'block';

    const payload = {
      no: no || 'auto', tanggal, uraian, jenis,
      type: currentType,
      masuk: currentType === 'masuk' ? nominal : '',
      keluar: currentType === 'keluar' ? nominal : '',
      nominal
    };

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = await res.json();
      if (json.status === 'ok') {
        showToast('Tersimpan ke Google Sheets ✓', 'success');
        addRecent({ tanggal, uraian, type: currentType, nominal });
        resetForm();
        loadMonthlyData();
      } else {
        showToast('Gagal: ' + (json.message || 'Error'), 'error');
      }
    } catch(e) {
      console.warn('Submit failed', e);
      showToast('Koneksi gagal — cek URL & CORS', 'error');
    }

    btn.disabled = false;
    lbl.textContent = 'Simpan ke Sheets';
    spin.style.display = 'none';
  }

// Load otomatis saat halaman dibuka
window.addEventListener('load', () => {
  setTimeout(loadMonthlyData, 500);
});

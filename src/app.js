const titles = {
    overview:  ["Tổng quan", "Toàn cảnh hoạt động chuỗi cung ứng hôm nay"],
    raw:       ["Vùng nguyên liệu", "Thu mua và kiểm tra dừa thô đầu vào"],
    ncc:       ["Nhà cung cấp", "Quản lý nhà cung cấp, tra cứu đơn đặt hàng và đánh giá"],
    factory:   ["Xưởng Ba Phi", "Tiến độ và thời gian xử lý theo lô hàng"],
    qc:        ["Đánh giá chất lượng", "Kiểm tra chất lượng lô hàng xuất khẩu: dừa, chanh, thanh long"],
    logistics: ["Logistics", "Theo dõi hành trình và vị trí lô hàng"],
    docs:      ["Chứng từ", "Checklist chứng từ theo từng lô hàng"],
    feedback:  ["Feedback khách hàng", "Ghi nhận và xử lý phản hồi theo lô hàng"],
    users:     ["Quản lý tài khoản", "Gán vai trò cho tài khoản đăng nhập"]
  };

  function goTab(tab){
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === 'tab-' + tab));
    document.getElementById('page-title').textContent = titles[tab][0];
    document.getElementById('page-sub').textContent = titles[tab][1];
    window.scrollTo({top:0, behavior:'smooth'});
  }

  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> goTab(btn.dataset.tab));
  });

  (function(){
    const el = document.getElementById('topbar-date');
    if(el) el.textContent = fmtDate(todayStr());
  })();

  document.querySelectorAll('.subtab-bar').forEach(function(bar){
    const btns = bar.querySelectorAll('.subtab-item');
    const panels = bar.parentElement.querySelectorAll(':scope > .subtab-panel');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        btns.forEach(function(b){ b.classList.toggle('active', b === btn); });
        panels.forEach(function(p){ p.classList.toggle('active', p.id === 'subtab-' + btn.dataset.subtab); });
      });
    });
  });

  const SUPABASE_URL = 'https://ickyibgaxczypuxzpuun.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_9FLlPV6d0aFcX-m-wmKK5w_Qdc4V_0h';
  const sb = (typeof supabase !== 'undefined')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
  if(!sb) console.error('Supabase SDK chưa được tải.');

  // Client Supabase "phụ", tách phiên riêng (storageKey khác + không lưu vào
  // localStorage) — chỉ dùng để admin tạo tài khoản mới qua signUp(). Nếu
  // dùng chung với `sb` thì signUp() sẽ ghi đè phiên đăng nhập hiện tại của
  // admin bằng phiên của tài khoản vừa tạo, tự động đăng xuất admin ngay
  // giữa lúc đang thao tác — client phụ này tránh hoàn toàn việc đó.
  const sbCreateUser = (typeof supabase !== 'undefined')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { storageKey: 'fadoagri-admin-create-user', persistSession: false, autoRefreshToken: false }
      })
    : null;

  // ---- Đăng nhập + phân quyền theo vai trò ----
  // Ẩn toàn bộ app (.gated) cho tới khi xác nhận có phiên đăng nhập hợp lệ VÀ
  // tài khoản đó đã được admin gán role trong bảng profiles. Mỗi module chỉ
  // được thêm/sửa/xóa nếu role khớp — chặn thật nằm ở RLS Supabase (file
  // supabase/2026-07-21_auth_roles.sql), phần dưới đây chỉ là lớp UX
  // (ẩn nút) cho khớp với những gì server sẽ cho phép.
  let currentUser = null;

  const ROLE_LABELS = {
    admin: 'Admin',
    san_xuat: 'Quản lý sản xuất',
    ncc: 'Quản lý NCC',
    qc: 'QC',
    xuat_khau: 'Xuất khẩu'
  };
  // Module (theo id section, không phải data-tab) ứng với module_key trong
  // bảng public.module_permissions — quyền ghi thật do RLS quyết định (xem
  // supabase/2026-07-22_dynamic_permissions.sql), map này chỉ để UI biết ẩn/
  // hiện nút cho khớp với những gì server sẽ cho phép.
  const SECTION_MODULE_KEY = {
    'tab-raw': 'vung_nguyen_lieu',
    'tab-ncc': 'nha_cung_cap',
    'tab-factory': 'xuong_ba_phi',
    'tab-qc': 'danh_gia_chat_luong',
    'tab-logistics': 'logistics',
    'tab-docs': 'chung_tu',
    'tab-feedback': 'feedback_kh'
  };
  const ALL_MODULE_SECTIONS = Object.keys(SECTION_MODULE_KEY);

  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('form-login');
  const loginError = document.getElementById('login-error');
  const loginSubmitBtn = document.getElementById('btn-submit-login');
  const currentUserName = document.getElementById('current-user-name');
  const currentUserRole = document.getElementById('current-user-role');
  const logoutBtn = document.getElementById('btn-logout');
  const navItemUsers = document.getElementById('nav-item-users');

  function setAppVisible(visible){
    // Chọn theo .sidebar/.main (cố định) chứ không phải .gated (là class sẽ
    // bị chính hàm này thêm/gỡ) — nếu chọn theo .gated thì sau lần đầu gỡ
    // class đó đi, lần gọi setAppVisible(false) sau (VD: phiên hết hạn) sẽ
    // không tìm lại được phần tử để ẩn lại.
    document.querySelectorAll('.sidebar, .main').forEach(function(el){ el.classList.toggle('gated', !visible); });
    if(loginOverlay) loginOverlay.classList.toggle('active', !visible);
  }

  async function applyRolePermissions(){
    if(!currentUser) return;
    // levels['vung_nguyen_lieu'] = 'edit' | 'view' | 'none'
    let levels = {};
    if(currentUser.role === 'admin'){
      Object.values(SECTION_MODULE_KEY).forEach(function(key){ levels[key] = 'edit'; });
    } else {
      try{
        const { data, error } = await sb.from('module_permissions').select('module_key,access_level').eq('role', currentUser.role);
        if(error) throw error;
        (data || []).forEach(function(r){ levels[r.module_key] = r.access_level; });
      } catch(err){
        console.error('Không tải được ma trận phân quyền:', err && (err.message || JSON.stringify(err)));
      }
    }
    ALL_MODULE_SECTIONS.forEach(function(sectionId){
      const level = levels[SECTION_MODULE_KEY[sectionId]] || 'none';
      const section = document.getElementById(sectionId);
      if(section) section.classList.toggle('readonly-module', level !== 'edit');
      const tabName = sectionId.replace(/^tab-/, '');
      const navBtn = document.querySelector('.nav-item[data-tab="' + tabName + '"]');
      if(navBtn) navBtn.style.display = level === 'none' ? 'none' : '';
    });
    if(navItemUsers) navItemUsers.style.display = currentUser.role === 'admin' ? '' : 'none';
    if(currentUserName) currentUserName.textContent = currentUser.full_name || currentUser.email || '—';
    if(currentUserRole) currentUserRole.textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  }

  async function loadCurrentUserProfile(authUser){
    const { data, error } = await sb.from('profiles').select('*').eq('id', authUser.id).single();
    if(error || !data) return null;
    return data;
  }

  async function handleSession(session){
    if(!session || !session.user){
      currentUser = null;
      setAppVisible(false);
      return;
    }
    const profile = await loadCurrentUserProfile(session.user);
    if(!profile){
      // Đăng nhập được nhưng chưa có trong bảng profiles (chưa được admin
      // gán role) — không cho vào app với quyền không xác định.
      currentUser = null;
      setAppVisible(false);
      if(loginError) loginError.textContent = 'Tài khoản chưa được gán vai trò — liên hệ Admin.';
      await sb.auth.signOut();
      return;
    }
    currentUser = { id: session.user.id, email: session.user.email, full_name: profile.full_name, role: profile.role };
    await applyRolePermissions();
    setAppVisible(true);
  }

  if(sb){
    sb.auth.getSession().then(function(res){ handleSession(res.data && res.data.session); });
    // Chỉ tự xử lý khi bị đăng xuất ngoài ý muốn (phiên hết hạn) — luồng
    // đăng nhập/đăng xuất chủ động đã tự window.location.reload() riêng để
    // các module tải lại dữ liệu với phiên mới, tránh xử lý 2 lần chồng nhau.
    sb.auth.onAuthStateChange(function(event){
      if(event === 'SIGNED_OUT') handleSession(null);
    });
  }

  if(loginForm){
    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(loginError) loginError.textContent = '';
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const originalLabel = loginSubmitBtn.textContent;
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.textContent = 'Đang đăng nhập...';
      try{
        const { error } = await sb.auth.signInWithPassword({ email: email, password: password });
        if(error) throw error;
        // Các module đã tự tải dữ liệu 1 lần lúc trang mới mở (khi chưa có
        // phiên đăng nhập) nên sẽ bị lỗi — tải lại trang để chúng tải lại
        // đúng với phiên vừa đăng nhập, thay vì tự gọi lại từng module.
        window.location.reload();
      } catch(err){
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = originalLabel;
        if(loginError) loginError.textContent = 'Sai email hoặc mật khẩu.';
      }
    });
  }

  if(logoutBtn){
    logoutBtn.addEventListener('click', async function(){
      if(sb) await sb.auth.signOut();
      window.location.reload();
    });
  }

  // Xưởng Ba Phi lấy số lượng/NCC/ngày nhập trực tiếp từ Vùng nguyên liệu —
  // nên khi lô nguyên liệu được thêm/sửa, module Xưởng Ba Phi phải cập nhật
  // theo ngay, không cần tải lại trang.
  const rawBatchesListeners = [];
  function onRawBatchesChanged(cb){ rawBatchesListeners.push(cb); }
  function notifyRawBatchesChanged(){ rawBatchesListeners.forEach(function(cb){ cb(); }); }

  // Tồn kho tổng hợp số lượng thành phẩm từ Sản xuất — nên khi Sản xuất được
  // cập nhật (thành phẩm/hao hụt...), Tồn kho phải đồng bộ theo ngay.
  const factoryProductionListeners = [];
  function onFactoryProductionChanged(cb){ factoryProductionListeners.push(cb); }
  function notifyFactoryProductionChanged(){ factoryProductionListeners.forEach(function(cb){ cb(); }); }

  // Đánh giá chất lượng tổng hợp lô hàng từ NCC (purchase_orders) — nên khi PO
  // được thêm/sửa, bảng tổng hợp QC phải cập nhật theo ngay.
  const purchaseOrdersListeners = [];
  function onPurchaseOrdersChanged(cb){ purchaseOrdersListeners.push(cb); }
  function notifyPurchaseOrdersChanged(){ purchaseOrdersListeners.forEach(function(cb){ cb(); }); }

  // Đánh giá chất lượng là nơi tổng hợp danh sách lô hàng dùng chung (nguồn sự
  // thật duy nhất cho mã lô + sản phẩm). Các module khác (VD: Logistics) tham
  // chiếu qua sharedBatchSummaries thay vì tự nhập lại, để luôn đồng nhất.
  let sharedBatchSummaries = {};
  const batchSummaryListeners = [];
  function onBatchSummaryChanged(cb){ batchSummaryListeners.push(cb); }
  function notifyBatchSummaryChanged(){ batchSummaryListeners.forEach(function(cb){ cb(); }); }

  // Logistics công bố danh sách lô đã ở trạng thái "Khách đã nhận hàng" kèm
  // ngày nhận — Feedback KH dựa vào đây để chọn lô và tính hạn 3 ngày phải
  // có feedback, thay vì cho nhập tay lô hàng dễ lệch dữ liệu.
  let sharedDeliveredShipments = [];
  const deliveredShipmentsListeners = [];
  function onDeliveredShipmentsChanged(cb){ deliveredShipmentsListeners.push(cb); }
  function notifyDeliveredShipmentsChanged(){ deliveredShipmentsListeners.forEach(function(cb){ cb(); }); }

  // Tổng quan gộp số liệu chứng từ/feedback vào khối "Cần xử lý ngay" — nên
  // khi Chứng từ hoặc Feedback KH được thêm/sửa, Tổng quan phải cập nhật
  // theo ngay, không cần tải lại trang.
  const documentsChecklistListeners = [];
  function onDocumentsChecklistChanged(cb){ documentsChecklistListeners.push(cb); }
  function notifyDocumentsChecklistChanged(){ documentsChecklistListeners.forEach(function(cb){ cb(); }); }

  const feedbacksListeners = [];
  function onFeedbacksChanged(cb){ feedbacksListeners.push(cb); }
  function notifyFeedbacksChanged(){ feedbacksListeners.forEach(function(cb){ cb(); }); }

  function fmtDate(value){
    if(!value) return '—';
    const parts = value.split('-');
    if(parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
    return value;
  }
  function addDays(dateStr, days){
    if(!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    if(parts.length !== 3 || parts.some(isNaN)) return null;
    const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }
  function todayStr(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fieldVal(id){
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function numOrNull(s){
    if(s === undefined || s === null || String(s).trim() === '') return null;
    const n = Number(String(s).trim());
    return isNaN(n) ? null : n;
  }

  // ---- Bộ lọc Tháng/Năm dùng chung cho các module có bảng lô hàng ----
  const MONTH_NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  function periodParts(dateStr){
    if(!dateStr || dateStr.length < 7) return null;
    return { year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) };
  }
  // Khoảng [start, end) dạng YYYY-MM-DD dùng cho .gte()/.lt() trên cột date
  // hoặc timestamptz — nếu month rỗng thì lấy cả năm.
  function periodRange(year, month){
    if(month){
      const start = year + '-' + String(month).padStart(2, '0') + '-01';
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      return { start: start, end: endYear + '-' + String(endMonth).padStart(2, '0') + '-01' };
    }
    return { start: year + '-01-01', end: (year + 1) + '-01-01' };
  }
  // Đổ option cho cặp select tháng/năm — years là mảng số năm có dữ liệu
  // (có thể rỗng, khi đó fallback năm hiện tại). Giữ nguyên lựa chọn năm cũ
  // nếu vẫn còn hợp lệ sau khi đổ lại danh sách. Trả về mảng năm đã sắp xếp.
  function populateMonthYearSelect(monthSelect, yearSelect, years){
    if(!monthSelect || !yearSelect) return [];
    const yearSet = {};
    (years || []).forEach(function(y){ if(y) yearSet[y] = true; });
    const nowYear = new Date().getFullYear();
    if(!Object.keys(yearSet).length) yearSet[nowYear] = true;
    const sortedYears = Object.keys(yearSet).map(Number).sort(function(a, b){ return b - a; });

    const prevYearValue = yearSelect.value;
    yearSelect.innerHTML = '';
    sortedYears.forEach(function(y){
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = 'Năm ' + y;
      yearSelect.appendChild(opt);
    });
    yearSelect.value = sortedYears.indexOf(Number(prevYearValue)) !== -1 ? prevYearValue : String(sortedYears[0]);

    if(!monthSelect.options.length){
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'Cả năm';
      monthSelect.appendChild(allOpt);
      MONTH_NAMES.forEach(function(name, i){
        const opt = document.createElement('option');
        opt.value = String(i + 1);
        opt.textContent = 'Tháng ' + (i + 1);
        monthSelect.appendChild(opt);
      });
    }
    return sortedYears;
  }

  // Vẽ 1 vòng tròn phần trăm (donut) nhỏ vào container — dùng cho các KPI
  // dạng tỷ lệ % (VD: Tỷ lệ đạt QC trung bình ở Tổng quan).
  function renderDonut(container, pct, color){
    if(!container) return;
    const size = 54, stroke = 6, r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
    const offset = c - (clamped / 100) * c;
    container.innerHTML =
      '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="' + stroke + '"/>' +
        (pct == null ? '' :
          '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
          '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset +
          '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>') +
      '</svg>';
  }

  // Khởi tạo 1 module CRUD dùng chung (bảng + modal thêm/sửa) — dùng cho các
  // module Nhà cung cấp/PO, Xưởng sản xuất, QC, Logistics, Chứng từ, Feedback.
  function initCrudModule(opts){
    const overlay = document.getElementById(opts.overlayId);
    const openBtn = document.getElementById(opts.openBtnId);
    const closeBtn = document.getElementById(opts.closeBtnId);
    const cancelBtn = document.getElementById(opts.cancelBtnId);
    const form = document.getElementById(opts.formId);
    const tbody = document.getElementById(opts.tbodyId);
    const modalTitle = document.getElementById(opts.modalTitleId);
    const submitBtn = document.getElementById(opts.submitBtnId);

    if(!overlay || !form || !tbody || !sb) return null;

    let editingRow = null;

    function openModal(){ overlay.classList.add('active'); }
    function closeModal(){ overlay.classList.remove('active'); form.reset(); editingRow = null; }

    function openAddModal(){
      editingRow = null;
      form.reset();
      modalTitle.textContent = opts.addTitle;
      submitBtn.textContent = opts.addLabel;
      openModal();
    }
    function openEditModal(tr){
      editingRow = tr;
      opts.fillForm(form, tr);
      modalTitle.textContent = opts.editTitle;
      submitBtn.textContent = opts.editLabel;
      openModal();
    }

    async function deleteRow(tr){
      const id = tr.dataset.id;
      if(!id) return;
      const label = opts.deleteLabel ? (opts.deleteLabel(tr) || 'dòng này') : 'dòng này';
      if(!confirm('Xóa ' + label + '? Hành động không thể hoàn tác.')) return;
      try{
        const { error } = await sb.from(opts.table).delete().eq('id', id);
        if(error) throw error;
        await refreshRows();
        if(opts.afterSave) opts.afterSave();
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    openBtn.addEventListener('click', openAddModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
    tbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){ openEditModal(editBtnEl.closest('tr')); return; }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteRow(delBtnEl.closest('tr')); return; }
    });

    function createRow(d){
      const tr = document.createElement('tr');
      tr.className = 'hoverable';
      for(let i = 0; i < opts.cellCount; i++) tr.appendChild(document.createElement('td'));
      const actionsTd = document.createElement('td');
      actionsTd.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-edit-btn';
      editBtn.setAttribute('aria-label', 'Chỉnh sửa');
      editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
      actionsTd.appendChild(editBtn);
      if(opts.deletable !== false){
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'row-delete-btn';
        deleteBtn.setAttribute('aria-label', 'Xóa');
        deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
        actionsTd.appendChild(deleteBtn);
      }
      tr.appendChild(actionsTd);
      opts.renderRow(tr, d);
      return tr;
    }

    function showMessage(text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = opts.cellCount + 1;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    async function fetchRows(){
      let q = sb.from(opts.table).select('*');
      // dateFilter là hàm trả về {column, start, end} (đọc lại mỗi lần fetch để
      // luôn dùng giá trị select tháng/năm mới nhất) hoặc null nếu chưa lọc.
      const range = opts.dateFilter ? opts.dateFilter() : null;
      if(range) q = q.gte(range.column, range.start).lt(range.column, range.end);
      (opts.orderBy || []).forEach(function(o){ q = q.order(o.column, { ascending: o.ascending }); });
      const { data, error } = await q;
      if(error) throw error;
      return data;
    }

    async function refreshRows(){
      try{
        const rows = await fetchRows();
        // filterForDisplay (tùy chọn): thu hẹp danh sách HIỂN THỊ trong bảng
        // mà không đổi rows gốc truyền cho afterRender — dùng khi module cần
        // giữ toàn bộ rows cho state dùng chung (VD: Logistics/sharedDeliveredShipments)
        // trong khi bảng chỉ hiện theo bộ lọc tháng/năm.
        const displayRows = opts.filterForDisplay ? opts.filterForDisplay(rows) : rows;
        tbody.textContent = '';
        if(!displayRows.length){
          showMessage(rows.length ? (opts.emptyFilteredMessage || 'Không có dữ liệu trong kỳ đã chọn.') : (opts.emptyMessage || 'Chưa có dữ liệu.'));
        } else {
          displayRows.forEach(function(d){ tbody.appendChild(createRow(d)); });
        }
        if(opts.afterRender) opts.afterRender(rows);
      } catch(err){
        console.error('Không tải được dữ liệu từ Supabase (' + opts.table + '):', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
        if(opts.afterRender) opts.afterRender([]);
      }
    }

    showMessage('Đang tải dữ liệu...');
    refreshRows();

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const payload = opts.readForm(form);
      if(opts.validate && !opts.validate(payload)) return;

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
      try{
        if(editingRow){
          const { error } = await sb.from(opts.table).update(payload).eq('id', editingRow.dataset.id);
          if(error) throw error;
        } else {
          const { error } = await sb.from(opts.table).insert(payload);
          if(error) throw error;
        }
        await refreshRows();
        closeModal();
        if(opts.afterSave) opts.afterSave();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });

    return { refreshRows: refreshRows };
  }

  (function(){
    const overlay = document.getElementById('add-batch-overlay');
    const openBtn = document.getElementById('btn-open-add-batch');
    const closeBtn = document.getElementById('btn-close-add-batch');
    const cancelBtn = document.getElementById('btn-cancel-add-batch');
    const form = document.getElementById('form-add-batch');
    const tbody = document.getElementById('raw-batch-tbody');
    const modalTitle = document.getElementById('add-batch-modal-title');
    const submitBtn = document.getElementById('btn-submit-add-batch');

    if(!overlay || !form || !tbody || !sb) return;
    const TABLE = 'raw_batches';

    const statusBadge = {
      'Chờ kiểm tra': 'amber',
      'Đạt chuẩn': 'green',
      'Từ chối một phần': 'red'
    };

    const statWeek = document.getElementById('stat-raw-week');
    const statWeekNote = document.getElementById('stat-raw-week-note');
    const statPending = document.getElementById('stat-raw-pending');
    const statPass = document.getElementById('stat-raw-pass');

    function parseQuantity(s){
      if(!s) return 0;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? 0 : n;
    }

    function startOfWeek(date){
      const d = new Date(date);
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function updateStats(rows){
      if(statWeek){
        const weekStart = startOfWeek(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekRows = rows.filter(function(d){
          if(!d.ngay_nhap) return false;
          const dt = new Date(d.ngay_nhap);
          return dt >= weekStart && dt < weekEnd;
        });

        const total = weekRows.reduce(function(sum, d){ return sum + parseQuantity(d.soluong); }, 0);
        statWeek.textContent = total.toLocaleString('vi-VN') + ' trái';

        if(statWeekNote){
          const suppliers = new Set(weekRows.map(function(d){ return d.ncc; }).filter(Boolean));
          statWeekNote.textContent = weekRows.length ? ('Từ ' + suppliers.size + ' NCC') : 'Chưa có lô nào tuần này';
        }
      }

      if(statPending){
        statPending.textContent = String(rows.filter(function(d){ return d.trang_thai === 'Chờ kiểm tra'; }).length);
      }

      if(statPass){
        const decided = rows.filter(function(d){ return d.trang_thai && d.trang_thai !== 'Chờ kiểm tra'; });
        if(decided.length){
          const passed = decided.filter(function(d){ return d.trang_thai === 'Đạt chuẩn'; }).length;
          statPass.textContent = Math.round(passed / decided.length * 100) + '%';
        } else {
          statPass.textContent = '—';
        }
      }
    }

    let editingRow = null;

    function openModal(){
      overlay.classList.add('active');
    }
    function closeModal(){
      overlay.classList.remove('active');
      form.reset();
      editingRow = null;
    }

    function openAddModal(){
      editingRow = null;
      form.reset();
      modalTitle.textContent = 'Thêm lô nguyên liệu';
      submitBtn.textContent = 'Thêm lô hàng';
      openModal();
    }

    function openEditModal(tr){
      editingRow = tr;
      document.getElementById('f-batch').value = tr.dataset.batch || '';
      document.getElementById('f-ncc').value = tr.dataset.ncc || '';
      const loaiRadio = form.querySelector('input[name="f-loai"][value="' + tr.dataset.loai + '"]');
      if(loaiRadio) loaiRadio.checked = true;
      document.getElementById('f-chungloai').value = tr.dataset.chungLoai || '';
      document.getElementById('f-soluong').value = tr.dataset.soluong || '';
      document.getElementById('f-ngay').value = tr.dataset.ngayNhap || '';
      document.getElementById('f-trangthai').value = tr.dataset.trangThai || 'Chờ kiểm tra';
      document.getElementById('f-ghichu').value = tr.dataset.ghiChu || '';
      modalTitle.textContent = 'Chỉnh sửa lô nguyên liệu';
      submitBtn.textContent = 'Lưu thay đổi';
      openModal();
    }

    openBtn.addEventListener('click', openAddModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });

    async function deleteRow(tr){
      const id = tr.dataset.id;
      if(!id) return;
      if(!confirm('Xóa lô nguyên liệu "' + (tr.dataset.batch || '') + '"? Hành động không thể hoàn tác.')) return;
      try{
        const { error } = await sb.from(TABLE).delete().eq('id', id);
        if(error) throw error;
        await refreshRows();
        notifyRawBatchesChanged();
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    tbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){ openEditModal(editBtnEl.closest('tr')); return; }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteRow(delBtnEl.closest('tr')); return; }
    });

    function formatDate(value){
      if(!value) return '—';
      const parts = value.split('-');
      if(parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
      return value;
    }

    function applyRowData(tr, d){
      tr.dataset.id = d.id;
      tr.dataset.batch = d.batch;
      tr.dataset.ncc = d.ncc;
      tr.dataset.loai = d.loai;
      tr.dataset.chungLoai = d.chung_loai || '';
      tr.dataset.soluong = d.soluong || '';
      tr.dataset.ngayNhap = d.ngay_nhap || '';
      tr.dataset.trangThai = d.trang_thai;
      tr.dataset.ghiChu = d.ghi_chu || '';

      tr.cells[0].textContent = d.batch;
      tr.cells[1].textContent = d.ncc;
      tr.cells[2].textContent = d.loai;
      tr.cells[3].textContent = d.chung_loai || '—';
      tr.cells[4].textContent = d.soluong ? d.soluong + ' trái' : '—';
      tr.cells[5].textContent = formatDate(d.ngay_nhap);

      tr.cells[6].textContent = '';
      const badge = document.createElement('span');
      badge.className = 'badge ' + statusBadge[d.trang_thai];
      badge.textContent = d.trang_thai;
      tr.cells[6].appendChild(badge);

      tr.cells[7].textContent = d.ghi_chu || '—';
    }

    function createRow(d){
      const tr = document.createElement('tr');
      tr.className = 'hoverable';
      for(let i = 0; i < 8; i++) tr.appendChild(document.createElement('td'));

      const actionsTd = document.createElement('td');
      actionsTd.className = 'row-actions';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-edit-btn';
      editBtn.setAttribute('aria-label', 'Chỉnh sửa');
      editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
      actionsTd.appendChild(editBtn);
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'row-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Xóa');
      deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
      actionsTd.appendChild(deleteBtn);
      tr.appendChild(actionsTd);

      applyRowData(tr, d);
      return tr;
    }

    function renderRows(rows){
      tbody.textContent = '';
      rows.forEach(function(d){ tbody.appendChild(createRow(d)); });
    }

    function showLoading(){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.style.textAlign = 'center';
      td.style.color = 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = 'Đang tải dữ liệu...';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    function showError(message){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.style.textAlign = 'center';
      td.style.color = 'var(--red)';
      td.style.padding = '20px';
      td.textContent = message;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    async function fetchRows(){
      const { data, error } = await sb
        .from(TABLE)
        .select('*')
        .order('ngay_nhap', { ascending: false })
        .order('created_at', { ascending: false });
      if(error) throw error;
      return data;
    }

    async function refreshRows(){
      try{
        const rows = await fetchRows();
        renderRows(rows);
        updateStats(rows);
      } catch(err){
        console.error('Không tải được dữ liệu từ Supabase:', err);
        showError('Không tải được dữ liệu — kiểm tra kết nối Supabase.');
      }
    }

    showLoading();
    refreshRows();

    form.addEventListener('submit', async function(e){
      e.preventDefault();

      const batch = document.getElementById('f-batch').value.trim();
      const ncc = document.getElementById('f-ncc').value.trim();
      const loai = form.querySelector('input[name="f-loai"]:checked').value;
      const chungloai = document.getElementById('f-chungloai').value.trim();
      const soluong = document.getElementById('f-soluong').value.trim();
      const ngay = document.getElementById('f-ngay').value;
      const trangthai = document.getElementById('f-trangthai').value;
      const ghichu = document.getElementById('f-ghichu').value.trim();

      if(!batch || !ncc) return;

      const payload = {
        batch: batch,
        ncc: ncc,
        loai: loai,
        chung_loai: chungloai || null,
        soluong: soluong,
        ngay_nhap: ngay || null,
        trang_thai: trangthai,
        ghi_chu: ghichu
      };

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';

      try{
        if(editingRow){
          const { error } = await sb.from(TABLE).update(payload).eq('id', editingRow.dataset.id);
          if(error) throw error;
        } else {
          const { error } = await sb.from(TABLE).insert(payload);
          if(error) throw error;
        }
        await refreshRows();
        closeModal();
        notifyRawBatchesChanged();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  })();

  // ---- Nhà cung cấp ----
  (function(){
    const ratingTbody = document.getElementById('supplier-rating-tbody');
    function rankingBadgeClass(r){ return r === 'Tốt' ? 'green' : (r === 'Cần theo dõi' ? 'amber' : 'gray'); }
    function rateClass(n){ return (n !== null && n >= 85) ? 'success' : 'warn-text'; }

    initCrudModule({
      table: 'suppliers',
      overlayId: 'add-supplier-overlay',
      openBtnId: 'btn-open-add-supplier',
      closeBtnId: 'btn-close-add-supplier',
      cancelBtnId: 'btn-cancel-add-supplier',
      formId: 'form-add-supplier',
      tbodyId: 'supplier-tbody',
      modalTitleId: 'add-supplier-modal-title',
      submitBtnId: 'btn-submit-add-supplier',
      cellCount: 4,
      addTitle: 'Thêm nhà cung cấp',
      editTitle: 'Chỉnh sửa nhà cung cấp',
      addLabel: 'Thêm NCC',
      editLabel: 'Lưu thay đổi',
      orderBy: [{ column: 'name', ascending: true }],
      emptyMessage: 'Chưa có nhà cung cấp nào.',
      deleteLabel: function(tr){ return 'nhà cung cấp "' + (tr.dataset.name || '') + '"'; },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.name = d.name || '';
        tr.dataset.category = d.category || '';
        tr.dataset.contact = d.contact || '';
        tr.dataset.suggestion = d.suggestion || '';
        tr.dataset.qc = d.qc_pass_rate != null ? d.qc_pass_rate : '';
        tr.dataset.ontime = d.on_time_rate != null ? d.on_time_rate : '';
        tr.dataset.ranking = d.ranking || '';

        tr.cells[0].textContent = d.name;
        tr.cells[1].textContent = d.category || '—';
        tr.cells[2].textContent = d.contact || '—';
        tr.cells[3].textContent = d.suggestion || '—';
      },
      fillForm: function(form, tr){
        document.getElementById('s-name').value = tr.dataset.name || '';
        document.getElementById('s-category').value = tr.dataset.category || '';
        document.getElementById('s-contact').value = tr.dataset.contact || '';
        document.getElementById('s-suggestion').value = tr.dataset.suggestion || '';
        document.getElementById('s-qc').value = tr.dataset.qc || '';
        document.getElementById('s-ontime').value = tr.dataset.ontime || '';
        document.getElementById('s-ranking').value = tr.dataset.ranking || '';
      },
      readForm: function(form){
        return {
          name: fieldVal('s-name'),
          category: fieldVal('s-category') || null,
          contact: fieldVal('s-contact') || null,
          suggestion: fieldVal('s-suggestion') || null,
          qc_pass_rate: numOrNull(fieldVal('s-qc')),
          on_time_rate: numOrNull(fieldVal('s-ontime')),
          ranking: fieldVal('s-ranking') || null
        };
      },
      validate: function(payload){ return !!payload.name; },
      afterRender: function(rows){
        if(!ratingTbody) return;
        ratingTbody.textContent = '';
        const rated = rows.filter(function(d){ return d.qc_pass_rate != null || d.on_time_rate != null || d.ranking; });
        if(!rated.length){
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.colSpan = 4;
          td.style.textAlign = 'center';
          td.style.color = 'var(--ink-soft)';
          td.style.padding = '20px';
          td.textContent = 'Chưa có đánh giá nào.';
          tr.appendChild(td);
          ratingTbody.appendChild(tr);
          return;
        }
        rated.forEach(function(d){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          const nameTd = document.createElement('td');
          nameTd.textContent = d.name;
          const qcTd = document.createElement('td');
          qcTd.className = rateClass(d.qc_pass_rate);
          qcTd.textContent = d.qc_pass_rate != null ? d.qc_pass_rate + '%' : '—';
          const otTd = document.createElement('td');
          otTd.className = rateClass(d.on_time_rate);
          otTd.textContent = d.on_time_rate != null ? d.on_time_rate + '%' : '—';
          const rankTd = document.createElement('td');
          if(d.ranking){
            const badge = document.createElement('span');
            badge.className = 'badge ' + rankingBadgeClass(d.ranking);
            badge.textContent = d.ranking;
            rankTd.appendChild(badge);
          } else {
            rankTd.textContent = '—';
          }
          tr.appendChild(nameTd); tr.appendChild(qcTd); tr.appendChild(otTd); tr.appendChild(rankTd);
          ratingTbody.appendChild(tr);
        });
      }
    });
  })();

  // ---- Đơn đặt hàng (PO) ----
  // Lọc theo tháng/năm dựa trên created_at (cột ngày duy nhất của bảng) —
  // query lại Supabase thật (.gte/.lt) mỗi khi đổi select, không lọc phía JS.
  (function(){
    function statusBadgeClass(s){
      return { 'Chờ giao': 'amber', 'Đã giao': 'green', 'Đã QC đạt': 'green', 'Từ chối 1 phần': 'red' }[s] || 'gray';
    }

    const poMonthSelect = document.getElementById('po-month-select');
    const poYearSelect = document.getElementById('po-year-select');

    // Danh sách năm cho dropdown lấy riêng (chỉ cột created_at) để không phụ
    // thuộc vào rows đã bị lọc của lần fetch trước.
    async function loadPoYears(){
      if(!poYearSelect || !sb) return;
      try{
        const { data, error } = await sb.from('purchase_orders').select('created_at');
        if(error) throw error;
        const years = (data || []).map(function(r){ const p = periodParts(r.created_at); return p ? p.year : null; }).filter(Boolean);
        populateMonthYearSelect(poMonthSelect, poYearSelect, years);
      } catch(err){
        populateMonthYearSelect(poMonthSelect, poYearSelect, []);
      }
    }

    const poModule = initCrudModule({
      table: 'purchase_orders',
      dateFilter: function(){
        if(!poYearSelect || !poYearSelect.value) return null;
        const range = periodRange(Number(poYearSelect.value), poMonthSelect && poMonthSelect.value ? Number(poMonthSelect.value) : null);
        return { column: 'created_at', start: range.start, end: range.end };
      },
      overlayId: 'add-po-overlay',
      openBtnId: 'btn-open-add-po',
      closeBtnId: 'btn-close-add-po',
      cancelBtnId: 'btn-cancel-add-po',
      formId: 'form-add-po',
      tbodyId: 'po-tbody',
      modalTitleId: 'add-po-modal-title',
      submitBtnId: 'btn-submit-add-po',
      cellCount: 6,
      addTitle: 'Thêm PO',
      editTitle: 'Chỉnh sửa PO',
      addLabel: 'Thêm PO',
      editLabel: 'Lưu thay đổi',
      orderBy: [{ column: 'created_at', ascending: false }],
      emptyMessage: 'Chưa có đơn đặt hàng nào.',
      deleteLabel: function(tr){ return 'PO "' + (tr.dataset.poCode || '') + '"'; },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.batch = d.batch_code || '';
        tr.dataset.poCode = d.po_code || '';
        tr.dataset.supplier = d.supplier_name || '';
        tr.dataset.category = d.category || '';
        tr.dataset.quantity = d.quantity || '';
        tr.dataset.status = d.status || '';

        tr.cells[0].textContent = d.batch_code || '—';
        tr.cells[1].textContent = d.po_code;
        tr.cells[2].textContent = d.supplier_name;
        tr.cells[3].textContent = d.category || '—';
        tr.cells[4].textContent = d.quantity || '—';
        tr.cells[5].textContent = '';
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge ' + statusBadgeClass(d.status);
        statusBadge.textContent = d.status || '—';
        tr.cells[5].appendChild(statusBadge);
      },
      fillForm: function(form, tr){
        document.getElementById('po-batch').value = tr.dataset.batch || '';
        document.getElementById('po-code').value = tr.dataset.poCode || '';
        document.getElementById('po-supplier').value = tr.dataset.supplier || '';
        document.getElementById('po-category').value = tr.dataset.category || '';
        document.getElementById('po-quantity').value = tr.dataset.quantity || '';
        document.getElementById('po-status').value = tr.dataset.status || 'Chờ giao';
      },
      readForm: function(form){
        return {
          batch_code: fieldVal('po-batch') || null,
          po_code: fieldVal('po-code'),
          supplier_name: fieldVal('po-supplier'),
          category: fieldVal('po-category') || null,
          quantity: fieldVal('po-quantity') || null,
          status: fieldVal('po-status')
        };
      },
      validate: function(payload){ return !!payload.po_code && !!payload.supplier_name; },
      afterSave: function(){ notifyPurchaseOrdersChanged(); loadPoYears(); }
    });

    if(poMonthSelect) poMonthSelect.addEventListener('change', function(){ if(poModule) poModule.refreshRows(); });
    if(poYearSelect) poYearSelect.addEventListener('change', function(){ if(poModule) poModule.refreshRows(); });
    loadPoYears().then(function(){ if(poModule) poModule.refreshRows(); });
  })();

  // ---- Đánh giá chất lượng ----
  // Module này là nơi tổng hợp lô hàng: mỗi dòng trong bảng chính là 1 lô,
  // gộp thông tin từ NCC (purchase_orders), Vùng nguyên liệu + Xưởng Ba Phi
  // (raw_batches/factory_batches — chỉ áp dụng cho Dừa) và lịch sử kiểm QC
  // (qc_checks). Bấm vào 1 lô để xem chi tiết và ghi nhận kết quả kiểm ngay
  // trong modal, thay vì có 1 form thêm-kết-quả tách rời như trước.
  (function(){
    const statToday = document.getElementById('stat-qc-today');
    const statPass = document.getElementById('stat-qc-pass');
    const statPending = document.getElementById('stat-qc-pending');
    const summaryTbody = document.getElementById('qc-summary-tbody');
    const newBatchBtn = document.getElementById('btn-new-qc-batch');
    const qcMonthSelect = document.getElementById('qc-month-select');
    const qcYearSelect = document.getElementById('qc-year-select');

    const overlay = document.getElementById('qc-batch-overlay');
    const closeBtn = document.getElementById('btn-close-qc-batch');
    const cancelBtn = document.getElementById('btn-cancel-add-qc');
    const form = document.getElementById('form-add-qc');
    const modalTitle = document.getElementById('qc-batch-modal-title');
    const infoGrid = document.getElementById('qc-batch-info-grid');
    const historyTbody = document.getElementById('qc-tbody');
    const categorySelect = document.getElementById('qc-category');
    const chungLoaiGroup = document.getElementById('qc-chungloai-group');
    const chungLoaiSelect = document.getElementById('qc-chungloai');
    const submitBtn = document.getElementById('btn-submit-add-qc');
    const poBreakdownSection = document.getElementById('qc-po-breakdown-section');
    const poBreakdownTbody = document.getElementById('qc-po-breakdown-tbody');

    if(!summaryTbody || !overlay || !form || !sb) return;

    function resultBadgeClass(r){
      return { 'Chờ xác nhận': 'amber', 'Đạt': 'green', 'Đạt có điều kiện': 'amber', 'Không đạt 1 phần': 'red' }[r] || 'gray';
    }
    // Tô màu select sửa trực tiếp trong bảng theo giá trị đang chọn (cùng
    // bảng màu với badge — xem .table-inline-select.select-* trong CSS).
    function applySelectColor(select, colorName){
      ['select-green', 'select-amber', 'select-red', 'select-blue', 'select-gray'].forEach(function(c){ select.classList.remove(c); });
      select.classList.add('select-' + colorName);
    }
    function badge(text, cls){
      const span = document.createElement('span');
      span.className = 'badge ' + cls;
      span.textContent = text;
      return span;
    }
    function parseQty(s){
      if(s === undefined || s === null || String(s).trim() === '') return null;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? null : n;
    }
    function fmtQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' trái'; }
    function fmtBoxQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' thùng'; }
    function boxCount(finishedQty, quyCach){
      if(finishedQty == null || !quyCach) return null;
      return Math.floor(Number(finishedQty) / Number(quyCach));
    }
    function getFb(r){
      if(!r.factory_batches) return null;
      return Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches;
    }

    let allQcRows = [];
    let batchSummaries = {};
    let currentBatch = null;
    let editingQcId = null;

    // Gom raw_batches theo lô hàng (1 lô có thể gồm nhiều đợt nhập/nhiều NCC),
    // rồi gộp thêm PO (cho hàng thương mại không qua Xưởng) và qc_checks (chỉ
    // để tra kết quả kiểm — lô nào CHỈ có qc_checks mà không có nguồn thật từ
    // Vùng nguyên liệu/Xưởng Ba Phi hoặc NCC (hasSourceInfo=false) coi như
    // "chưa có thông tin", sẽ bị lọc bỏ khỏi bảng hiển thị.
    // Ngày đại diện (periodDate) của 1 lô hàng = ngày sớm nhất trong các mốc
    // đã biết (ngày nhập nguyên liệu / ngày tạo PO) — dùng để phân lô hàng
    // theo tháng/năm cho biểu đồ ở Tổng quan.
    function updatePeriod(b, dateStr){
      if(!dateStr) return;
      const d = String(dateStr).slice(0, 10);
      if(!b.periodDate || d < b.periodDate) b.periodDate = d;
    }

    function buildSummaries(rawRows, poRows, qcRows, batchInfoRows, stockRows){
      const map = {};
      function ensure(batchCode){
        if(!map[batchCode]){
          map[batchCode] = {
            batch: batchCode, nccSet: new Set(), categorySet: new Set(), category: null,
            isDua: false, totalQty: 0, totalQtyText: null,
            ngayNhap: null, hasFactory: false, finishedQty: null, exportedQty: null,
            hasSourceInfo: false, poEntries: [], saleType: null, orderStatus: null, note: '', periodDate: null,
            varietyMap: {}, duaVarieties: [], duaBoxes: 0
          };
        }
        return map[batchCode];
      }

      rawRows.forEach(function(r){
        if(!r.batch) return;
        const b = ensure(r.batch);
        b.isDua = true;
        b.categorySet.add('Dừa');
        b.hasSourceInfo = true;
        const qty = parseQty(r.soluong);
        if(qty) b.totalQty += qty;
        const variety = (r.chung_loai || '').trim() || 'Chưa phân loại';
        b.varietyMap[variety] = (b.varietyMap[variety] || 0) + (qty || 0);
        if(r.ngay_nhap && (!b.ngayNhap || r.ngay_nhap > b.ngayNhap)) b.ngayNhap = r.ngay_nhap;
        updatePeriod(b, r.ngay_nhap);
        const fb = getFb(r);
        if(fb && fb.finished_qty != null){
          b.hasFactory = true;
          b.finishedQty = (b.finishedQty || 0) + Number(fb.finished_qty);
          const boxes = boxCount(fb.finished_qty, fb.quy_cach);
          if(boxes != null) b.duaBoxes += boxes;
        }
      });

      // Thực tế 1 lô/1 cont ghép có thể vừa có hàng Dừa (qua Xưởng Ba Phi) vừa
      // có hàng mua ngoài NCC khác ngành hàng (VD: Chanh) chung 1 tên lô — nên
      // LUÔN gom hết purchase_orders theo batch_code, không được bỏ qua chỉ vì
      // lô đó đã có nguồn Dừa (trước đây bị guard "!b.isDua" chặn nhầm, làm
      // mất hẳn số lượng/NCC/ngành hàng của phần hàng mua ngoài).
      poRows.forEach(function(p){
        if(!p.batch_code) return;
        const b = ensure(p.batch_code);
        b.hasSourceInfo = true;
        b.poEntries.push(p);
        if(p.supplier_name) b.nccSet.add(p.supplier_name);
        if(p.category) b.categorySet.add(p.category);
        if(p.quantity) b.totalQtyText = b.totalQtyText ? b.totalQtyText + ' + ' + p.quantity : p.quantity;
        updatePeriod(b, p.created_at);
      });

      qcRows.forEach(function(q){
        if(!q.batch_code) return;
        const b = ensure(q.batch_code);
        if(q.category) b.categorySet.add(q.category);
      });

      // Hình thức (Nội địa/Xuất khẩu) chỉ là phân loại bổ sung cho lô đã có
      // nguồn thật — không tự tính là "có thông tin" nếu lô đó chưa từng xuất
      // hiện ở NCC/Vùng nguyên liệu.
      (batchInfoRows || []).forEach(function(bi){
        if(!bi.batch) return;
        const b = ensure(bi.batch);
        b.saleType = bi.sale_type || null;
        b.orderStatus = bi.order_status || null;
        b.note = bi.note || '';
      });

      // factory_finished_stock.exported_qty = số lượng ĐÃ xuất kho/load cont
      // thực tế cho lô đó (tổng luỹ kế, không phải thành phẩm hay hao hụt) —
      // đây mới là "Số lượng thực tế" đúng nghĩa cho phần Dừa. Từ khi Tồn kho
      // tách theo chủng loại, 1 lô có thể có NHIỀU dòng (1 dòng/chủng loại)
      // nên phải cộng dồn, không được ghi đè như trước.
      (stockRows || []).forEach(function(s){
        if(!s.batch) return;
        const b = ensure(s.batch);
        if(s.exported_qty != null) b.exportedQty = (b.exportedQty || 0) + Number(s.exported_qty);
      });

      Object.values(map).forEach(function(b){
        // nccSet giờ chỉ chứa NCC thương mại (từ purchase_orders) — NCC nội bộ
        // của Dừa (Xưởng Ba Phi) được cộng riêng trong displayNcc(), không gộp
        // chung set để tránh lẫn NCC thô (thương lái giao dừa) với NCC hàng hoá.
        b.ncc = b.nccSet.size > 1 ? 'Nhiều NCC' : (b.nccSet.size === 1 ? Array.from(b.nccSet)[0] : null);
        b.category = b.categorySet.size ? Array.from(b.categorySet).join(' + ') : null;
        b.duaVarieties = Object.keys(b.varietyMap)
          .sort(function(x, y){ return x.localeCompare(y, 'vi'); })
          .map(function(name){ return { name: name, qty: b.varietyMap[name] }; });
      });

      return map;
    }

    function displayQuantity(b){
      if(b.isDua) return b.totalQty ? b.totalQty.toLocaleString('vi-VN') + ' trái' : '—';
      return b.totalQtyText || '—';
    }

    function displayProduction(b){
      if(!b.isDua) return '—';
      if(!b.hasFactory){
        // Chưa qua Xưởng Ba Phi thì vẫn còn số nhập thô thật (đã cân ở Vùng
        // nguyên liệu) — không được bỏ trống, chỉ ghi rõ đây là số nhập thô,
        // chưa phải thành phẩm.
        return b.totalQty ? fmtQty(b.totalQty) + ' nhập thô (chưa sản xuất)' : 'Chưa có dữ liệu';
      }
      // Có Quy cách (đã đóng thùng) thì hiện theo thùng — QC làm việc theo
      // đơn vị thùng; lô nào chưa điền Quy cách ở Xưởng sản xuất thì tạm hiện
      // theo trái như trước.
      let text = b.duaBoxes ? fmtBoxQty(b.duaBoxes) : fmtQty(b.finishedQty);
      if(b.totalQty > 0 && b.finishedQty != null){
        const loss = (1 - b.finishedQty / b.totalQty) * 100;
        text += ' · Hao hụt ' + loss.toFixed(0) + '%';
      }
      return text;
    }
    // "Số lượng thực tế" = số hàng ĐÃ load cont/giao khách thật, không phải
    // số nhập thô hay thành phẩm sau chế biến (đó là thông tin quá trình,
    // xem chi tiết ở "Sản xuất (Xưởng Ba Phi)" trong modal). Chưa xuất kho
    // thì để trống, không hiện số nhập/số sản xuất thay thế. exportedQty lấy
    // từ Tồn kho, giờ đã là đơn vị thùng.
    function displayActualQuantity(b){
      const parts = [];
      if(b.isDua && b.exportedQty != null) parts.push(fmtBoxQty(b.exportedQty));
      if(b.totalQtyText) parts.push(b.totalQtyText);
      return parts.length ? parts.join(' + ') : '—';
    }
    // Xưởng Ba Phi được coi như "NCC nội bộ" của Dừa; NCC thương mại (từ
    // purchase_orders) hiện thêm bên cạnh nếu lô có cả 2 loại nguồn.
    function displayNcc(b){
      const parts = [];
      if(b.isDua) parts.push('Xưởng Ba Phi');
      if(b.ncc) parts.push(b.ncc);
      return parts.length ? parts.join(' + ') : '—';
    }

    // Mỗi dòng sản phẩm trong bảng tổng hợp (Dừa theo từng chủng loại, hoặc
    // từng đơn NCC/ngành hàng khác) tra kết quả kiểm RIÊNG theo đúng
    // category (+ chungLoai nếu là Dừa) của dòng đó — không gộp chung QC của
    // cả lô nữa, vì mỗi sản phẩm trong lô có thể đạt/không đạt khác nhau.
    // chungLoai bỏ qua (undefined) với các dòng không phải Dừa (PO khác
    // ngành hàng không có khái niệm chủng loại).
    function checksMatch(q, qcCategory, chungLoai){
      if((q.category || 'Dừa') !== qcCategory) return false;
      if(chungLoai !== undefined && (q.chung_loai || null) !== (chungLoai || null)) return false;
      return true;
    }

    // Kết quả kiểm "Thành phẩm" GẦN NHẤT khớp đúng category (+ chungLoai nếu
    // là Dừa) của 1 dòng trong bảng tổng hợp — dùng để Đánh giá chất lượng
    // sửa trực tiếp được (select phản ánh đúng bản ghi sẽ bị update).
    function finishedCheck(batchCode, qcCategory, chungLoai){
      return allQcRows.find(function(q){
        if(q.batch_code !== batchCode || q.check_type !== 'Thành phẩm') return false;
        return checksMatch(q, qcCategory, chungLoai);
      }) || null;
    }

    const QUICK_RESULT_OPTIONS = ['Chờ xác nhận', 'Đạt', 'Đạt có điều kiện', 'Không đạt 1 phần'];

    async function saveQuickResult(batchCode, qcCategory, chungLoai, value){
      if(!value) return;
      try{
        const existing = finishedCheck(batchCode, qcCategory, chungLoai);
        if(existing){
          const { error } = await sb.from('qc_checks').update({ result: value }).eq('id', existing.id);
          if(error) throw error;
        } else {
          const { error } = await sb.from('qc_checks').insert({
            batch_code: batchCode, category: qcCategory, chung_loai: chungLoai || null,
            check_type: 'Thành phẩm', result: value
          });
          if(error) throw error;
        }
        await loadAll();
      } catch(err){
        alert('Không thể lưu kết quả: ' + err.message);
      }
    }

    function buildQuickResultSelect(batchCode, qcCategory, chungLoai){
      const select = document.createElement('select');
      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = 'Chưa kiểm';
      select.appendChild(blankOpt);
      QUICK_RESULT_OPTIONS.forEach(function(r){
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        select.appendChild(opt);
      });
      const current = finishedCheck(batchCode, qcCategory, chungLoai);
      select.value = current && current.result ? current.result : '';
      applySelectColor(select, resultBadgeClass(select.value));
      select.addEventListener('change', function(){
        applySelectColor(select, resultBadgeClass(select.value));
        saveQuickResult(batchCode, qcCategory, chungLoai, select.value);
      });
      return select;
    }

    function showSummaryMessage(text, color){
      summaryTbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 9;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      summaryTbody.appendChild(tr);
    }

    // Mỗi lô có thể gồm nhiều mặt hàng/nguồn khác nhau (Dừa qua Xưởng Ba Phi +
    // 1 hoặc nhiều đơn NCC) — tách thành từng dòng riêng theo NCC/mặt hàng để
    // dễ thấy, thay vì gộp chung 1 dòng bằng dấu "+".
    function buildLines(b){
      const lines = [];
      if(b.isDua){
        // Luôn tách theo từng chủng loại dừa đã ghi ở Vùng nguyên liệu — số
        // dòng phải đúng bằng số sản phẩm thực có trong lô (kể cả khi lô
        // ghép thêm PO ngành hàng khác), mỗi dòng kiểm/đánh giá QC độc lập.
        // Chỉ khi CHƯA từng nhập chủng loại (1 mục duy nhất "Chưa phân
        // loại") mới coi là 1 dòng "Dừa" chung như trước, và lúc đó vẫn
        // dùng số lượng thực xuất (exportedQty) vì chưa tách được theo
        // chủng loại nào cả.
        const multi = b.duaVarieties.length > 1;
        b.duaVarieties.forEach(function(v){
          const named = v.name !== 'Chưa phân loại';
          lines.push({
            ncc: 'Xưởng Ba Phi',
            category: named ? v.name : 'Dừa',
            qcCategory: 'Dừa',
            chungLoai: named ? v.name : null,
            qty: multi ? (v.qty ? fmtQty(v.qty) : '—') : (b.exportedQty != null ? fmtBoxQty(b.exportedQty) : '—')
          });
        });
      }
      b.poEntries.forEach(function(p){
        lines.push({
          ncc: p.supplier_name || '—',
          category: p.category || '—',
          qcCategory: p.category || null,
          qty: p.quantity || '—'
        });
      });
      if(!lines.length){
        lines.push({ ncc: displayNcc(b), category: b.category || '—', qcCategory: null, qty: displayActualQuantity(b) });
      }
      return lines;
    }

    // batchSummaries luôn giữ TOÀN BỘ lô hàng (không lọc) vì đây là nguồn dùng
    // chung (sharedBatchSummaries) để đổ dropdown "chọn lô hàng" ở Logistics/
    // Feedback — bộ lọc tháng/năm chỉ áp khi hiển thị bảng ở module này.
    function populateQcSelectors(){
      const years = Object.values(batchSummaries)
        .map(function(b){ const p = periodParts(b.periodDate); return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(qcMonthSelect, qcYearSelect, years);
    }
    function inSelectedPeriod(b){
      if(!qcYearSelect || !qcYearSelect.value) return true;
      const p = periodParts(b.periodDate);
      if(!p) return false;
      if(p.year !== Number(qcYearSelect.value)) return false;
      if(qcMonthSelect && qcMonthSelect.value && p.month !== Number(qcMonthSelect.value)) return false;
      return true;
    }

    function renderSummary(){
      const batches = Object.values(batchSummaries)
        .filter(function(b){ return b.hasSourceInfo && inSelectedPeriod(b); })
        .sort(function(a, b){ return a.batch.localeCompare(b.batch); });
      summaryTbody.textContent = '';
      if(!batches.length){ showSummaryMessage('Chưa có lô hàng nào.'); return; }

      batches.forEach(function(b){
        const lines = buildLines(b);
        const rowspan = lines.length;

        lines.forEach(function(line, idx){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.batch = b.batch;

          if(idx === 0){
            const batchTd = document.createElement('td');
            batchTd.rowSpan = rowspan;
            batchTd.textContent = b.batch;
            tr.appendChild(batchTd);
          }

          const nccTd = document.createElement('td');
          nccTd.textContent = line.ncc;
          tr.appendChild(nccTd);

          const catTd = document.createElement('td');
          catTd.textContent = line.category;
          tr.appendChild(catTd);

          if(idx === 0){
            const saleTypeTd = document.createElement('td');
            saleTypeTd.rowSpan = rowspan;
            const saleTypeSelect = buildSaleTypeSelect(b);
            saleTypeSelect.className = 'table-inline-select';
            saleTypeTd.appendChild(saleTypeSelect);
            tr.appendChild(saleTypeTd);
          }

          const qtyTd = document.createElement('td');
          qtyTd.className = 'muted';
          qtyTd.textContent = line.qty;
          // Ở các dòng nối tiếp (idx>0), các ô rowspan (Trạng thái/Ghi chú/
          // Thao tác) không lặp lại nên qtyTd vô tình thành ô cuối cùng
          // trong <tr> đó — CSS "td:last-child{text-align:right}" (dành
          // riêng cho cột Thao tác) sẽ bắt nhầm qtyTd, làm số liệu lúc lệch
          // trái lúc lệch phải không đồng nhất giữa các dòng. Ép rõ
          // text-align:left để tránh.
          qtyTd.style.textAlign = 'left';
          tr.appendChild(qtyTd);

          if(idx === 0){
            const orderStatusTd = document.createElement('td');
            orderStatusTd.rowSpan = rowspan;
            const orderStatusSelect = buildOrderStatusSelect(b);
            orderStatusSelect.className = 'table-inline-select';
            orderStatusTd.appendChild(orderStatusSelect);
            tr.appendChild(orderStatusTd);
          }

          // Đánh giá chất lượng sửa trực tiếp ngay trong bảng — select phản
          // ánh đúng kết quả kiểm "Thành phẩm" GẦN NHẤT của riêng dòng này
          // (category + chungLoai), chọn lại là lưu ngay (update nếu đã có
          // bản ghi khớp, insert mới nếu chưa) (ép text-align:left như qtyTd
          // để tránh CSS td:last-child bắt nhầm ở dòng nối tiếp).
          const statusTd = document.createElement('td');
          statusTd.style.textAlign = 'left';
          const statusSelect = buildQuickResultSelect(b.batch, line.qcCategory, line.chungLoai);
          statusSelect.className = 'table-inline-select';
          statusTd.appendChild(statusSelect);
          tr.appendChild(statusTd);

          if(idx === 0){
            const noteTd = document.createElement('td');
            noteTd.rowSpan = rowspan;
            const noteInput = document.createElement('input');
            noteInput.type = 'text';
            noteInput.className = 'table-inline-input';
            noteInput.placeholder = 'Ghi chú...';
            noteInput.value = b.note || '';
            noteInput.addEventListener('change', function(){ saveNote(b.batch, noteInput.value); });
            noteTd.appendChild(noteInput);
            tr.appendChild(noteTd);
          }

          if(idx === 0){
            const actionsTd = document.createElement('td');
            actionsTd.rowSpan = rowspan;
            actionsTd.className = 'row-actions';
            const viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'row-edit-btn';
            viewBtn.setAttribute('aria-label', 'Xem chi tiết');
            viewBtn.innerHTML = '<i class="ti ti-eye"></i>';
            actionsTd.appendChild(viewBtn);
            tr.appendChild(actionsTd);
          }

          summaryTbody.appendChild(tr);
        });
      });
    }

    async function saveSaleType(batchCode, value){
      try{
        const { error } = await sb.from('batch_info').upsert({ batch: batchCode, sale_type: value || null }, { onConflict: 'batch' });
        if(error) throw error;
        await loadAll();
      } catch(err){
        alert('Không thể lưu Hình thức: ' + err.message);
      }
    }

    // Hình thức sửa trực tiếp ngay trong bảng tổng hợp (renderSummary), tự
    // lưu khi đổi (upsert batch_info) — không đi qua form-add-qc vì nó
    // thuộc về lô hàng, không phải 1 lần kiểm QC cụ thể.
    function saleTypeColorName(v){
      return { 'Xuất khẩu': 'blue', 'Nội địa': 'gray' }[v] || 'amber';
    }
    function buildSaleTypeSelect(b){
      const select = document.createElement('select');
      [['', '— Chưa phân loại —'], ['Nội địa', 'Nội địa'], ['Xuất khẩu', 'Xuất khẩu']].forEach(function(o){
        const opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if((b.saleType || '') === o[0]) opt.selected = true;
        select.appendChild(opt);
      });
      applySelectColor(select, saleTypeColorName(b.saleType));
      select.addEventListener('change', function(){
        applySelectColor(select, saleTypeColorName(select.value));
        saveSaleType(b.batch, select.value);
      });
      return select;
    }

    async function saveOrderStatus(batchCode, value){
      try{
        const { error } = await sb.from('batch_info').upsert({ batch: batchCode, order_status: value || null }, { onConflict: 'batch' });
        if(error) throw error;
        // "Đã đóng hàng" → hàng đã sẵn sàng, phải xuất hiện ngay bên
        // Logistics. Chỉ tự tạo dòng mới nếu lô này CHƯA từng có bản ghi vận
        // chuyển nào (tránh ghi đè tiến độ đang theo dõi nếu lỡ bấm lại) —
        // bắt đầu ở "Kho nội địa", chung cho cả Xuất khẩu lẫn Nội địa vì
        // Logistics đã tự giới hạn các giai đoạn TIẾP THEO theo Hình thức.
        if(value === 'Đã đóng hàng'){
          const { data: existing, error: findErr } = await sb.from('shipments').select('id').eq('batch_code', batchCode).limit(1);
          if(findErr) throw findErr;
          if(!existing || !existing.length){
            const { error: insErr } = await sb.from('shipments').insert({ batch_code: batchCode, stage: 'Kho nội địa' });
            if(insErr) throw insErr;
          }
        }
        await loadAll();
      } catch(err){
        alert('Không thể lưu Trạng thái đơn hàng: ' + err.message);
      }
    }

    function orderStatusColorName(v){
      return { 'Đã đóng hàng': 'green', 'Chưa đóng hàng': 'amber' }[v] || 'gray';
    }
    // Trạng thái đơn hàng sửa trực tiếp ngay trong bảng tổng hợp
    // (renderSummary), tự lưu khi đổi giống Hình thức.
    function buildOrderStatusSelect(b){
      const select = document.createElement('select');
      [['', '— Chưa xác định —'], ['Chưa đóng hàng', 'Chưa đóng hàng'], ['Đã đóng hàng', 'Đã đóng hàng']].forEach(function(o){
        const opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if((b.orderStatus || '') === o[0]) opt.selected = true;
        select.appendChild(opt);
      });
      applySelectColor(select, orderStatusColorName(b.orderStatus));
      select.addEventListener('change', function(){
        applySelectColor(select, orderStatusColorName(select.value));
        saveOrderStatus(b.batch, select.value);
      });
      return select;
    }

    async function saveNote(batchCode, value){
      try{
        const { error } = await sb.from('batch_info').upsert({ batch: batchCode, note: value || null }, { onConflict: 'batch' });
        if(error) throw error;
        await loadAll();
      } catch(err){
        alert('Không thể lưu Ghi chú: ' + err.message);
      }
    }

    function renderInfoGrid(b){
      infoGrid.textContent = '';
      const items = [
        ['NCC', displayNcc(b)],
        ['Sản phẩm', b.category || '—'],
        ['Số lượng', displayQuantity(b)],
        ['Ngày nhập gần nhất', b.ngayNhap ? fmtDate(b.ngayNhap) : '—']
      ];
      if(b.isDua){
        if(b.duaVarieties.length > 1){
          items.push(['Chủng loại', b.duaVarieties.map(function(v){ return v.name + ' (' + fmtQty(v.qty) + ')'; }).join(', ')]);
        }
        items.push(['Sản xuất (Xưởng Ba Phi)', displayProduction(b)]);
        items.push(['Đã xuất kho (thực tế)', b.exportedQty != null ? fmtBoxQty(b.exportedQty) : 'Chưa xuất']);
      }
      items.forEach(function(pair){
        const item = document.createElement('div');
        const label = document.createElement('div');
        label.className = 'info-label';
        label.textContent = pair[0];
        const value = document.createElement('div');
        value.className = 'info-value';
        value.textContent = pair[1];
        item.appendChild(label);
        item.appendChild(value);
        infoGrid.appendChild(item);
      });
      // Hình thức/Trạng thái đơn hàng giờ sửa trực tiếp ở bảng tổng hợp
      // (renderSummary), không lặp lại trong modal nữa.
    }

    function poStatusBadgeClass(s){
      return { 'Chờ giao': 'amber', 'Đã giao': 'green', 'Đã QC đạt': 'green', 'Từ chối 1 phần': 'red' }[s] || 'gray';
    }

    // Chỉ hiện khi lô hàng gộp từ 2+ đơn NCC trở lên (cont ghép thực tế) — lô
    // bình thường chỉ 1 đơn thì thông tin đã đủ ở info-grid, không cần lặp lại.
    function renderPoBreakdown(b){
      if(!poBreakdownSection || !poBreakdownTbody) return;
      const entries = (b && b.poEntries) || [];
      // Hiện khi có từ 2 đơn NCC trở lên (cont ghép nhiều đơn), HOẶC lô Dừa
      // (qua Xưởng Ba Phi) có thêm ít nhất 1 đơn NCC khác ngành hàng ghép
      // chung — cả 2 trường hợp đều cần liệt kê rõ để không bị lẫn vào phần
      // "Sản xuất (Xưởng Ba Phi)" ở trên.
      const shouldShow = entries.length >= 2 || (entries.length === 1 && b && b.isDua);
      if(!shouldShow){
        poBreakdownSection.style.display = 'none';
        poBreakdownTbody.textContent = '';
        return;
      }
      poBreakdownSection.style.display = '';
      poBreakdownTbody.textContent = '';
      entries.forEach(function(p){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';

        const poCodeTd = document.createElement('td');
        poCodeTd.textContent = p.po_code || '—';
        tr.appendChild(poCodeTd);

        const nccTd = document.createElement('td');
        nccTd.textContent = p.supplier_name || '—';
        tr.appendChild(nccTd);

        const catTd = document.createElement('td');
        catTd.textContent = p.category || '—';
        tr.appendChild(catTd);

        const qtyTd = document.createElement('td');
        qtyTd.className = 'muted';
        qtyTd.textContent = p.quantity || '—';
        tr.appendChild(qtyTd);

        const statusTd = document.createElement('td');
        statusTd.appendChild(badge(p.status || '—', poStatusBadgeClass(p.status)));
        tr.appendChild(statusTd);

        poBreakdownTbody.appendChild(tr);
      });
    }

    function renderHistory(batchCode){
      const checks = allQcRows.filter(function(q){ return q.batch_code === batchCode; });
      historyTbody.textContent = '';
      if(!checks.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Chưa có kết quả kiểm nào.';
        tr.appendChild(td);
        historyTbody.appendChild(tr);
        return;
      }
      checks.forEach(function(d){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.id = d.id;
        tr.dataset.category = d.category || 'Dừa';
        tr.dataset.chungLoai = d.chung_loai || '';
        tr.dataset.type = d.check_type || '';
        tr.dataset.result = d.result || '';
        tr.dataset.inspector = d.inspector || '';
        tr.dataset.note = d.note || '';

        const typeTd = document.createElement('td');
        typeTd.textContent = d.check_type || '—';
        tr.appendChild(typeTd);

        const varietyTd = document.createElement('td');
        varietyTd.className = 'muted';
        varietyTd.textContent = d.chung_loai || '—';
        tr.appendChild(varietyTd);

        const resultTd = document.createElement('td');
        resultTd.appendChild(badge(d.result || '—', resultBadgeClass(d.result)));
        tr.appendChild(resultTd);

        const inspectorTd = document.createElement('td');
        inspectorTd.textContent = d.inspector || '—';
        tr.appendChild(inspectorTd);

        const noteTd = document.createElement('td');
        noteTd.className = 'muted';
        noteTd.textContent = d.note || '—';
        tr.appendChild(noteTd);

        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.setAttribute('aria-label', 'Chỉnh sửa');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        actionsTd.appendChild(editBtn);
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'row-delete-btn';
        deleteBtn.setAttribute('aria-label', 'Xóa');
        deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);

        historyTbody.appendChild(tr);
      });
    }

    async function deleteQcCheck(tr){
      const id = tr.dataset.id;
      if(!id) return;
      if(!confirm('Xóa kết quả kiểm "' + (tr.dataset.type || '') + '" này? Hành động không thể hoàn tác.')) return;
      try{
        const { error } = await sb.from('qc_checks').delete().eq('id', id);
        if(error) throw error;
        if(editingQcId === id) resetForm();
        await loadAll();
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    const KNOWN_QC_CATEGORIES = ['Dừa', 'Chanh', 'Thanh long', 'Khác'];

    // Chủng loại chỉ áp dụng cho hàng Dừa — ẩn hẳn field đi khi kiểm hàng
    // khác (Chanh/Thanh long/Khác) để form không rối.
    function updateChungLoaiVisibility(){
      if(chungLoaiGroup) chungLoaiGroup.style.display = categorySelect.value === 'Dừa' ? '' : 'none';
    }
    // Options lấy từ đúng các chủng loại thực tế đã nhập ở Vùng nguyên liệu
    // cho lô này (batchSummaries[...].duaVarieties), không phải danh sách
    // chung chung — đảm bảo QC chỉ chọn được chủng loại có thật trong lô.
    function populateChungLoaiOptions(batchCode, selected){
      if(!chungLoaiSelect) return;
      const b = batchCode && batchSummaries[batchCode];
      const varieties = (b && b.duaVarieties || []).filter(function(v){ return v.name !== 'Chưa phân loại'; });
      chungLoaiSelect.innerHTML = '';
      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = varieties.length ? '— Chọn chủng loại —' : '— Không tách theo chủng loại —';
      chungLoaiSelect.appendChild(blankOpt);
      varieties.forEach(function(v){
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = v.name;
        chungLoaiSelect.appendChild(opt);
      });
      chungLoaiSelect.value = selected && varieties.some(function(v){ return v.name === selected; }) ? selected : '';
    }
    if(categorySelect){
      categorySelect.addEventListener('change', function(){
        updateChungLoaiVisibility();
        populateChungLoaiOptions(currentBatch, '');
      });
    }

    function resetForm(){
      editingQcId = null;
      form.reset();
      const b = currentBatch && batchSummaries[currentBatch];
      // b.category có thể là chuỗi ghép nhiều ngành hàng (VD: "Dừa + Chanh")
      // khi lô ghép nhiều loại hàng — chỉ tự chọn sẵn khi khớp đúng 1 lựa chọn
      // có sẵn trong select, tránh gán giá trị không hợp lệ.
      if(b && b.category && KNOWN_QC_CATEGORIES.indexOf(b.category) !== -1){
        categorySelect.value = b.category;
      }
      populateChungLoaiOptions(currentBatch, '');
      updateChungLoaiVisibility();
      submitBtn.textContent = 'Thêm kết quả';
    }

    function openBatchModal(batchCode){
      currentBatch = batchCode;
      const b = batchSummaries[batchCode] || {
        batch: batchCode, ncc: null, category: 'Dừa', isDua: false,
        totalQty: 0, totalQtyText: null, ngayNhap: null, hasFactory: false, finishedQty: null,
        poEntries: [], saleType: null, orderStatus: null, note: ''
      };
      modalTitle.textContent = 'Lô hàng: ' + batchCode;
      renderInfoGrid(b);
      renderPoBreakdown(b);
      renderHistory(batchCode);
      resetForm();
      overlay.classList.add('active');
    }

    function closeBatchModal(){
      overlay.classList.remove('active');
      currentBatch = null;
      resetForm();
    }

    summaryTbody.addEventListener('click', function(e){
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      const tr = btn.closest('tr');
      if(tr && tr.dataset.batch) openBatchModal(tr.dataset.batch);
    });

    if(newBatchBtn){
      newBatchBtn.addEventListener('click', function(){
        const batchCode = window.prompt('Nhập tên lô hàng (VD: Minh Nhân - 25.26):');
        if(batchCode && batchCode.trim()) openBatchModal(batchCode.trim());
      });
    }

    closeBtn.addEventListener('click', closeBatchModal);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeBatchModal(); });
    cancelBtn.addEventListener('click', resetForm);

    historyTbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){
        const tr = editBtnEl.closest('tr');
        editingQcId = tr.dataset.id;
        categorySelect.value = tr.dataset.category || 'Dừa';
        populateChungLoaiOptions(currentBatch, tr.dataset.chungLoai || '');
        updateChungLoaiVisibility();
        document.getElementById('qc-result').value = tr.dataset.result || 'Chờ xác nhận';
        document.getElementById('qc-inspector').value = tr.dataset.inspector || '';
        document.getElementById('qc-note').value = tr.dataset.note || '';
        submitBtn.textContent = 'Lưu thay đổi';
        return;
      }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteQcCheck(delBtnEl.closest('tr')); return; }
    });

    function updateStats(){
      const todayStr = new Date().toISOString().slice(0, 10);
      if(statToday){
        statToday.textContent = String(allQcRows.filter(function(d){ return (d.created_at || '').slice(0, 10) === todayStr; }).length);
      }
      if(statPending){
        statPending.textContent = String(allQcRows.filter(function(d){ return d.result === 'Chờ xác nhận'; }).length);
      }
      if(statPass){
        const decided = allQcRows.filter(function(d){ return d.result && d.result !== 'Chờ xác nhận'; });
        if(decided.length){
          const passed = decided.filter(function(d){ return d.result === 'Đạt' || d.result === 'Đạt có điều kiện'; }).length;
          statPass.textContent = Math.round(passed / decided.length * 100) + '%';
        } else {
          statPass.textContent = '—';
        }
      }
    }

    async function loadAll(){
      try{
        const [rawRes, poRes, qcRes, batchInfoRes, stockRes] = await Promise.all([
          sb.from('raw_batches').select('*, factory_batches(*)'),
          sb.from('purchase_orders').select('*'),
          sb.from('qc_checks').select('*').order('created_at', { ascending: false }),
          sb.from('batch_info').select('*'),
          sb.from('factory_finished_stock').select('*')
        ]);
        [rawRes, poRes, qcRes, stockRes].forEach(function(r){ if(r.error) throw r.error; });
        // batch_info có thể chưa tồn tại nếu chưa chạy migration — bỏ qua lỗi
        // đó thay vì làm hỏng cả bảng tổng hợp.
        const batchInfoRows = batchInfoRes.error ? [] : (batchInfoRes.data || []);

        allQcRows = qcRes.data || [];
        batchSummaries = buildSummaries(rawRes.data || [], poRes.data || [], allQcRows, batchInfoRows, stockRes.data || []);
        sharedBatchSummaries = batchSummaries;
        notifyBatchSummaryChanged();
        populateQcSelectors();
        renderSummary();
        updateStats();

        if(currentBatch && overlay.classList.contains('active')){
          const b = batchSummaries[currentBatch];
          if(b){ renderInfoGrid(b); renderPoBreakdown(b); }
          renderHistory(currentBatch);
        }
      } catch(err){
        console.error('Không tải được dữ liệu Đánh giá chất lượng:', err);
        showSummaryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    if(qcMonthSelect) qcMonthSelect.addEventListener('change', renderSummary);
    if(qcYearSelect) qcYearSelect.addEventListener('change', renderSummary);

    showSummaryMessage('Đang tải dữ liệu...');
    loadAll();
    onRawBatchesChanged(loadAll);
    onFactoryProductionChanged(loadAll);
    onPurchaseOrdersChanged(loadAll);

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!currentBatch) return;
      const category = fieldVal('qc-category') || 'Dừa';
      const chungLoai = category === 'Dừa' ? (fieldVal('qc-chungloai') || null) : null;

      // Lô Dừa nhiều chủng loại mà không chọn chủng loại thì kết quả sẽ
      // không gắn được vào dòng nào ở bảng tổng hợp (mỗi dòng lọc theo đúng
      // chủng loại) — chặn sớm để tránh nhập nhầm rồi không thấy kết quả đâu.
      const b = batchSummaries[currentBatch];
      const needsVariety = category === 'Dừa' && b && b.duaVarieties.length > 1;
      if(needsVariety && !chungLoai){
        alert('Lô này có nhiều chủng loại dừa — vui lòng chọn chủng loại cần ghi kết quả kiểm.');
        return;
      }

      const payload = {
        batch_code: currentBatch,
        category: category,
        chung_loai: chungLoai,
        // Module này chỉ kiểm thành phẩm trước khi xuất khẩu — kiểm đầu vào
        // (nguyên liệu thô) thuộc phạm vi Vùng nguyên liệu, không ghi ở đây.
        check_type: 'Thành phẩm',
        result: fieldVal('qc-result'),
        inspector: fieldVal('qc-inspector') || null,
        note: fieldVal('qc-note') || null
      };

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
      try{
        if(editingQcId){
          const { error } = await sb.from('qc_checks').update(payload).eq('id', editingQcId);
          if(error) throw error;
        } else {
          const { error } = await sb.from('qc_checks').insert(payload);
          if(error) throw error;
        }
        await loadAll();
        resetForm();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  })();

  // ---- Logistics ----
  (function(){
    const timelineEl = document.getElementById('logistics-timeline');
    const timelineLabel = document.getElementById('logistics-timeline-label');
    const timelineInfo = document.getElementById('logistics-timeline-info');
    const shipmentTbody = document.getElementById('shipment-tbody');
    const STAGES = ['Kho nội địa', 'Cảng đi', 'Trên biển', 'Cảng đến', 'Giao khách hàng', 'Khách đã nhận hàng'];
    const STAGE_ICONS = {
      'Kho nội địa': 'ti-building-warehouse',
      'Cảng đi': 'ti-anchor',
      'Trên biển': 'ti-ship',
      'Cảng đến': 'ti-map-pin',
      'Giao khách hàng': 'ti-truck-delivery',
      'Khách đã nhận hàng': 'ti-circle-check'
    };

    let allShipments = [];
    let selectedShipmentId = null;
    let logisticsBootstrapped = false;

    // Lô hàng + sản phẩm phải khớp với module Đánh giá chất lượng (nguồn sự
    // thật duy nhất) — không cho tự nhập tay để tránh lệch dữ liệu giữa 2 nơi.
    const shipBatchSelect = document.getElementById('ship-batch');
    const shipProductInput = document.getElementById('ship-product');
    const logisticsMonthSelect = document.getElementById('logistics-month-select');
    const logisticsYearSelect = document.getElementById('logistics-year-select');

    // Bộ lọc tháng/năm chỉ áp lên BẢNG HIỂN THỊ — không được lọc thẳng vào
    // query Supabase, vì cùng 1 lần fetch này còn dùng để tính
    // sharedDeliveredShipments (Feedback KH cần TOÀN BỘ lô đã giao, bất kể
    // Logistics đang lọc theo tháng nào, để không mất cảnh báo quá hạn feedback
    // của các lô giao tháng trước).
    function shipmentPeriodParts(d){
      const p = periodParts(d.etd);
      if(p) return p;
      const b = sharedBatchSummaries[d.batch_code];
      return periodParts(b && b.periodDate);
    }
    function shipmentInSelectedPeriod(d){
      if(!logisticsYearSelect || !logisticsYearSelect.value) return true;
      const p = shipmentPeriodParts(d);
      if(!p) return false;
      if(p.year !== Number(logisticsYearSelect.value)) return false;
      if(logisticsMonthSelect && logisticsMonthSelect.value && p.month !== Number(logisticsMonthSelect.value)) return false;
      return true;
    }
    function populateLogisticsSelectors(rows){
      const years = rows.map(function(d){ const p = shipmentPeriodParts(d); return p ? p.year : null; }).filter(Boolean);
      populateMonthYearSelect(logisticsMonthSelect, logisticsYearSelect, years);
    }

    function knownBatchList(){
      return Object.values(sharedBatchSummaries)
        .filter(function(b){ return b.hasSourceInfo; })
        .sort(function(a, b){ return a.batch.localeCompare(b.batch); });
    }
    function productForBatch(batchCode){
      const b = sharedBatchSummaries[batchCode];
      return b ? (b.category || '') : '';
    }
    // Lô "Nội địa" không qua thủ tục xuất khẩu (hải quan, tàu biển...) nên
    // chỉ cần 2 giai đoạn: Kho nội địa → Khách đã nhận hàng. Lô "Xuất khẩu"
    // (hoặc chưa phân loại Hình thức) vẫn đủ các giai đoạn như cũ.
    const EXPORT_STAGE_OPTIONS = ['Kho nội địa', 'Cảng đi', 'Trên biển', 'Thông quan', 'Cảng đến', 'Giao khách hàng', 'Khách đã nhận hàng'];
    const DOMESTIC_STAGE_OPTIONS = ['Kho nội địa', 'Khách đã nhận hàng'];
    function updateStageOptions(batchCode, preserveValue){
      const select = document.getElementById('ship-stage');
      if(!select) return;
      const b = batchCode && sharedBatchSummaries[batchCode];
      const isDomestic = !!(b && b.saleType === 'Nội địa');
      const list = isDomestic ? DOMESTIC_STAGE_OPTIONS : EXPORT_STAGE_OPTIONS;
      const current = preserveValue !== undefined ? preserveValue : select.value;
      select.textContent = '';
      list.forEach(function(stage){
        const opt = document.createElement('option');
        opt.value = stage;
        opt.textContent = stage;
        select.appendChild(opt);
      });
      // Giá trị cũ không còn hợp lệ (VD: đang "Trên biển" mà lô vừa đổi
      // Hình thức sang Nội địa) thì reset về lựa chọn đầu tiên.
      select.value = list.indexOf(current) !== -1 ? current : list[0];
    }
    function populateBatchSelect(currentBatch){
      if(!shipBatchSelect) return;
      const known = knownBatchList();
      shipBatchSelect.textContent = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.disabled = true;
      placeholder.textContent = known.length ? 'Chọn lô hàng...' : 'Chưa có lô nào trong Đánh giá chất lượng';
      shipBatchSelect.appendChild(placeholder);
      known.forEach(function(b){
        const opt = document.createElement('option');
        opt.value = b.batch;
        opt.textContent = b.batch + (b.category ? ' (' + b.category + ')' : '');
        shipBatchSelect.appendChild(opt);
      });
      const isKnown = known.some(function(b){ return b.batch === currentBatch; });
      if(currentBatch && !isKnown){
        const lockedOpt = document.createElement('option');
        lockedOpt.value = currentBatch;
        lockedOpt.textContent = currentBatch + ' (chưa có trong Đánh giá chất lượng)';
        shipBatchSelect.appendChild(lockedOpt);
      }
      shipBatchSelect.value = currentBatch || '';
      // Lô cũ chưa từng khai báo bên QC: khóa lại, không cho đổi sang lô khác
      // chưa xác thực — phải bổ sung lô đó bên QC trước.
      shipBatchSelect.disabled = !!(currentBatch && !isKnown);
    }
    function syncProductField(fallbackProduct){
      if(!shipProductInput) return;
      const looked = shipBatchSelect ? productForBatch(shipBatchSelect.value) : '';
      shipProductInput.value = looked || fallbackProduct || '';
    }

    function stageIndex(stage){
      if(stage === 'Thông quan') return 2;
      const i = STAGES.indexOf(stage);
      return i === -1 ? 0 : i;
    }
    function stageBadgeClass(stage){
      return { 'Trên biển': 'amber', 'Thông quan': 'blue', 'Cảng đến': 'blue', 'Giao khách hàng': 'blue', 'Khách đã nhận hàng': 'green' }[stage] || 'gray';
    }

    function renderTimelineInfo(d){
      if(!timelineInfo) return;
      timelineInfo.textContent = '';
      const pairs = [
        ['Lô hàng', d.batch_code || '—'],
        ['PI/PO', d.pi_po || '—'],
        ['Sản phẩm', productForBatch(d.batch_code) || d.product || '—'],
        ['Vị trí hiện tại', d.location || '—'],
        ['ETD', fmtDate(d.etd)],
        ['ETA', fmtDate(d.eta)]
      ];
      pairs.forEach(function(pair){
        const item = document.createElement('div');
        const label = document.createElement('div');
        label.className = 'info-label';
        label.textContent = pair[0];
        const value = document.createElement('div');
        value.className = 'info-value';
        value.textContent = pair[1];
        item.appendChild(label);
        item.appendChild(value);
        timelineInfo.appendChild(item);
      });
    }

    function highlightSelectedRow(){
      if(!shipmentTbody) return;
      Array.prototype.forEach.call(shipmentTbody.querySelectorAll('tr[data-id]'), function(tr){
        tr.classList.toggle('row-selected', selectedShipmentId != null && tr.dataset.id === String(selectedShipmentId));
      });
    }

    function renderTimeline(rows){
      if(!timelineEl) return;
      const selected = selectedShipmentId != null && rows.find(function(d){ return String(d.id) === String(selectedShipmentId); });
      const featured = selected || rows.find(function(d){ return d.is_featured; }) || rows[0];
      if(!featured){
        timelineEl.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'muted';
        div.textContent = 'Chưa có lô vận chuyển nào.';
        timelineEl.appendChild(div);
        if(timelineLabel) timelineLabel.textContent = 'Hành trình lô nổi bật';
        if(timelineInfo) timelineInfo.textContent = '';
        return;
      }
      if(timelineLabel) timelineLabel.textContent = 'Hành trình lô ' + featured.batch_code;
      renderTimelineInfo(featured);
      const curIdx = stageIndex(featured.stage);
      timelineEl.innerHTML = '';
      STAGES.forEach(function(label, i){
        const step = document.createElement('div');
        step.className = 'tl-step' + (i < curIdx ? ' done' : (i === curIdx ? ' current' : ''));
        const line = document.createElement('div');
        line.className = 'tl-line';
        const dot = document.createElement('div');
        dot.className = 'tl-dot';
        const icon = document.createElement('i');
        icon.className = 'ti ' + (STAGE_ICONS[label] || 'ti-circle');
        dot.appendChild(icon);
        const lbl = document.createElement('div');
        lbl.className = 'tl-label';
        lbl.textContent = label;
        step.appendChild(line);
        step.appendChild(dot);
        step.appendChild(lbl);
        timelineEl.appendChild(step);
      });
      highlightSelectedRow();
    }

    if(shipmentTbody){
      shipmentTbody.addEventListener('click', function(e){
        if(e.target.closest('.row-edit-btn')) return;
        const tr = e.target.closest('tr[data-id]');
        if(!tr) return;
        selectedShipmentId = tr.dataset.id;
        renderTimeline(allShipments);
      });
    }

    const shipmentsModule = initCrudModule({
      table: 'shipments',
      overlayId: 'add-shipment-overlay',
      openBtnId: 'btn-open-add-shipment',
      closeBtnId: 'btn-close-add-shipment',
      cancelBtnId: 'btn-cancel-add-shipment',
      formId: 'form-add-shipment',
      tbodyId: 'shipment-tbody',
      modalTitleId: 'add-shipment-modal-title',
      submitBtnId: 'btn-submit-add-shipment',
      cellCount: 7,
      addTitle: 'Thêm lô vận chuyển',
      editTitle: 'Chỉnh sửa lô vận chuyển',
      addLabel: 'Thêm lô hàng',
      editLabel: 'Lưu thay đổi',
      orderBy: [{ column: 'eta', ascending: true }],
      emptyMessage: 'Chưa có lô vận chuyển nào.',
      emptyFilteredMessage: 'Không có lô vận chuyển nào trong kỳ đã chọn.',
      filterForDisplay: function(rows){ return rows.filter(shipmentInSelectedPeriod); },
      deleteLabel: function(tr){ return 'lô vận chuyển "' + (tr.dataset.batch || '') + '"'; },
      renderRow: function(tr, d){
        const productDisplay = productForBatch(d.batch_code) || d.product || '';
        tr.dataset.id = d.id;
        tr.dataset.batch = d.batch_code || '';
        tr.dataset.piPo = d.pi_po || '';
        tr.dataset.product = productDisplay;
        tr.dataset.stage = d.stage || '';
        tr.dataset.location = d.location || '';
        tr.dataset.etd = d.etd || '';
        tr.dataset.eta = d.eta || '';
        tr.dataset.receivedDate = d.received_date || '';
        tr.dataset.featured = d.is_featured ? '1' : '';

        tr.cells[0].textContent = d.batch_code;
        tr.cells[1].textContent = d.pi_po || '—';
        tr.cells[2].textContent = productDisplay || '—';
        tr.cells[3].textContent = '';
        const badge = document.createElement('span');
        badge.className = 'badge ' + stageBadgeClass(d.stage);
        badge.textContent = d.stage || '—';
        tr.cells[3].appendChild(badge);
        tr.cells[4].textContent = d.location || '—';
        tr.cells[4].className = 'muted';
        tr.cells[5].textContent = fmtDate(d.etd);
        tr.cells[6].textContent = fmtDate(d.eta);
      },
      fillForm: function(form, tr){
        populateBatchSelect(tr.dataset.batch || '');
        syncProductField(tr.dataset.product);
        updateStageOptions(tr.dataset.batch || '', tr.dataset.stage || 'Kho nội địa');
        document.getElementById('ship-pi-po').value = tr.dataset.piPo || '';
        document.getElementById('ship-location').value = tr.dataset.location || '';
        document.getElementById('ship-etd').value = tr.dataset.etd || '';
        document.getElementById('ship-eta').value = tr.dataset.eta || '';
        document.getElementById('ship-received-date').value = tr.dataset.receivedDate || '';
        document.getElementById('ship-featured').checked = !!tr.dataset.featured;
      },
      readForm: function(form){
        const stage = fieldVal('ship-stage');
        const enteredReceivedDate = fieldVal('ship-received-date');
        return {
          batch_code: fieldVal('ship-batch'),
          pi_po: fieldVal('ship-pi-po') || null,
          product: fieldVal('ship-product') || null,
          stage: stage,
          location: fieldVal('ship-location') || null,
          etd: fieldVal('ship-etd') || null,
          eta: fieldVal('ship-eta') || null,
          // Chuyển sang "Khách đã nhận hàng" mà không nhập ngày cụ thể thì tự
          // lấy ngày hôm nay, để Feedback KH luôn tính được hạn 3 ngày ngay.
          received_date: enteredReceivedDate || (stage === 'Khách đã nhận hàng' ? todayStr() : null),
          is_featured: document.getElementById('ship-featured').checked
        };
      },
      validate: function(payload){ return !!payload.batch_code; },
      afterRender: function(rows){
        allShipments = rows;
        populateLogisticsSelectors(rows);
        renderTimeline(rows);
        sharedDeliveredShipments = rows
          .filter(function(d){ return d.stage === 'Khách đã nhận hàng'; })
          .map(function(d){ return { batch_code: d.batch_code, received_date: d.received_date || null }; })
          .sort(function(a, b){ return a.batch_code.localeCompare(b.batch_code); });
        notifyDeliveredShipmentsChanged();
        // Lần đầu tải xong mới có options cho select năm (mặc định chọn năm
        // gần nhất) — render lại 1 lần để bảng khớp ngay với lựa chọn mặc
        // định đó, không đợi người dùng tự đổi select.
        if(!logisticsBootstrapped){
          logisticsBootstrapped = true;
          if(shipmentsModule) shipmentsModule.refreshRows();
        }
      }
    });

    if(logisticsMonthSelect) logisticsMonthSelect.addEventListener('change', function(){ if(shipmentsModule) shipmentsModule.refreshRows(); });
    if(logisticsYearSelect) logisticsYearSelect.addEventListener('change', function(){ if(shipmentsModule) shipmentsModule.refreshRows(); });

    const shipOpenBtn = document.getElementById('btn-open-add-shipment');
    if(shipOpenBtn){
      shipOpenBtn.addEventListener('click', function(){
        populateBatchSelect(null);
        syncProductField();
        updateStageOptions(null);
      });
    }
    if(shipBatchSelect){
      shipBatchSelect.addEventListener('change', function(){
        syncProductField();
        updateStageOptions(shipBatchSelect.value);
      });
    }
    // Vừa chọn "Khách đã nhận hàng" trong modal thì tự điền ngay ngày hôm nay
    // vào ô "Ngày khách nhận hàng" (nếu còn trống) để người dùng thấy ngay
    // hạn phản hồi thay vì phải nhớ điền tay — vẫn sửa lại được nếu cần.
    const shipStageSelect = document.getElementById('ship-stage');
    const shipReceivedDateInput = document.getElementById('ship-received-date');
    if(shipStageSelect && shipReceivedDateInput){
      shipStageSelect.addEventListener('change', function(){
        if(shipStageSelect.value === 'Khách đã nhận hàng' && !shipReceivedDateInput.value){
          shipReceivedDateInput.value = todayStr();
        }
      });
    }
    // Đánh giá chất lượng đổi (thêm/sửa lô) → danh sách lô chọn được và cột
    // Sản phẩm trong bảng logistics phải cập nhật theo ngay, không cần tải lại.
    onBatchSummaryChanged(function(){
      populateBatchSelect(shipBatchSelect ? shipBatchSelect.value : null);
      syncProductField();
      updateStageOptions(shipBatchSelect ? shipBatchSelect.value : null);
      if(shipmentsModule) shipmentsModule.refreshRows();
    });
  })();

  // ---- Chứng từ ----
  // Bảng chính không còn "thêm lô" thủ công — mỗi lô hàng thật trong
  // sharedBatchSummaries (nguồn QC) tự động có 1 dòng. Trạng thái checklist
  // ghép vào từ documents_checklist theo batch_code nếu đã có; lô nào chưa
  // có bản ghi thì coi như thiếu toàn bộ. Bấm sửa để nhập/cập nhật, lưu sẽ
  // update nếu đã có bản ghi hoặc insert mới nếu chưa.
  (function(){
    const missingTbody = document.getElementById('doc-missing-tbody');
    const missingLabel = document.getElementById('doc-missing-label');
    const tbody = document.getElementById('doc-tbody');
    const overlay = document.getElementById('add-doc-overlay');
    const closeBtn = document.getElementById('btn-close-add-doc');
    const cancelBtn = document.getElementById('btn-cancel-add-doc');
    const form = document.getElementById('form-add-doc');
    const submitBtn = document.getElementById('btn-submit-add-doc');
    const batchDisplay = document.getElementById('doc-batch-display');
    const docMonthSelect = document.getElementById('doc-month-select');
    const docYearSelect = document.getElementById('doc-year-select');

    if(!tbody || !overlay || !form || !sb) return;
    const TABLE = 'documents_checklist';
    const DOC_FIELDS = [
      { key: 'contract_ok', label: 'Hợp đồng' },
      { key: 'co_ok', label: 'C/O' },
      { key: 'quarantine_ok', label: 'Kiểm dịch thực vật' },
      { key: 'bill_of_lading_ok', label: 'Vận đơn gốc' }
    ];

    let docRows = [];
    let editingRow = null;

    function checkIcon(ok){
      const i = document.createElement('i');
      i.className = ok ? 'ti ti-check icon-ok' : 'ti ti-x icon-warn';
      return i;
    }

    function mergedRows(){
      // Lô "Nội địa" không cần theo dõi chứng từ xuất khẩu (hợp đồng, C/O,
      // kiểm dịch, vận đơn...) vì thủ tục trong nước khách hàng tự lo — chỉ
      // hiện lô "Xuất khẩu" (hoặc chưa phân loại Hình thức) ở đây. Đồng thời
      // chỉ hiện khi lô đã "Đã đóng hàng" ở Đánh giá chất lượng — chưa đóng
      // hàng thì chưa có gì để theo dõi chứng từ, tránh nhắc thiếu chứng từ
      // quá sớm cho lô còn đang sản xuất/chưa đóng.
      const batches = Object.values(sharedBatchSummaries)
        .filter(function(b){ return b.hasSourceInfo && b.saleType !== 'Nội địa' && b.orderStatus === 'Đã đóng hàng'; })
        .map(function(b){ return b.batch; })
        .sort();
      return batches.map(function(batch){
        const d = docRows.find(function(r){ return r.batch_code === batch; });
        return {
          batch: batch,
          docId: d ? d.id : null,
          market: d ? d.market : null,
          deadline: d ? d.deadline : null,
          contract_ok: d ? !!d.contract_ok : false,
          co_ok: d ? !!d.co_ok : false,
          quarantine_ok: d ? !!d.quarantine_ok : false,
          bill_of_lading_ok: d ? !!d.bill_of_lading_ok : false
        };
      });
    }

    function showMessage(text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    function renderTable(rows){
      tbody.textContent = '';
      if(!rows.length){ showMessage('Chưa có lô hàng nào.'); return; }
      rows.forEach(function(d){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.batch = d.batch;
        const batchTd = document.createElement('td');
        batchTd.textContent = d.batch;
        tr.appendChild(batchTd);
        [d.contract_ok, d.co_ok, d.quarantine_ok, d.bill_of_lading_ok].forEach(function(ok){
          const td = document.createElement('td');
          td.className = 'checklist-icons';
          td.appendChild(checkIcon(ok));
          tr.appendChild(td);
        });
        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.setAttribute('aria-label', 'Chỉnh sửa');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        actionsTd.appendChild(editBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      });
    }

    function renderMissing(rows){
      if(!missingTbody) return;
      const missing = rows.filter(function(d){
        return !d.contract_ok || !d.co_ok || !d.quarantine_ok || !d.bill_of_lading_ok;
      });
      if(missingLabel) missingLabel.textContent = missing.length + ' lô đang thiếu chứng từ trước khi thông quan';
      missingTbody.textContent = '';
      if(!missing.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Không có lô nào thiếu chứng từ.';
        tr.appendChild(td);
        missingTbody.appendChild(tr);
        return;
      }
      missing.forEach(function(d){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        const batchTd = document.createElement('td');
        batchTd.textContent = d.batch;
        const missingFields = DOC_FIELDS.filter(function(f){ return !d[f.key]; }).map(function(f){ return f.label; });
        const missingTd = document.createElement('td');
        missingTd.className = 'warn-text';
        missingTd.textContent = missingFields.join(', ');
        const marketTd = document.createElement('td');
        marketTd.textContent = d.market || '—';
        const deadlineTd = document.createElement('td');
        deadlineTd.textContent = fmtDate(d.deadline);
        tr.appendChild(batchTd); tr.appendChild(missingTd); tr.appendChild(marketTd); tr.appendChild(deadlineTd);
        missingTbody.appendChild(tr);
      });
    }

    // Bộ lọc tháng/năm chỉ áp lên bảng checklist chính — "Lô đang thiếu chứng
    // từ" (renderMissing) luôn hiện đủ vì đó là hàng đợi cảnh báo, không phải
    // danh sách duyệt theo kỳ.
    function populateDocSelectors(){
      const years = Object.values(sharedBatchSummaries)
        .map(function(b){ const p = periodParts(b.periodDate); return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(docMonthSelect, docYearSelect, years);
    }
    function inSelectedPeriod(batch){
      if(!docYearSelect || !docYearSelect.value) return true;
      const b = sharedBatchSummaries[batch];
      const p = periodParts(b && b.periodDate);
      if(!p) return false;
      if(p.year !== Number(docYearSelect.value)) return false;
      if(docMonthSelect && docMonthSelect.value && p.month !== Number(docMonthSelect.value)) return false;
      return true;
    }

    function renderAll(){
      const rows = mergedRows();
      populateDocSelectors();
      renderTable(rows.filter(function(r){ return inSelectedPeriod(r.batch); }));
      renderMissing(rows);
    }

    async function loadDocs(){
      try{
        const { data, error } = await sb.from(TABLE).select('*');
        if(error) throw error;
        docRows = data || [];
        renderAll();
      } catch(err){
        console.error('Không tải được dữ liệu Chứng từ:', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    if(docMonthSelect) docMonthSelect.addEventListener('change', renderAll);
    if(docYearSelect) docYearSelect.addEventListener('change', renderAll);

    showMessage('Đang tải dữ liệu...');
    loadDocs();
    onBatchSummaryChanged(renderAll);

    function openEditModal(batch){
      const row = mergedRows().find(function(r){ return r.batch === batch; });
      if(!row) return;
      editingRow = row;
      batchDisplay.textContent = row.batch;
      document.getElementById('doc-batch').value = row.batch;
      document.getElementById('doc-market').value = row.market || '';
      document.getElementById('doc-deadline').value = row.deadline || '';
      document.getElementById('doc-contract').checked = row.contract_ok;
      document.getElementById('doc-co').checked = row.co_ok;
      document.getElementById('doc-quarantine').checked = row.quarantine_ok;
      document.getElementById('doc-bol').checked = row.bill_of_lading_ok;
      overlay.classList.add('active');
    }
    function closeModal(){ overlay.classList.remove('active'); form.reset(); editingRow = null; }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
    tbody.addEventListener('click', function(e){
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      openEditModal(btn.closest('tr').dataset.batch);
    });

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingRow) return;
      const payload = {
        batch_code: editingRow.batch,
        market: fieldVal('doc-market') || null,
        deadline: fieldVal('doc-deadline') || null,
        contract_ok: document.getElementById('doc-contract').checked,
        co_ok: document.getElementById('doc-co').checked,
        quarantine_ok: document.getElementById('doc-quarantine').checked,
        bill_of_lading_ok: document.getElementById('doc-bol').checked
      };
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
      try{
        if(editingRow.docId){
          const { error } = await sb.from(TABLE).update(payload).eq('id', editingRow.docId);
          if(error) throw error;
        } else {
          const { error } = await sb.from(TABLE).insert(payload);
          if(error) throw error;
        }
        await loadDocs();
        notifyDocumentsChecklistChanged();
        closeModal();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  })();

  // ---- Feedback KH ----
  // Lô hàng chọn được trong modal lấy từ Logistics (sharedDeliveredShipments,
  // chỉ những lô đã ở trạng thái "Khách đã nhận hàng") thay vì gõ tay, để 2
  // module luôn khớp dữ liệu. Ngày nhận hàng của lô đó + 3 ngày là hạn khách
  // phải gửi feedback — bảng "Lô hàng cần feedback" liệt kê các lô đã nhận
  // hàng nhưng chưa có bản ghi feedback nào, cảnh báo đỏ nếu đã quá hạn.
  (function(){
    const overlay = document.getElementById('add-feedback-overlay');
    const openBtn = document.getElementById('btn-open-add-feedback');
    const closeBtn = document.getElementById('btn-close-add-feedback');
    const cancelBtn = document.getElementById('btn-cancel-add-feedback');
    const form = document.getElementById('form-add-feedback');
    const list = document.getElementById('feedback-list');
    const modalTitle = document.getElementById('add-feedback-modal-title');
    const submitBtn = document.getElementById('btn-submit-add-feedback');
    const pendingTbody = document.getElementById('feedback-pending-tbody');
    const pendingLabel = document.getElementById('feedback-pending-label');
    const fbBatchSelect = document.getElementById('fb-batch');
    const fbBatchInfo = document.getElementById('fb-batch-info');
    const feedbackMonthSelect = document.getElementById('feedback-month-select');
    const feedbackYearSelect = document.getElementById('feedback-year-select');

    if(!overlay || !form || !list || !sb) return;
    const TABLE = 'feedbacks';
    const FEEDBACK_DEADLINE_DAYS = 3;
    let editingCard = null;
    let allFeedbacks = [];

    function deliveredList(){
      return sharedDeliveredShipments.slice().sort(function(a, b){ return a.batch_code.localeCompare(b.batch_code); });
    }
    function deliveryForBatch(batchCode){
      return sharedDeliveredShipments.find(function(d){ return d.batch_code === batchCode; }) || null;
    }

    function populateBatchSelect(currentBatch){
      if(!fbBatchSelect) return;
      const known = deliveredList();
      fbBatchSelect.textContent = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.disabled = true;
      placeholder.textContent = known.length ? 'Chọn lô hàng...' : 'Chưa có lô nào đã nhận hàng ở Logistics';
      fbBatchSelect.appendChild(placeholder);
      known.forEach(function(d){
        const opt = document.createElement('option');
        opt.value = d.batch_code;
        opt.textContent = d.batch_code + (d.received_date ? ' (nhận ' + fmtDate(d.received_date) + ')' : '');
        fbBatchSelect.appendChild(opt);
      });
      const isKnown = known.some(function(d){ return d.batch_code === currentBatch; });
      if(currentBatch && !isKnown){
        const lockedOpt = document.createElement('option');
        lockedOpt.value = currentBatch;
        lockedOpt.textContent = currentBatch + ' (không còn ở trạng thái đã nhận hàng)';
        fbBatchSelect.appendChild(lockedOpt);
      }
      fbBatchSelect.value = currentBatch || '';
      fbBatchSelect.disabled = !!(currentBatch && !isKnown);
      updateBatchInfo();
    }
    function updateBatchInfo(){
      if(!fbBatchInfo) return;
      const delivery = fbBatchSelect ? deliveryForBatch(fbBatchSelect.value) : null;
      if(delivery && delivery.received_date){
        const deadline = addDays(delivery.received_date, FEEDBACK_DEADLINE_DAYS);
        fbBatchInfo.textContent = 'Nhận hàng ' + fmtDate(delivery.received_date) + ' — hạn phản hồi ' + fmtDate(deadline) +
          (deadline && todayStr() > deadline ? ' (đã quá hạn)' : '.');
      } else {
        fbBatchInfo.textContent = 'Danh sách lấy từ Logistics (lô đã ở trạng thái "Khách đã nhận hàng").';
      }
    }
    if(fbBatchSelect) fbBatchSelect.addEventListener('change', updateBatchInfo);

    function openModal(){ overlay.classList.add('active'); }
    function closeModal(){ overlay.classList.remove('active'); form.reset(); editingCard = null; }

    function openAddModal(){
      editingCard = null;
      form.reset();
      populateBatchSelect(null);
      modalTitle.textContent = 'Thêm feedback';
      submitBtn.textContent = 'Thêm feedback';
      openModal();
    }
    function openEditModal(card){
      editingCard = card;
      populateBatchSelect(card.dataset.batch || '');
      document.getElementById('fb-market').value = card.dataset.market || '';
      document.getElementById('fb-rating').value = card.dataset.rating || '5';
      document.getElementById('fb-text').value = card.dataset.text || '';
      const statusRadio = form.querySelector('input[name="fb-status"][value="' + card.dataset.status + '"]');
      if(statusRadio) statusRadio.checked = true;
      modalTitle.textContent = 'Chỉnh sửa feedback';
      submitBtn.textContent = 'Lưu thay đổi';
      openModal();
    }

    openBtn.addEventListener('click', openAddModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });
    list.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){ openEditModal(editBtnEl.closest('.feedback-card')); return; }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteFeedback(delBtnEl.closest('.feedback-card')); return; }
    });

    async function deleteFeedback(card){
      const id = card.dataset.id;
      if(!id) return;
      if(!confirm('Xóa feedback lô "' + (card.dataset.batch || '') + '"? Hành động không thể hoàn tác.')) return;
      try{
        const { error } = await sb.from(TABLE).delete().eq('id', id);
        if(error) throw error;
        await refreshList();
        notifyFeedbacksChanged();
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    function starIcon(filled){
      const i = document.createElement('i');
      i.className = 'ti ti-star-filled' + (filled ? ' filled' : '');
      return i;
    }

    function createCard(d){
      const card = document.createElement('div');
      card.className = 'feedback-card';
      card.dataset.id = d.id;
      card.dataset.batch = d.batch_code || '';
      card.dataset.market = d.market || '';
      card.dataset.rating = d.rating != null ? d.rating : '5';
      card.dataset.text = d.feedback_text || '';
      card.dataset.status = d.status || '';

      const top = document.createElement('div');
      top.className = 'feedback-top';
      const left = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = d.batch_code;
      left.appendChild(strong);
      if(d.market){
        const meta = document.createElement('span');
        meta.className = 'feedback-meta';
        meta.textContent = ' · ' + d.market;
        left.appendChild(meta);
      }
      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '10px';
      const stars = document.createElement('div');
      stars.className = 'stars';
      const rating = d.rating || 0;
      for(let i = 1; i <= 5; i++) stars.appendChild(starIcon(i <= rating));
      right.appendChild(stars);
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-edit-btn';
      editBtn.setAttribute('aria-label', 'Chỉnh sửa');
      editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
      right.appendChild(editBtn);
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'row-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Xóa');
      deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
      right.appendChild(deleteBtn);
      top.appendChild(left);
      top.appendChild(right);

      const text = document.createElement('div');
      text.className = 'feedback-text';
      text.textContent = d.feedback_text || '';

      const statusRow = document.createElement('div');
      statusRow.style.marginTop = '10px';
      const badge = document.createElement('span');
      badge.className = 'badge ' + (d.status === 'Đã xử lý' ? 'green' : 'red');
      badge.textContent = d.status || 'Chưa xử lý';
      statusRow.appendChild(badge);

      card.appendChild(top);
      card.appendChild(text);
      card.appendChild(statusRow);
      return card;
    }

    function showMessage(text){
      list.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'muted';
      div.textContent = text;
      list.appendChild(div);
    }

    function renderPending(){
      if(!pendingTbody) return;
      const pending = deliveredList().filter(function(d){
        return !allFeedbacks.some(function(f){ return f.batch_code === d.batch_code; });
      });
      if(pendingLabel) pendingLabel.textContent = 'Lô hàng cần feedback (' + pending.length + ')';
      pendingTbody.textContent = '';
      if(!pending.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Không có lô nào đang chờ feedback.';
        tr.appendChild(td);
        pendingTbody.appendChild(tr);
        return;
      }
      const today = todayStr();
      pending.forEach(function(d){
        const deadline = d.received_date ? addDays(d.received_date, FEEDBACK_DEADLINE_DAYS) : null;
        const overdue = !!deadline && today > deadline;
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        const batchTd = document.createElement('td');
        batchTd.textContent = d.batch_code;
        const receivedTd = document.createElement('td');
        receivedTd.textContent = fmtDate(d.received_date);
        const deadlineTd = document.createElement('td');
        deadlineTd.textContent = deadline ? fmtDate(deadline) : '—';
        if(overdue) deadlineTd.className = 'warn-text';
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge ' + (overdue ? 'red' : (deadline ? 'amber' : 'gray'));
        badge.textContent = !deadline ? 'Chưa rõ ngày nhận' : (overdue ? 'Quá hạn' : 'Còn hạn');
        statusTd.appendChild(badge);
        tr.appendChild(batchTd); tr.appendChild(receivedTd); tr.appendChild(deadlineTd); tr.appendChild(statusTd);
        pendingTbody.appendChild(tr);
      });
    }

    // Bộ lọc tháng/năm chỉ áp lên "Feedback gần đây" — bảng "Lô hàng cần
    // feedback" (renderPending) luôn hiện đủ vì đó là hàng đợi cần xử lý.
    // Dùng periodDate của lô (sharedBatchSummaries) chứ không phải created_at
    // của feedback, để nhất quán với các module khác.
    function populateFeedbackSelectors(){
      const years = Object.values(sharedBatchSummaries)
        .map(function(b){ const p = periodParts(b.periodDate); return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(feedbackMonthSelect, feedbackYearSelect, years);
    }
    function inSelectedPeriod(batchCode){
      if(!feedbackYearSelect || !feedbackYearSelect.value) return true;
      const b = sharedBatchSummaries[batchCode];
      const p = periodParts(b && b.periodDate);
      if(!p) return false;
      if(p.year !== Number(feedbackYearSelect.value)) return false;
      if(feedbackMonthSelect && feedbackMonthSelect.value && p.month !== Number(feedbackMonthSelect.value)) return false;
      return true;
    }

    function renderList(){
      populateFeedbackSelectors();
      list.innerHTML = '';
      const filtered = allFeedbacks.filter(function(d){ return inSelectedPeriod(d.batch_code); });
      if(!filtered.length){ showMessage(allFeedbacks.length ? 'Không có feedback nào trong kỳ đã chọn.' : 'Chưa có feedback nào.'); }
      else filtered.forEach(function(d){ list.appendChild(createCard(d)); });
    }

    async function refreshList(){
      try{
        const { data, error } = await sb.from(TABLE).select('*').order('created_at', { ascending: false });
        if(error) throw error;
        allFeedbacks = data || [];
        renderList();
        renderPending();
      } catch(err){
        console.error('Không tải được dữ liệu từ Supabase (feedbacks):', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.');
      }
    }

    if(feedbackMonthSelect) feedbackMonthSelect.addEventListener('change', renderList);
    if(feedbackYearSelect) feedbackYearSelect.addEventListener('change', renderList);

    showMessage('Đang tải dữ liệu...');
    refreshList();
    onDeliveredShipmentsChanged(function(){
      populateBatchSelect(fbBatchSelect ? fbBatchSelect.value : null);
      renderPending();
    });
    onBatchSummaryChanged(renderList);

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const payload = {
        batch_code: fieldVal('fb-batch'),
        market: fieldVal('fb-market') || null,
        rating: numOrNull(fieldVal('fb-rating')),
        feedback_text: fieldVal('fb-text') || null,
        status: form.querySelector('input[name="fb-status"]:checked').value
      };
      if(!payload.batch_code) return;

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang lưu...';
      try{
        if(editingCard){
          const { error } = await sb.from(TABLE).update(payload).eq('id', editingCard.dataset.id);
          if(error) throw error;
        } else {
          const { error } = await sb.from(TABLE).insert(payload);
          if(error) throw error;
        }
        await refreshList();
        notifyFeedbacksChanged();
        closeModal();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  })();

  // ---- Xưởng sản xuất ----
  // Bảng này tổng hợp trực tiếp từ Vùng nguyên liệu: mỗi lô hàng gồm nhiều
  // đợt nhập từ nhiều NCC khác nhau (đến khi đủ số lượng cho đơn), và MỖI
  // ĐỢT NHẬP được chế biến như 1 lượt riêng — có ngày sản xuất/thành phẩm/
  // hao hụt/bắt đầu/dự kiến xong riêng. Không còn "Thêm lô sản xuất" thủ công
  // nữa: mỗi dòng tự sinh từ raw_batches, bấm Sửa để điền/cập nhật thông tin
  // sản xuất cho đúng đợt đó (upsert theo raw_batch_id).
  (function(){
    const statActive = document.getElementById('stat-factory-active');
    const statLoss = document.getElementById('stat-factory-loss');
    const statDuration = document.getElementById('stat-factory-duration');

    const closeFactoryBtn = document.getElementById('btn-close-add-factory');
    const cancelFactoryBtn = document.getElementById('btn-cancel-add-factory');
    const factoryForm = document.getElementById('form-add-factory');
    const factoryTbody = document.getElementById('factory-tbody');
    const factoryOverlay = document.getElementById('add-factory-overlay');
    const factoryModalTitle = document.getElementById('add-factory-modal-title');
    const factoryModalBatchInfo = document.getElementById('factory-modal-batch-info');
    const factorySubmitBtn = document.getElementById('btn-submit-add-factory');
    const FACTORY_COLS = 13;
    const factoryMonthSelect = document.getElementById('factory-month-select');
    const factoryYearSelect = document.getElementById('factory-year-select');

    if(!factoryOverlay || !factoryForm || !factoryTbody || !sb) return;

    // Danh sách năm lấy riêng từ ngay_nhap (không phụ thuộc rows đã lọc của
    // lần fetch trước) — cùng cột đang dùng để tính periodDate cho lô Dừa.
    async function loadFactoryYears(){
      if(!factoryYearSelect) return;
      try{
        const { data, error } = await sb.from('raw_batches').select('ngay_nhap');
        if(error) throw error;
        const years = (data || []).map(function(r){ const p = periodParts(r.ngay_nhap); return p ? p.year : null; }).filter(Boolean);
        populateMonthYearSelect(factoryMonthSelect, factoryYearSelect, years);
      } catch(err){
        populateMonthYearSelect(factoryMonthSelect, factoryYearSelect, []);
      }
    }

    let editingRawBatchId = null;
    let editingBatchLabel = '';

    function parseQty(s){
      if(s === undefined || s === null || String(s).trim() === '') return null;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? null : n;
    }
    function fmtQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' trái'; }
    function fmtBoxQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' thùng'; }
    // Số lượng thùng = Thành phẩm (trái) ÷ Quy cách (số trái/thùng), làm
    // tròn xuống vì không đóng được thùng lẻ.
    function boxCount(finishedQty, quyCach){
      if(finishedQty == null || !quyCach) return null;
      return Math.floor(Number(finishedQty) / Number(quyCach));
    }
    // Bắt đầu/Kết thúc là input type="time" (HH:MM) — trừ ra số giờ xử lý.
    // Nếu Kết thúc nhỏ hơn Bắt đầu thì coi như kéo sang hôm sau (qua đêm).
    function computeDurationHours(start, finish){
      if(!start || !finish) return null;
      const [sh, sm] = start.split(':').map(Number);
      const [fh, fm] = finish.split(':').map(Number);
      if([sh, sm, fh, fm].some(isNaN)) return null;
      let diffMin = (fh * 60 + fm) - (sh * 60 + sm);
      if(diffMin < 0) diffMin += 24 * 60;
      return Math.round((diffMin / 60) * 10) / 10;
    }
    // raw_batch_id có ràng buộc unique nên PostgREST trả factory_batches là 1
    // object (quan hệ 1-1), không phải mảng — nhưng phòng khi khác đi thì vẫn
    // chấp nhận cả 2 dạng.
    function getFb(r){
      if(!r.factory_batches) return null;
      return Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches;
    }

    function showFactoryMessage(text, color){
      factoryTbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = FACTORY_COLS;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      factoryTbody.appendChild(tr);
    }

    function renderFactoryRows(rawRows){
      factoryTbody.textContent = '';
      if(!rawRows.length){ showFactoryMessage('Chưa có lô nguyên liệu nào.'); return; }

      // Gom theo lô hàng để gộp (rowspan) cột Lô hàng + Tổng số lượng thùng
      const groups = [];
      const groupIndex = {};
      rawRows.forEach(function(r){
        const key = r.batch || '';
        if(!(key in groupIndex)){ groupIndex[key] = groups.length; groups.push([]); }
        groups[groupIndex[key]].push(r);
      });

      groups.forEach(function(items){
        const rowspan = items.length;
        // Tổng số lượng thùng = cộng dồn số thùng TỪNG đợt (mỗi đợt có thể
        // khác Quy cách) — đợt nào chưa điền Quy cách thì không tính được,
        // bỏ qua đợt đó thay vì làm sai cả tổng.
        let totalBoxes = null;
        items.forEach(function(r){
          const fb = getFb(r);
          const boxes = fb ? boxCount(fb.finished_qty, fb.quy_cach) : null;
          if(boxes != null) totalBoxes = (totalBoxes || 0) + boxes;
        });

        items.forEach(function(r, idx){
          const fb = getFb(r);
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.rawId = r.id;
          tr.dataset.factoryId = fb ? fb.id : '';
          tr.dataset.batch = r.batch || '';
          tr.dataset.ncc = r.ncc || '';
          tr.dataset.soluong = r.soluong || '';
          tr.dataset.ngayNhap = r.ngay_nhap || '';
          tr.dataset.productionDate = fb && fb.production_date ? fb.production_date : '';
          tr.dataset.finishedQty = fb && fb.finished_qty != null ? fb.finished_qty : '';
          tr.dataset.start = fb && fb.start_time ? fb.start_time : '';
          tr.dataset.finish = fb && fb.expected_finish ? fb.expected_finish : '';
          tr.dataset.duration = fb && fb.duration_hours != null ? fb.duration_hours : '';
          tr.dataset.quyCach = fb && fb.quy_cach != null ? fb.quy_cach : '';

          if(idx === 0){
            const batchTd = document.createElement('td');
            batchTd.rowSpan = rowspan;
            batchTd.textContent = r.batch;
            tr.appendChild(batchTd);
          }

          const nccTd = document.createElement('td');
          nccTd.textContent = r.ncc || '—';
          tr.appendChild(nccTd);

          const varietyTd = document.createElement('td');
          varietyTd.className = 'muted';
          varietyTd.textContent = r.chung_loai || '—';
          tr.appendChild(varietyTd);

          const qtyTd = document.createElement('td');
          qtyTd.className = 'muted';
          qtyTd.textContent = r.soluong ? r.soluong + ' trái' : '—';
          tr.appendChild(qtyTd);

          const dateTd = document.createElement('td');
          dateTd.className = 'muted';
          dateTd.textContent = r.ngay_nhap ? fmtDate(r.ngay_nhap) : '—';
          tr.appendChild(dateTd);

          const prodDateTd = document.createElement('td');
          prodDateTd.className = 'muted';
          prodDateTd.textContent = fb && fb.production_date ? fmtDate(fb.production_date) : '—';
          tr.appendChild(prodDateTd);

          const finishedTd = document.createElement('td');
          finishedTd.className = 'muted';
          finishedTd.textContent = fb ? fmtQty(fb.finished_qty) : '—';
          tr.appendChild(finishedTd);

          const quyCachTd = document.createElement('td');
          quyCachTd.className = 'muted';
          quyCachTd.textContent = fb && fb.quy_cach != null ? fb.quy_cach + ' trái/thùng' : '—';
          tr.appendChild(quyCachTd);

          const inputQty = parseQty(r.soluong);
          const outputQty = fb && fb.finished_qty != null ? Number(fb.finished_qty) : null;
          const lossTd = document.createElement('td');
          if(inputQty && outputQty != null && inputQty > 0){
            const loss = (1 - outputQty / inputQty) * 100;
            lossTd.textContent = loss.toFixed(0) + '%';
            lossTd.className = loss > 15 ? 'warn-text' : 'muted';
          } else {
            lossTd.textContent = '—';
            lossTd.className = 'muted';
          }
          tr.appendChild(lossTd);

          const startTd = document.createElement('td');
          startTd.className = 'muted';
          startTd.textContent = (fb && fb.start_time) || '—';
          tr.appendChild(startTd);

          const finishTd = document.createElement('td');
          finishTd.className = 'muted';
          finishTd.textContent = (fb && fb.expected_finish) || '—';
          tr.appendChild(finishTd);

          if(idx === 0){
            const totalTd = document.createElement('td');
            totalTd.rowSpan = rowspan;
            totalTd.textContent = fmtBoxQty(totalBoxes);
            tr.appendChild(totalTd);
          }

          const actionsTd = document.createElement('td');
          actionsTd.className = 'row-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'row-edit-btn';
          editBtn.setAttribute('aria-label', 'Chỉnh sửa');
          editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
          actionsTd.appendChild(editBtn);
          tr.appendChild(actionsTd);

          factoryTbody.appendChild(tr);
        });
      });
    }

    function updateFactoryStats(rawRows){
      const withFb = rawRows.map(function(r){ return { r: r, fb: getFb(r) }; });

      if(statActive){
        const active = withFb.filter(function(x){ return !x.fb || x.fb.finished_qty == null; }).length;
        statActive.textContent = String(active);
      }

      const lossRows = withFb.filter(function(x){
        const input = parseQty(x.r.soluong);
        return x.fb && x.fb.finished_qty != null && input && input > 0;
      });
      if(statLoss){
        if(lossRows.length){
          const avgLoss = lossRows.reduce(function(sum, x){
            const input = parseQty(x.r.soluong);
            return sum + (1 - Number(x.fb.finished_qty) / input) * 100;
          }, 0) / lossRows.length;
          statLoss.textContent = avgLoss.toFixed(0) + '%';
        } else {
          statLoss.textContent = '—';
        }
      }

      const durationRows = withFb.filter(function(x){ return x.fb && x.fb.duration_hours != null; });
      if(statDuration){
        if(durationRows.length){
          const avgDuration = durationRows.reduce(function(sum, x){ return sum + Number(x.fb.duration_hours); }, 0) / durationRows.length;
          statDuration.textContent = avgDuration.toFixed(1) + ' giờ';
        } else {
          statDuration.textContent = '—';
        }
      }
    }

    async function refreshFactoryRows(){
      try{
        let q = sb.from('raw_batches').select('*, factory_batches(*)');
        if(factoryYearSelect && factoryYearSelect.value){
          const range = periodRange(Number(factoryYearSelect.value), factoryMonthSelect && factoryMonthSelect.value ? Number(factoryMonthSelect.value) : null);
          q = q.gte('ngay_nhap', range.start).lt('ngay_nhap', range.end);
        }
        const { data, error } = await q
          .order('batch', { ascending: true })
          .order('ngay_nhap', { ascending: false });
        if(error) throw error;
        renderFactoryRows(data || []);
        updateFactoryStats(data || []);
      } catch(err){
        console.error('Không tải được dữ liệu Xưởng Ba Phi:', err);
        showFactoryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    function openModal(){ factoryOverlay.classList.add('active'); }
    function closeModal(){ factoryOverlay.classList.remove('active'); factoryForm.reset(); editingRawBatchId = null; editingBatchLabel = ''; }

    function openEditModal(tr){
      editingRawBatchId = tr.dataset.rawId;
      editingBatchLabel = tr.dataset.batch || '';
      if(factoryModalBatchInfo){
        factoryModalBatchInfo.textContent = 'Lô hàng: ' + tr.dataset.batch + ' · NCC: ' + (tr.dataset.ncc || '—') +
          ' · Số lượng nhập: ' + (tr.dataset.soluong ? tr.dataset.soluong + ' trái' : '—');
      }
      document.getElementById('fac-production-date').value = tr.dataset.productionDate || '';
      document.getElementById('fac-finished-qty').value = tr.dataset.finishedQty || '';
      document.getElementById('fac-quycach').value = tr.dataset.quyCach || '';
      document.getElementById('fac-start').value = tr.dataset.start || '';
      document.getElementById('fac-finish').value = tr.dataset.finish || '';
      factoryModalTitle.textContent = 'Cập nhật sản xuất';
      openModal();
    }

    if(closeFactoryBtn) closeFactoryBtn.addEventListener('click', closeModal);
    if(cancelFactoryBtn) cancelFactoryBtn.addEventListener('click', closeModal);
    factoryOverlay.addEventListener('click', function(e){ if(e.target === factoryOverlay) closeModal(); });
    factoryTbody.addEventListener('click', function(e){
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      openEditModal(btn.closest('tr'));
    });

    factoryForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingRawBatchId) return;
      const startVal = fieldVal('fac-start') || null;
      const finishVal = fieldVal('fac-finish') || null;
      const payload = {
        raw_batch_id: editingRawBatchId,
        production_date: fieldVal('fac-production-date') || null,
        finished_qty: parseQty(fieldVal('fac-finished-qty')),
        quy_cach: parseQty(fieldVal('fac-quycach')),
        start_time: startVal,
        expected_finish: finishVal,
        duration_hours: computeDurationHours(startVal, finishVal),
        batch_code: editingBatchLabel
      };

      const originalLabel = factorySubmitBtn.textContent;
      factorySubmitBtn.disabled = true;
      factorySubmitBtn.textContent = 'Đang lưu...';
      try{
        const { error } = await sb.from('factory_batches').upsert(payload, { onConflict: 'raw_batch_id' });
        if(error) throw error;
        await refreshFactoryRows();
        closeModal();
        notifyFactoryProductionChanged();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        factorySubmitBtn.disabled = false;
        factorySubmitBtn.textContent = originalLabel;
      }
    });

    if(factoryMonthSelect) factoryMonthSelect.addEventListener('change', refreshFactoryRows);
    if(factoryYearSelect) factoryYearSelect.addEventListener('change', refreshFactoryRows);

    showFactoryMessage('Đang tải dữ liệu...');
    loadFactoryYears().then(refreshFactoryRows);

    // Vùng nguyên liệu vừa được thêm/sửa → đồng bộ lại NCC/số lượng/ngày nhập
    // ngay, không đợi người dùng bấm gì hay tải lại trang (kể cả năm mới nếu
    // đợt nhập đầu tiên của 1 năm chưa từng có trong dropdown).
    onRawBatchesChanged(function(){ loadFactoryYears().then(refreshFactoryRows); });
  })();

  // ---- Xưởng Ba Phi: Nhân sự ----
  (function(){
    const statActive = document.getElementById('stat-staff-active');
    const statOff = document.getElementById('stat-staff-off');

    initCrudModule({
      table: 'factory_staff',
      overlayId: 'add-staff-overlay',
      openBtnId: 'btn-open-add-staff',
      closeBtnId: 'btn-close-add-staff',
      cancelBtnId: 'btn-cancel-add-staff',
      formId: 'form-add-staff',
      tbodyId: 'staff-tbody',
      modalTitleId: 'add-staff-modal-title',
      submitBtnId: 'btn-submit-add-staff',
      cellCount: 5,
      addTitle: 'Thêm nhân sự',
      editTitle: 'Chỉnh sửa nhân sự',
      addLabel: 'Thêm nhân sự',
      editLabel: 'Lưu thay đổi',
      orderBy: [{ column: 'full_name', ascending: true }],
      emptyMessage: 'Chưa có nhân sự nào.',
      deleteLabel: function(tr){ return 'nhân sự "' + (tr.dataset.name || '') + '"'; },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.name = d.full_name || '';
        tr.dataset.role = d.role || '';
        tr.dataset.shift = d.shift || '';
        tr.dataset.status = d.status || '';
        tr.dataset.note = d.note || '';

        tr.cells[0].textContent = d.full_name;
        tr.cells[1].textContent = d.role || '—';
        tr.cells[2].textContent = d.shift || '—';
        tr.cells[3].textContent = '';
        const badge = document.createElement('span');
        badge.className = 'badge ' + (d.status === 'Đang làm' ? 'green' : (d.status === 'Nghỉ phép' ? 'amber' : 'gray'));
        badge.textContent = d.status || '—';
        tr.cells[3].appendChild(badge);
        tr.cells[4].textContent = d.note || '—';
        tr.cells[4].className = 'muted';
      },
      fillForm: function(form, tr){
        document.getElementById('staff-name').value = tr.dataset.name || '';
        document.getElementById('staff-role').value = tr.dataset.role || '';
        document.getElementById('staff-shift').value = tr.dataset.shift || 'Ca sáng';
        document.getElementById('staff-status').value = tr.dataset.status || 'Đang làm';
        document.getElementById('staff-note').value = tr.dataset.note || '';
      },
      readForm: function(form){
        return {
          full_name: fieldVal('staff-name'),
          role: fieldVal('staff-role') || null,
          shift: fieldVal('staff-shift'),
          status: fieldVal('staff-status'),
          note: fieldVal('staff-note') || null
        };
      },
      validate: function(payload){ return !!payload.full_name; },
      afterRender: function(rows){
        if(statActive) statActive.textContent = String(rows.filter(function(d){ return d.status === 'Đang làm'; }).length);
        if(statOff) statOff.textContent = String(rows.filter(function(d){ return d.status && d.status !== 'Đang làm'; }).length);
      }
    });
  })();

  // ---- Xưởng Ba Phi: Tồn kho ----
  // Tổng hợp trực tiếp từ Sản xuất, tách RIÊNG theo từng chủng loại dừa
  // trong 1 lô hàng (1 lô có thể gồm nhiều chủng loại, mỗi chủng loại có
  // thành phẩm/ngày xuất/số lượng xuất riêng) — không còn gộp chung 1 dòng/
  // lô hàng như trước. factory_finished_stock giờ khoá duy nhất theo
  // (batch, chung_loai) thay vì chỉ (batch).
  (function(){
    const statRemaining = document.getElementById('stat-inventory-remaining');
    const statLots = document.getElementById('stat-inventory-lots');

    const closeInvBtn = document.getElementById('btn-close-add-inventory');
    const cancelInvBtn = document.getElementById('btn-cancel-add-inventory');
    const inventoryForm = document.getElementById('form-add-inventory');
    const inventoryTbody = document.getElementById('inventory-tbody');
    const inventoryOverlay = document.getElementById('add-inventory-overlay');
    const inventoryModalBatchInfo = document.getElementById('inventory-modal-batch-info');
    const inventorySubmitBtn = document.getElementById('btn-submit-add-inventory');
    const INVENTORY_COLS = 7;
    const UNSPECIFIED_VARIETY = 'Chưa phân loại';

    if(!inventoryOverlay || !inventoryForm || !inventoryTbody || !sb) return;

    let editingBatch = null;
    let editingVariety = null;

    function parseQty(s){
      if(s === undefined || s === null || String(s).trim() === '') return null;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? null : n;
    }
    function fmtQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' trái'; }
    function fmtBoxQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' thùng'; }
    function boxCount(finishedQty, quyCach){
      if(finishedQty == null || !quyCach) return null;
      return Math.floor(Number(finishedQty) / Number(quyCach));
    }
    function getFb(r){
      if(!r.factory_batches) return null;
      return Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches;
    }

    function showInventoryMessage(text, color){
      inventoryTbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = INVENTORY_COLS;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      inventoryTbody.appendChild(tr);
    }

    function renderInventoryRows(groups){
      inventoryTbody.textContent = '';
      if(!groups.length){ showInventoryMessage('Chưa có lô nào có thành phẩm.'); return; }

      groups.forEach(function(group){
        const rowspan = group.lines.length;
        group.lines.forEach(function(line, idx){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.batch = group.batch;
          tr.dataset.variety = line.variety;
          tr.dataset.finished = line.finished != null ? line.finished : '';
          tr.dataset.exportDate = line.exportDate || '';
          tr.dataset.exportedQty = line.exportedQty != null ? line.exportedQty : '';

          if(idx === 0){
            const batchTd = document.createElement('td');
            batchTd.rowSpan = rowspan;
            batchTd.textContent = group.batch;
            tr.appendChild(batchTd);
          }

          const exportDateTd = document.createElement('td');
          exportDateTd.className = 'muted';
          exportDateTd.textContent = line.exportDate ? fmtDate(line.exportDate) : '—';
          tr.appendChild(exportDateTd);

          const exportedTd = document.createElement('td');
          exportedTd.className = 'muted';
          exportedTd.textContent = fmtBoxQty(line.exportedQty);
          tr.appendChild(exportedTd);

          const varietyTd = document.createElement('td');
          varietyTd.className = 'muted';
          varietyTd.textContent = line.variety === UNSPECIFIED_VARIETY ? '—' : line.variety;
          tr.appendChild(varietyTd);

          if(idx === 0){
            const totalExportedTd = document.createElement('td');
            totalExportedTd.rowSpan = rowspan;
            totalExportedTd.textContent = fmtBoxQty(group.totalExportedQty);
            tr.appendChild(totalExportedTd);
          }

          const remainingTd = document.createElement('td');
          if(line.exportedTrai == null){
            // Có xuất hàng (thùng) nhưng chưa rõ Quy cách của chủng loại này
            // ở Xưởng sản xuất — không đoán số trái, tránh trừ nhầm ra 1 số
            // vô nghĩa (thùng ≠ trái nếu chưa biết quy cách).
            remainingTd.textContent = '—';
            remainingTd.className = 'muted';
            remainingTd.title = 'Chưa có Quy cách ở Xưởng sản xuất cho chủng loại này nên chưa quy đổi được thùng đã xuất ra trái.';
          } else {
            const remaining = (line.finished || 0) - line.exportedTrai;
            remainingTd.textContent = fmtQty(remaining);
            if(remaining < 0){
              remainingTd.className = '';
              remainingTd.style.color = 'var(--red)';
              remainingTd.style.fontWeight = '600';
              remainingTd.title = 'Số đã xuất quy đổi ra trái lớn hơn thành phẩm — kiểm tra lại số liệu.';
            } else {
              remainingTd.className = remaining === 0 ? 'success' : 'warn-text';
            }
          }
          tr.appendChild(remainingTd);

          const actionsTd = document.createElement('td');
          actionsTd.className = 'row-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'row-edit-btn';
          editBtn.setAttribute('aria-label', 'Chỉnh sửa');
          editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
          actionsTd.appendChild(editBtn);
          tr.appendChild(actionsTd);

          inventoryTbody.appendChild(tr);
        });
      });
    }

    function updateInventoryStats(groups){
      let totalRemaining = 0;
      let lotsWithStock = 0;
      groups.forEach(function(group){
        let batchRemaining = 0;
        group.lines.forEach(function(line){
          // Chủng loại chưa quy đổi được (exportedTrai null) thì bỏ qua khỏi
          // tổng — không được coi như 0 (dễ làm tổng nhỏ hơn thực tế) hay
          // cộng nhầm cả thành phẩm vào (dễ làm tổng lớn hơn thực tế) khi
          // chưa chắc có đã xuất hay chưa.
          if(line.exportedTrai == null) return;
          batchRemaining += Math.max((line.finished || 0) - line.exportedTrai, 0);
        });
        totalRemaining += batchRemaining;
        if(batchRemaining > 0) lotsWithStock++;
      });
      if(statRemaining) statRemaining.textContent = groups.length ? totalRemaining.toLocaleString('vi-VN') + ' trái' : '—';
      if(statLots) statLots.textContent = String(lotsWithStock);
    }

    function varietyKey(batch, variety){ return batch + '::' + variety; }

    async function refreshInventoryRows(){
      try{
        const [rawRes, stockRes] = await Promise.all([
          sb.from('raw_batches').select('batch, chung_loai, factory_batches(finished_qty, quy_cach)'),
          sb.from('factory_finished_stock').select('*')
        ]);
        if(rawRes.error) throw rawRes.error;
        if(stockRes.error) throw stockRes.error;

        // Gom theo (lô hàng, chủng loại) — mỗi chủng loại trong lô có thành
        // phẩm/số thùng khả dụng riêng, cộng dồn TỪNG đợt sản xuất theo đúng
        // Quy cách của đợt đó (1 chủng loại vẫn có thể có nhiều đợt nhập).
        const varietyMap = {};
        function ensureVariety(batch, variety){
          const key = varietyKey(batch, variety);
          if(!varietyMap[key]) varietyMap[key] = { batch: batch, variety: variety, finished: 0, boxes: 0 };
          return varietyMap[key];
        }
        (rawRes.data || []).forEach(function(r){
          const fb = getFb(r);
          if(!fb || fb.finished_qty == null) return;
          const variety = (r.chung_loai || '').trim() || UNSPECIFIED_VARIETY;
          const v = ensureVariety(r.batch, variety);
          v.finished += Number(fb.finished_qty);
          const boxes = boxCount(fb.finished_qty, fb.quy_cach);
          if(boxes != null) v.boxes += boxes;
        });

        const stockByKey = {};
        (stockRes.data || []).forEach(function(s){
          const variety = s.chung_loai || UNSPECIFIED_VARIETY;
          stockByKey[varietyKey(s.batch, variety)] = s;
          // Đã có bản ghi xuất cho chủng loại này thì vẫn phải hiện ra dù
          // Vùng nguyên liệu hiện không còn thành phẩm nào khớp (không được
          // để mất dữ liệu xuất đã nhập).
          ensureVariety(s.batch, variety);
        });

        // Gom các dòng chủng loại theo lô để tính Tổng số lượng xuất (thùng)
        // của cả lô (rowspan cùng cột Lô hàng).
        const byBatch = {};
        Object.values(varietyMap).forEach(function(v){
          const stock = stockByKey[varietyKey(v.batch, v.variety)];
          const avgQuyCach = v.boxes > 0 ? v.finished / v.boxes : null;
          const exportedQty = stock && stock.exported_qty != null ? Number(stock.exported_qty) : null;
          const line = {
            batch: v.batch,
            variety: v.variety,
            finished: v.finished,
            exportDate: stock ? stock.export_date : null,
            exportedQty: exportedQty,
            // Đã xuất nhập theo thùng — quy đổi ngược ra trái bằng quy cách
            // bình quân của CHÍNH chủng loại đó để trừ ra "Tồn kho" vẫn theo
            // trái như trước. Chủng loại nào chưa có Quy cách ở Xưởng sản
            // xuất (avgQuyCach = null) thì KHÔNG đoán — để null, hiện "—" ở
            // Tồn kho thay vì trừ nhầm số thùng vào số trái ra 1 số âm vô
            // nghĩa (thùng và trái không cùng đơn vị nếu chưa biết quy cách).
            exportedTrai: exportedQty == null ? 0 : (avgQuyCach != null ? exportedQty * avgQuyCach : null)
          };
          if(!byBatch[v.batch]) byBatch[v.batch] = [];
          byBatch[v.batch].push(line);
        });

        const groups = Object.keys(byBatch).sort(function(a, b){ return a.localeCompare(b); }).map(function(batch){
          const lines = byBatch[batch].sort(function(a, b){ return a.variety.localeCompare(b.variety, 'vi'); });
          const totalExportedQty = lines.reduce(function(sum, l){ return sum + (l.exportedQty || 0); }, 0);
          return { batch: batch, lines: lines, totalExportedQty: totalExportedQty };
        });

        renderInventoryRows(groups);
        updateInventoryStats(groups);
      } catch(err){
        console.error('Không tải được dữ liệu Tồn kho:', err);
        showInventoryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    function openModal(){ inventoryOverlay.classList.add('active'); }
    function closeModal(){ inventoryOverlay.classList.remove('active'); inventoryForm.reset(); editingBatch = null; editingVariety = null; }

    function openEditModal(tr){
      editingBatch = tr.dataset.batch;
      editingVariety = tr.dataset.variety || UNSPECIFIED_VARIETY;
      if(inventoryModalBatchInfo){
        const varietyLabel = editingVariety === UNSPECIFIED_VARIETY ? '' : (' · Chủng loại: ' + editingVariety);
        inventoryModalBatchInfo.textContent = 'Lô hàng: ' + tr.dataset.batch + varietyLabel + ' · Thành phẩm: ' + fmtQty(tr.dataset.finished ? Number(tr.dataset.finished) : null);
      }
      document.getElementById('inv-export-date').value = tr.dataset.exportDate || '';
      document.getElementById('inv-exported-qty').value = tr.dataset.exportedQty || '';
      openModal();
    }

    if(closeInvBtn) closeInvBtn.addEventListener('click', closeModal);
    if(cancelInvBtn) cancelInvBtn.addEventListener('click', closeModal);
    inventoryOverlay.addEventListener('click', function(e){ if(e.target === inventoryOverlay) closeModal(); });
    inventoryTbody.addEventListener('click', function(e){
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      openEditModal(btn.closest('tr'));
    });

    inventoryForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingBatch) return;
      const payload = {
        batch: editingBatch,
        chung_loai: editingVariety || UNSPECIFIED_VARIETY,
        export_date: fieldVal('inv-export-date') || null,
        exported_qty: parseQty(fieldVal('inv-exported-qty'))
      };

      const originalLabel = inventorySubmitBtn.textContent;
      inventorySubmitBtn.disabled = true;
      inventorySubmitBtn.textContent = 'Đang lưu...';
      try{
        const { error } = await sb.from('factory_finished_stock').upsert(payload, { onConflict: 'batch,chung_loai' });
        if(error) throw error;
        await refreshInventoryRows();
        closeModal();
        // Đánh giá chất lượng đọc trực tiếp factory_finished_stock (Số lượng
        // thực tế = đã xuất kho) — thiếu dòng này thì sửa Tồn kho không báo
        // cho QC (và các module khác đang lắng nghe) biết để tự tải lại.
        notifyFactoryProductionChanged();
      } catch(err){
        alert('Không thể lưu vào Supabase: ' + err.message);
      } finally {
        inventorySubmitBtn.disabled = false;
        inventorySubmitBtn.textContent = originalLabel;
      }
    });

    showInventoryMessage('Đang tải dữ liệu...');
    refreshInventoryRows();

    onRawBatchesChanged(refreshInventoryRows);
    onFactoryProductionChanged(refreshInventoryRows);
  })();

  // ---- Tổng quan (tổng hợp read-only từ các bảng khác) ----
  (function(){
    const kpiActive = document.getElementById('kpi-active-batches');
    const kpiContainers = document.getElementById('kpi-containers');
    const kpiQcRate = document.getElementById('kpi-qc-rate');
    const kpiSatisfaction = document.getElementById('kpi-satisfaction');
    const recentTbody = document.getElementById('overview-recent-tbody');
    const alertsList = document.getElementById('alerts-list');
    const FEEDBACK_DEADLINE_DAYS = 3;

    if(!recentTbody || !sb) return;

    function stageBadgeClass(stage){
      return { 'Trên biển': 'amber', 'Thông quan': 'blue', 'Cảng đến': 'blue', 'Giao khách hàng': 'blue', 'Khách đã nhận hàng': 'green' }[stage] || 'gray';
    }

    function setText(el, text){ if(el) el.textContent = text; }

    // "Cần xử lý ngay" — gom các cảnh báo đang nằm rải rác ở từng module
    // (Chứng từ/Feedback KH/Đánh giá chất lượng) thành 1 danh sách ưu tiên
    // ngay đầu Tổng quan, bấm vào 1 dòng sẽ nhảy thẳng tới module đó.
    function renderAlerts(missingDocsCount, overdueFeedbackCount, qcPendingCount){
      if(!alertsList) return;
      alertsList.textContent = '';
      const items = [
        { count: missingDocsCount, icon: 'ti-file-text', chip: 'nic-red', text: 'lô đang thiếu chứng từ trước khi thông quan', sub: 'Chứng từ', tab: 'docs' },
        { count: overdueFeedbackCount, icon: 'ti-message-star', chip: 'nic-amber', text: 'lô đã quá hạn phản hồi khách hàng (quá ' + FEEDBACK_DEADLINE_DAYS + ' ngày)', sub: 'Feedback KH', tab: 'feedback' },
        { count: qcPendingCount, icon: 'ti-clipboard-check', chip: 'nic-blue', text: 'lượt kiểm QC đang chờ xác nhận kết quả', sub: 'Đánh giá chất lượng', tab: 'qc' }
      ].filter(function(item){ return item.count > 0; });

      if(!items.length){
        const div = document.createElement('div');
        div.className = 'alert-empty';
        div.textContent = 'Không có việc gì cần xử lý gấp.';
        alertsList.appendChild(div);
        return;
      }

      items.forEach(function(item){
        const row = document.createElement('div');
        row.className = 'alert-row';
        row.addEventListener('click', function(){ goTab(item.tab); });

        const chip = document.createElement('span');
        chip.className = 'icon-chip ' + item.chip;
        const icon = document.createElement('i');
        icon.className = 'ti ' + item.icon;
        chip.appendChild(icon);

        const textWrap = document.createElement('div');
        textWrap.className = 'alert-text';
        textWrap.textContent = item.count + ' ' + item.text;
        const sub = document.createElement('div');
        sub.className = 'alert-sub';
        sub.textContent = item.sub;
        textWrap.appendChild(sub);

        const count = document.createElement('div');
        count.className = 'alert-count';
        count.textContent = String(item.count);

        row.appendChild(chip);
        row.appendChild(textWrap);
        row.appendChild(count);
        alertsList.appendChild(row);
      });
    }

    async function loadOverview(){
      try{
        const [qcRes, shipRes, docRes, fbRes] = await Promise.all([
          sb.from('qc_checks').select('*'),
          sb.from('shipments').select('*').order('created_at', { ascending: false }),
          sb.from('documents_checklist').select('*'),
          sb.from('feedbacks').select('*')
        ]);
        [qcRes, shipRes, docRes, fbRes].forEach(function(r){ if(r.error) throw r.error; });

        const qcRows = qcRes.data, shipRows = shipRes.data, docRows = docRes.data, fbRows = fbRes.data;

        // "Lô hàng đang xử lý" = tổng số lô (mọi ngành hàng — Dừa/Chanh/Thanh
        // long) lấy từ sharedBatchSummaries (nguồn QC tổng hợp) mà QC chưa
        // "Đạt", dùng đúng cùng tiêu chí overallStatus() mà module Đánh giá
        // chất lượng đang tính cho từng lô — thay vì chỉ tính riêng lô Dừa
        // qua Xưởng Ba Phi như trước (bỏ sót Chanh/Thanh long).
        function batchQcStatus(batchCode){
          const checks = qcRows.filter(function(q){ return q.batch_code === batchCode; });
          if(!checks.length) return 'Chưa kiểm';
          if(checks.some(function(q){ return q.result === 'Không đạt 1 phần'; })) return 'Không đạt 1 phần';
          if(checks.some(function(q){ return !q.result || q.result === 'Chờ xác nhận'; })) return 'Chờ xác nhận';
          return 'Đạt';
        }
        const activeBatches = Object.values(sharedBatchSummaries)
          .filter(function(b){ return b.hasSourceInfo && batchQcStatus(b.batch) !== 'Đạt'; })
          .length;
        const activeShipments = shipRows.filter(function(d){ return d.stage !== 'Khách đã nhận hàng'; }).length;
        const decidedQc = qcRows.filter(function(d){ return d.result && d.result !== 'Chờ xác nhận'; });
        const passedQc = decidedQc.filter(function(d){ return d.result === 'Đạt' || d.result === 'Đạt có điều kiện'; });
        const ratings = fbRows.filter(function(d){ return d.rating != null; }).map(function(d){ return d.rating; });
        const avgRating = ratings.length ? ratings.reduce(function(a, b){ return a + b; }, 0) / ratings.length : null;

        const qcRatePct = decidedQc.length ? Math.round(passedQc.length / decidedQc.length * 100) : null;

        setText(kpiActive, String(activeBatches));
        setText(kpiContainers, String(activeShipments));
        setText(kpiQcRate, qcRatePct != null ? qcRatePct + '%' : '—');
        renderDonut(document.getElementById('kpi-qc-donut'), qcRatePct, 'var(--forest)');
        setText(kpiSatisfaction, avgRating != null ? avgRating.toFixed(1) + '/5' : '—');

        // Đếm theo đúng danh sách lô hàng thật (sharedBatchSummaries) — giống
        // cách module Chứng từ tự tính (mergedRows()) — chứ không quét thẳng
        // bảng documents_checklist, vì bảng đó có thể còn sót bản ghi của lô
        // cũ/đã đổi tên không còn tồn tại trong sharedBatchSummaries, khiến
        // 2 module hiện số khác nhau.
        const missingDocsCount = Object.values(sharedBatchSummaries)
          .filter(function(b){ return b.hasSourceInfo; })
          .filter(function(b){
            const d = docRows.find(function(r){ return r.batch_code === b.batch; });
            return !d || !d.contract_ok || !d.co_ok || !d.quarantine_ok || !d.bill_of_lading_ok;
          }).length;
        const qcPendingCount = qcRows.filter(function(d){ return d.result === 'Chờ xác nhận'; }).length;
        const overdueFeedbackCount = shipRows.filter(function(d){
          if(d.stage !== 'Khách đã nhận hàng' || !d.received_date) return false;
          const hasFeedback = fbRows.some(function(f){ return f.batch_code === d.batch_code; });
          if(hasFeedback) return false;
          const deadline = addDays(d.received_date, FEEDBACK_DEADLINE_DAYS);
          return !!deadline && todayStr() > deadline;
        }).length;
        renderAlerts(missingDocsCount, overdueFeedbackCount, qcPendingCount);

        recentTbody.textContent = '';
        const recent = shipRows.slice(0, 6);
        if(!recent.length){
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.colSpan = 4;
          td.style.textAlign = 'center';
          td.style.color = 'var(--ink-soft)';
          td.style.padding = '20px';
          td.textContent = 'Chưa có lô hàng nào.';
          tr.appendChild(td);
          recentTbody.appendChild(tr);
          return;
        }
        recent.forEach(function(d){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';

          const batchTd = document.createElement('td');
          batchTd.textContent = d.batch_code;

          const stageTd = document.createElement('td');
          const badge = document.createElement('span');
          badge.className = 'badge ' + stageBadgeClass(d.stage);
          badge.textContent = d.stage || '—';
          stageTd.appendChild(badge);

          const doc = docRows.find(function(x){ return x.batch_code === d.batch_code; });
          const docOk = !!doc && doc.contract_ok && doc.co_ok && doc.quarantine_ok && doc.bill_of_lading_ok;
          const docTd = document.createElement('td');
          const docIcon = document.createElement('i');
          docIcon.className = docOk ? 'ti ti-check icon-ok' : 'ti ti-alert-triangle icon-warn';
          docTd.appendChild(docIcon);

          const lastTd = document.createElement('td');
          if(d.stage === 'Giao khách hàng'){
            const fb = fbRows.find(function(x){ return x.batch_code === d.batch_code; });
            if(fb){
              lastTd.textContent = (fb.rating != null ? fb.rating + '/5' : '—') + (fb.status ? ' · ' + fb.status : '');
              lastTd.className = fb.status === 'Đã xử lý' ? 'success' : 'warn-text';
            } else {
              lastTd.textContent = 'Chưa có feedback';
              lastTd.className = 'muted';
            }
          } else {
            lastTd.textContent = 'ETA ' + fmtDate(d.eta);
            lastTd.className = 'muted';
          }

          tr.appendChild(batchTd); tr.appendChild(stageTd); tr.appendChild(docTd); tr.appendChild(lastTd);
          recentTbody.appendChild(tr);
        });
      } catch(err){
        console.error('Không tải được dữ liệu Tổng quan từ Supabase:', err);
        recentTbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.textAlign = 'center';
        td.style.color = 'var(--red)';
        td.style.padding = '20px';
        td.textContent = 'Không tải được dữ liệu — kiểm tra kết nối Supabase.';
        tr.appendChild(td);
        recentTbody.appendChild(tr);
        if(alertsList){
          alertsList.textContent = '';
          const div = document.createElement('div');
          div.className = 'alert-empty';
          div.style.color = 'var(--red)';
          div.textContent = 'Không tải được dữ liệu — kiểm tra kết nối Supabase.';
          alertsList.appendChild(div);
        }
      }
    }

    loadOverview();
    // Tổng quan gộp dữ liệu từ hầu hết các module khác (QC, Logistics, Chứng
    // từ, Feedback KH) — phải tự tải lại mỗi khi 1 trong các nguồn đó thay
    // đổi, không đợi người dùng tải lại trang mới thấy đúng số liệu.
    onBatchSummaryChanged(loadOverview);
    onDeliveredShipmentsChanged(loadOverview);
    onDocumentsChecklistChanged(loadOverview);
    onFeedbacksChanged(loadOverview);
  })();

  // ---- Tổng quan: biểu đồ lô hàng theo tháng/năm ----
  // Dùng lại sharedBatchSummaries (nguồn QC) thay vì tự fetch riêng, để luôn
  // đồng nhất với cách các module khác đếm/lọc lô hàng.
  (function(){
    const monthSelect = document.getElementById('chart-month-select');
    const yearSelect = document.getElementById('chart-year-select');
    const categoryContainer = document.getElementById('chart-category');
    const trendContainer = document.getElementById('chart-trend');
    if(!monthSelect || !yearSelect || !categoryContainer || !trendContainer) return;

    const CATEGORY_COLORS = { 'Dừa': 'var(--forest)', 'Chanh': 'var(--amber)', 'Thanh long': 'var(--blue)' };
    function categoryColor(name){ return CATEGORY_COLORS[name] || 'var(--ink-mute)'; }

    function ensureTooltip(container){
      let tip = container.querySelector('.chart-tooltip');
      if(!tip){
        tip = document.createElement('div');
        tip.className = 'chart-tooltip';
        container.appendChild(tip);
      }
      return tip;
    }
    function showTip(container, text, evt){
      const tip = ensureTooltip(container);
      tip.textContent = text;
      tip.classList.add('visible');
      moveTip(container, evt);
    }
    function moveTip(container, evt){
      const tip = container.querySelector('.chart-tooltip');
      if(!tip) return;
      const rect = container.getBoundingClientRect();
      tip.style.left = (evt.clientX - rect.left) + 'px';
      tip.style.top = (evt.clientY - rect.top - 8) + 'px';
    }
    function hideTip(container){
      const tip = container.querySelector('.chart-tooltip');
      if(tip) tip.classList.remove('visible');
    }

    function renderBarChart(container, items, opts){
      opts = opts || {};
      Array.from(container.childNodes).forEach(function(node){
        if(node.nodeType === 1 && node.classList.contains('chart-tooltip')) return;
        container.removeChild(node);
      });

      if(!items.length || items.every(function(i){ return i.value === 0; })){
        const empty = document.createElement('div');
        empty.className = 'chart-empty';
        empty.textContent = opts.emptyText || 'Chưa có dữ liệu.';
        container.insertBefore(empty, container.firstChild);
        return;
      }

      const svgNS = 'http://www.w3.org/2000/svg';
      const width = Math.max(container.clientWidth || 320, 200);
      const height = opts.height || 190;
      const padding = { top: 26, right: 10, bottom: 26, left: 10 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;
      const maxVal = Math.max(1, items.reduce(function(m, i){ return i.value > m ? i.value : m; }, 0));
      const n = items.length;
      const gap = opts.gap != null ? opts.gap : 10;
      const barW = Math.max(6, (chartW - gap * (n - 1)) / n);

      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', height);
      svg.style.display = 'block';

      const baseline = document.createElementNS(svgNS, 'line');
      baseline.setAttribute('x1', padding.left);
      baseline.setAttribute('x2', width - padding.right);
      baseline.setAttribute('y1', height - padding.bottom);
      baseline.setAttribute('y2', height - padding.bottom);
      baseline.setAttribute('stroke', 'var(--border)');
      baseline.setAttribute('stroke-width', '1');
      svg.appendChild(baseline);

      items.forEach(function(item, i){
        const x = padding.left + i * (barW + gap);
        const h = (item.value / maxVal) * chartH;
        const y = height - padding.bottom - h;
        const barColor = item.muted ? 'var(--border)' : item.color;

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', item.value > 0 ? y : height - padding.bottom - 2);
        rect.setAttribute('width', barW);
        rect.setAttribute('height', item.value > 0 ? Math.max(h, 2) : 2);
        rect.setAttribute('rx', 4);
        rect.setAttribute('fill', barColor);
        svg.appendChild(rect);

        if(opts.showValues && item.value > 0){
          const label = document.createElementNS(svgNS, 'text');
          label.setAttribute('x', x + barW / 2);
          label.setAttribute('y', y - 7);
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('font-size', '11.5');
          label.setAttribute('font-weight', '700');
          label.setAttribute('fill', 'var(--ink)');
          label.textContent = item.value;
          svg.appendChild(label);
        }

        const xLabel = document.createElementNS(svgNS, 'text');
        xLabel.setAttribute('x', x + barW / 2);
        xLabel.setAttribute('y', height - padding.bottom + 17);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('font-size', '10.5');
        xLabel.setAttribute('fill', item.muted ? 'var(--ink-mute)' : 'var(--ink-soft)');
        xLabel.setAttribute('font-weight', item.muted ? '400' : '600');
        xLabel.textContent = item.label;
        svg.appendChild(xLabel);

        const hit = document.createElementNS(svgNS, 'rect');
        hit.setAttribute('x', x - gap / 2);
        hit.setAttribute('y', padding.top);
        hit.setAttribute('width', barW + gap);
        hit.setAttribute('height', chartH);
        hit.setAttribute('fill', 'transparent');
        hit.style.cursor = 'pointer';
        hit.addEventListener('mouseenter', function(e){ showTip(container, item.tooltip || (item.label + ': ' + item.value), e); });
        hit.addEventListener('mousemove', function(e){ moveTip(container, e); });
        hit.addEventListener('mouseleave', function(){ hideTip(container); });
        svg.appendChild(hit);
      });

      container.insertBefore(svg, container.firstChild);
    }

    function populateSelectors(){
      const years = Object.values(sharedBatchSummaries)
        .map(function(b){ const p = periodParts(b.periodDate); return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(monthSelect, yearSelect, years);
    }

    // Ngành hàng là văn bản tự do (VD: "Chanh không hạt", "Dừa cắt gọt") nên
    // gộp về 1 trong 3 nhóm chính theo tiền tố để lên màu/biểu đồ nhất quán,
    // thay vì tách thành từng chuỗi riêng lẻ.
    const CATEGORY_PREFIXES = ['Dừa', 'Chanh', 'Thanh long'];
    function normalizeCategory(name){
      const found = CATEGORY_PREFIXES.filter(function(p){ return name.indexOf(p) === 0; });
      return found.length ? found[0] : name;
    }
    function splitCategories(catStr){
      if(!catStr) return ['Khác'];
      return catStr.split(' + ').map(normalizeCategory);
    }

    function renderCharts(){
      const year = Number(yearSelect.value);
      const monthFilter = monthSelect.value ? Number(monthSelect.value) : null;
      const batches = Object.values(sharedBatchSummaries);

      const categoryCounts = {};
      batches.forEach(function(b){
        const p = periodParts(b.periodDate);
        if(!p || p.year !== year) return;
        if(monthFilter && p.month !== monthFilter) return;
        splitCategories(b.category).forEach(function(cat){
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      });
      const categoryOrder = ['Dừa', 'Chanh', 'Thanh long'];
      const extraCats = Object.keys(categoryCounts).filter(function(c){ return categoryOrder.indexOf(c) === -1; });
      const categoryItems = categoryOrder.concat(extraCats)
        .filter(function(c){ return categoryCounts[c] != null; })
        .map(function(c){ return { label: c, value: categoryCounts[c], color: categoryColor(c) }; });
      renderBarChart(categoryContainer, categoryItems, {
        showValues: true,
        height: 190,
        emptyText: 'Chưa có lô hàng nào trong ' + (monthFilter ? 'Tháng ' + monthFilter + '/' + year : 'năm ' + year) + '.'
      });

      const monthCounts = new Array(12).fill(0);
      batches.forEach(function(b){
        const p = periodParts(b.periodDate);
        if(!p || p.year !== year) return;
        monthCounts[p.month - 1] += 1;
      });
      const trendItems = monthCounts.map(function(count, i){
        return {
          label: MONTH_NAMES[i],
          value: count,
          color: 'var(--forest)',
          muted: monthFilter ? (i + 1 !== monthFilter) : false,
          tooltip: 'Tháng ' + (i + 1) + '/' + year + ': ' + count + ' lô hàng'
        };
      });
      renderBarChart(trendContainer, trendItems, {
        height: 190,
        gap: 6,
        emptyText: 'Chưa có lô hàng nào trong năm ' + year + '.'
      });
    }

    populateSelectors();
    renderCharts();

    monthSelect.addEventListener('change', renderCharts);
    yearSelect.addEventListener('change', function(){ renderCharts(); });
    onBatchSummaryChanged(function(){ populateSelectors(); renderCharts(); });
  })();

  // ---- Quản lý tài khoản (chỉ Admin) ----
  // Tạo tài khoản mới qua sbCreateUser.auth.signUp() (client phụ, không đụng
  // phiên đăng nhập hiện tại) rồi tự thêm dòng vào profiles bằng client
  // chính (sb) — cần dự án đã tắt "Confirm email" (Authentication → Providers
  // → Email) để tài khoản mới dùng được ngay, không phải bấm link xác nhận.
  (function(){
    const tbody = document.getElementById('users-tbody');
    if(!tbody || !sb) return;

    const overlay = document.getElementById('add-account-overlay');
    const openBtn = document.getElementById('btn-open-add-account');
    const closeBtn = document.getElementById('btn-close-add-account');
    const cancelBtn = document.getElementById('btn-cancel-add-account');
    const form = document.getElementById('form-add-account');
    const submitBtn = document.getElementById('btn-submit-add-account');
    const accError = document.getElementById('add-account-error');

    const editOverlay = document.getElementById('edit-account-overlay');
    const editCloseBtn = document.getElementById('btn-close-edit-account');
    const editCancelBtn = document.getElementById('btn-cancel-edit-account');
    const editForm = document.getElementById('form-edit-account');
    const editSubmitBtn = document.getElementById('btn-submit-edit-account');
    const editError = document.getElementById('edit-account-error');
    let editingAccount = null;

    const ROLE_OPTIONS = [
      ['admin', 'Admin'],
      ['san_xuat', 'Quản lý sản xuất'],
      ['ncc', 'Quản lý NCC'],
      ['qc', 'QC'],
      ['xuat_khau', 'Xuất khẩu']
    ];

    function showMessage(text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    async function deleteAccount(u){
      if(!confirm('Xóa tài khoản "' + (u.full_name || u.email) + '"? Người này sẽ mất quyền truy cập dashboard ngay lập tức.')) return;
      try{
        const { error } = await sb.from('profiles').delete().eq('id', u.id);
        if(error) throw error;
        await refreshUsers();
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    // Không thể tự đặt mật khẩu thay người khác từ client (cần service_role)
    // — cách an toàn duy nhất là gửi email đặt lại mật khẩu để họ tự đặt.
    // Cần dự án đã cấu hình gửi email (SMTP) hoạt động đúng thì email mới
    // thực sự tới nơi.
    async function sendPasswordReset(u){
      if(!u.email){ alert('Tài khoản này chưa có email.'); return; }
      if(!confirm('Gửi email đặt lại mật khẩu tới ' + u.email + '?')) return;
      try{
        const { error } = await sb.auth.resetPasswordForEmail(u.email);
        if(error) throw error;
        alert('Đã gửi email đặt lại mật khẩu tới ' + u.email + ' (nếu không thấy, kiểm tra thư mục spam, hoặc Supabase chưa cấu hình gửi email).');
      } catch(err){
        alert('Không thể gửi email: ' + err.message);
      }
    }

    async function refreshUsers(){
      try{
        const { data, error } = await sb.from('profiles').select('*').order('email');
        if(error) throw error;
        tbody.textContent = '';
        if(!data.length){ showMessage('Chưa có tài khoản nào — tạo trong Supabase Dashboard rồi gán vai trò tại đây.'); return; }
        data.forEach(function(u){
          const tr = document.createElement('tr');

          const nameTd = document.createElement('td');
          nameTd.textContent = u.full_name || '—';
          if(!u.full_name) nameTd.className = 'muted';
          tr.appendChild(nameTd);

          const emailTd = document.createElement('td');
          emailTd.textContent = u.email || '—';
          tr.appendChild(emailTd);

          const roleTd = document.createElement('td');
          const roleOpt = ROLE_OPTIONS.find(function(o){ return o[0] === u.role; });
          roleTd.textContent = roleOpt ? roleOpt[1] : u.role;
          tr.appendChild(roleTd);

          const actionTd = document.createElement('td');
          actionTd.className = 'row-actions';
          actionTd.style.whiteSpace = 'nowrap';

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'row-edit-btn';
          editBtn.title = 'Sửa tài khoản';
          editBtn.setAttribute('aria-label', 'Sửa');
          editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
          editBtn.addEventListener('click', function(){ openEditModal(u); });
          actionTd.appendChild(editBtn);

          const resetBtn = document.createElement('button');
          resetBtn.type = 'button';
          resetBtn.title = 'Gửi email đặt lại mật khẩu cho tài khoản này';
          resetBtn.style.cssText = 'background:none;border:none;color:var(--ink-soft);cursor:pointer;font-size:16px;padding:4px 8px;';
          resetBtn.innerHTML = '<i class="ti ti-key"></i>';
          resetBtn.addEventListener('click', function(){ sendPasswordReset(u); });
          actionTd.appendChild(resetBtn);

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.title = 'Xóa tài khoản';
          delBtn.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px 8px;';
          delBtn.innerHTML = '<i class="ti ti-trash"></i>';
          delBtn.addEventListener('click', function(){ deleteAccount(u); });
          actionTd.appendChild(delBtn);

          tr.appendChild(actionTd);

          tbody.appendChild(tr);
        });
      } catch(err){
        console.error('Không tải được dữ liệu tài khoản:', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    function openModal(){ if(accError) accError.textContent = ''; if(overlay) overlay.classList.add('active'); }
    function closeModal(){ if(overlay) overlay.classList.remove('active'); if(form) form.reset(); }

    if(openBtn) openBtn.addEventListener('click', openModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if(overlay) overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });

    if(form){
      form.addEventListener('submit', async function(e){
        e.preventDefault();
        if(accError) accError.textContent = '';
        const email = fieldVal('acc-email');
        const password = fieldVal('acc-password');
        const fullName = fieldVal('acc-name');
        const role = fieldVal('acc-role');
        if(!sbCreateUser){ if(accError) accError.textContent = 'Supabase SDK chưa được tải.'; return; }

        const originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tạo...';
        try{
          const { data, error } = await sbCreateUser.auth.signUp({ email: email, password: password });
          if(error) throw error;
          const newUser = data && data.user;
          if(!newUser) throw new Error('Không tạo được tài khoản — kiểm tra lại email/mật khẩu.');
          // Email đã tồn tại sẵn trong auth.users (VD: lần tạo trước bị lỗi
          // giữa chừng) → Supabase trả về "user" giả (identities rỗng) thay
          // vì báo lỗi rõ ràng, để tránh lộ email nào đã đăng ký hay chưa.
          // Phải tự bắt trường hợp này, nếu không insert profiles bên dưới sẽ
          // luôn báo "foreign key constraint" dù thử lại bao nhiêu lần.
          if(Array.isArray(newUser.identities) && newUser.identities.length === 0){
            throw new Error('Email này đã có tài khoản đăng nhập từ trước (có thể do lần tạo trước bị lỗi giữa chừng). Đổi sang email khác, hoặc vào Supabase Dashboard lấy UID của email này rồi tự gán vai trò trực tiếp vào bảng profiles.');
          }

          // auth.users vừa tạo xong đôi khi cần vài trăm ms mới "nhìn thấy
          // được" từ phía database (độ trễ giữa Supabase Auth và Postgres) —
          // insert vào profiles ngay có thể bị lỗi "foreign key constraint"
          // dù tài khoản đã tạo thành công. Thử lại vài lần trước khi báo lỗi.
          const payload = { id: newUser.id, email: email, full_name: fullName || null, role: role };
          let profileError = null;
          for(let attempt = 0; attempt < 4; attempt++){
            if(attempt > 0) await new Promise(function(r){ setTimeout(r, attempt * 500); });
            const res = await sb.from('profiles').insert(payload);
            profileError = res.error;
            if(!profileError || profileError.code !== '23503') break;
          }
          if(profileError) throw profileError;

          await refreshUsers();
          closeModal();
        } catch(err){
          if(accError) accError.textContent = err.message || 'Không thể tạo tài khoản.';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      });
    }

    function openEditModal(u){
      editingAccount = u;
      if(editError) editError.textContent = '';
      document.getElementById('edit-acc-name').value = u.full_name || '';
      document.getElementById('edit-acc-email').value = u.email || '';
      document.getElementById('edit-acc-role').value = u.role;
      if(editOverlay) editOverlay.classList.add('active');
    }
    function closeEditModal(){
      if(editOverlay) editOverlay.classList.remove('active');
      if(editForm) editForm.reset();
      editingAccount = null;
    }

    if(editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if(editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if(editOverlay) editOverlay.addEventListener('click', function(e){ if(e.target === editOverlay) closeEditModal(); });

    if(editForm){
      editForm.addEventListener('submit', async function(e){
        e.preventDefault();
        if(!editingAccount) return;
        if(editError) editError.textContent = '';
        const fullName = fieldVal('edit-acc-name');
        const email = fieldVal('edit-acc-email');
        const role = fieldVal('edit-acc-role');

        const originalLabel = editSubmitBtn.textContent;
        editSubmitBtn.disabled = true;
        editSubmitBtn.textContent = 'Đang lưu...';
        try{
          const { error } = await sb.from('profiles').update({
            full_name: fullName || null,
            email: email || null,
            role: role
          }).eq('id', editingAccount.id);
          if(error) throw error;
          await refreshUsers();
          closeEditModal();
        } catch(err){
          if(editError) editError.textContent = err.message || 'Không thể lưu.';
        } finally {
          editSubmitBtn.disabled = false;
          editSubmitBtn.textContent = originalLabel;
        }
      });
    }

    showMessage('Đang tải dữ liệu...');
    refreshUsers();
  })();

  // ---- Ma trận phân quyền (chỉ Admin sửa) ----
  // Đọc/ghi bảng public.module_permissions — RLS thật của từng bảng dữ liệu
  // đọc trực tiếp từ đây qua hàm can_write() (xem
  // supabase/2026-07-22_dynamic_permissions.sql), nên bấm đổi ở đây là đổi
  // quyền thật ngay lập tức, không chỉ đổi giao diện.
  (function(){
    const tbody = document.getElementById('permissions-tbody');
    if(!tbody || !sb) return;

    const PERMISSION_MODULES = [
      ['vung_nguyen_lieu', 'Vùng nguyên liệu'],
      ['nha_cung_cap', 'Nhà cung cấp'],
      ['xuong_ba_phi', 'Xưởng Ba Phi'],
      ['danh_gia_chat_luong', 'Đánh giá chất lượng'],
      ['logistics', 'Logistics'],
      ['chung_tu', 'Chứng từ'],
      ['feedback_kh', 'Feedback KH']
    ];
    const PERMISSION_ROLES = ['san_xuat', 'ncc', 'qc', 'xuat_khau'];

    function showMessage(text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    function makeStaticCell(text){
      const td = document.createElement('td');
      td.textContent = text;
      td.style.color = 'var(--ink-soft)';
      return td;
    }

    // 3 trạng thái, bấm để chuyển vòng tròn edit -> view -> none -> edit.
    const LEVEL_ORDER = ['edit', 'view', 'none'];
    const LEVEL_STYLE = {
      edit: { text: '✓', border: 'var(--green)', color: 'var(--green)', bg: 'var(--green-bg)' },
      view: { text: 'Xem', border: 'var(--border)', color: 'var(--ink-soft)', bg: 'var(--surface-2)' },
      none: { text: '—', border: 'var(--red)', color: 'var(--red)', bg: 'var(--red-bg)' }
    };

    function makeToggleCell(moduleKey, role, level){
      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      function paint(){
        const s = LEVEL_STYLE[level];
        btn.textContent = s.text;
        btn.style.cssText = 'font-family:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:5px 12px;cursor:pointer;' +
          'border:1px solid ' + s.border + ';color:' + s.color + ';background:' + s.bg + ';';
      }
      paint();
      btn.addEventListener('click', async function(){
        const next = LEVEL_ORDER[(LEVEL_ORDER.indexOf(level) + 1) % LEVEL_ORDER.length];
        btn.disabled = true;
        try{
          const { error } = await sb.from('module_permissions')
            .upsert({ module_key: moduleKey, role: role, access_level: next }, { onConflict: 'module_key,role' });
          if(error) throw error;
          level = next;
          paint();
        } catch(err){
          alert('Không thể lưu quyền: ' + err.message);
        } finally {
          btn.disabled = false;
        }
      });
      td.appendChild(btn);
      return td;
    }

    async function refreshPermissions(){
      try{
        const { data, error } = await sb.from('module_permissions').select('module_key,role,access_level');
        if(error) throw error;
        const map = {};
        (data || []).forEach(function(r){ map[r.module_key + '|' + r.role] = r.access_level; });

        tbody.textContent = '';
        PERMISSION_MODULES.forEach(function(m){
          const moduleKey = m[0], label = m[1];
          const tr = document.createElement('tr');
          const nameTd = document.createElement('td');
          nameTd.textContent = label;
          tr.appendChild(nameTd);
          tr.appendChild(makeStaticCell('✓'));
          PERMISSION_ROLES.forEach(function(role){
            tr.appendChild(makeToggleCell(moduleKey, role, map[moduleKey + '|' + role] || 'view'));
          });
          tbody.appendChild(tr);
        });

        const accTr = document.createElement('tr');
        const accNameTd = document.createElement('td');
        accNameTd.textContent = 'Quản lý tài khoản';
        accTr.appendChild(accNameTd);
        accTr.appendChild(makeStaticCell('✓'));
        for(let i = 0; i < PERMISSION_ROLES.length; i++){ accTr.appendChild(makeStaticCell('—')); }
        tbody.appendChild(accTr);
      } catch(err){
        console.error('Không tải được ma trận phân quyền:', err && (err.message || JSON.stringify(err)));
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    showMessage('Đang tải dữ liệu...');
    refreshPermissions();
  })();

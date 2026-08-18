const titles = {
    overview:  ["Tổng quan", "Toàn cảnh hoạt động chuỗi cung ứng hôm nay"],
    donhang:   ["Đơn hàng", "Toàn bộ đơn hàng — từ lúc chốt tới khi giao xong"],
    raw:       ["Vùng nguyên liệu", "Thu mua và kiểm tra dừa thô đầu vào"],
    ncc:       ["Nhà cung cấp", "Quản lý nhà cung cấp, tra cứu đơn đặt hàng và đánh giá"],
    factory:   ["Xưởng Ba Phi", "Tiến độ và thời gian xử lý theo lô hàng"],
    qc:        ["Đánh giá chất lượng", "Kiểm tra chất lượng lô hàng xuất khẩu: dừa, chanh, thanh long"],
    logistics: ["Logistics", "Theo dõi hành trình và vị trí lô hàng"],
    docs:      ["Chứng từ", "Checklist chứng từ theo từng lô hàng"],
    feedback:  ["Feedback khách hàng", "Ghi nhận và xử lý phản hồi theo lô hàng"],
    users:     ["Quản lý tài khoản", "Gán vai trò cho tài khoản đăng nhập"]
  };

  const ACTIVE_TAB_STORAGE_KEY = 'fadoagri_active_tab';

  function goTab(tab){
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === 'tab-' + tab));
    document.getElementById('page-title').textContent = titles[tab][0];
    document.getElementById('page-sub').textContent = titles[tab][1];
    window.scrollTo({top:0, behavior:'smooth'});
    try{ localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab); }catch(e){}
  }

  // Cho phép các module khác (Tổng quan...) điều hướng thẳng tới 1 lô hàng
  // cụ thể trong tab Truy xuất lô hàng — module đó tự gán hàm thật vào
  // traceModuleOpen sau khi khởi tạo xong (tránh phụ thuộc thứ tự IIFE).
  let traceModuleOpen = null;
  function goToBatchTrace(batchCode){
    goTab('donhang');
    if(traceModuleOpen) traceModuleOpen(batchCode);
  }

  // Refresh trang xong vẫn ở đúng module đang xem trước đó — chỉ khôi phục
  // sau khi quyền theo vai trò đã áp dụng (applyRolePermissions), để không
  // nhảy vào 1 module mà role hiện tại không có quyền xem.
  function restoreActiveTab(){
    let saved;
    try{ saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY); }catch(e){ saved = null; }
    if(!saved || !titles[saved]) return;
    const navBtn = document.querySelector('.nav-item[data-tab="' + saved + '"]');
    if(!navBtn || navBtn.style.display === 'none') return;
    goTab(saved);
  }

  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> goTab(btn.dataset.tab));
  });

  // ---- Modal xác nhận xóa dùng chung (thay window.confirm) ----
  // Trả về Promise<boolean> — resolve(true) nếu bấm "Xóa", resolve(false)
  // nếu Hủy/bấm ra ngoài. Rơi về window.confirm() nếu vì lý do gì đó modal
  // chưa có trong DOM (an toàn, không chặn thao tác xóa).
  function confirmDialog(message, opts){
    opts = opts || {};
    const overlay = document.getElementById('confirm-overlay');
    const msgEl = document.getElementById('confirm-message');
    const titleEl = document.getElementById('confirm-title');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    if(!overlay || !msgEl || !titleEl || !okBtn || !cancelBtn){
      return Promise.resolve(window.confirm(message));
    }
    return new Promise(function(resolve){
      titleEl.textContent = opts.title || 'Xác nhận xóa';
      msgEl.textContent = message;
      okBtn.textContent = opts.okLabel || 'Xóa';
      okBtn.className = opts.danger === false ? 'btn-primary' : 'btn-danger';
      overlay.classList.add('active');
      function cleanup(result){
        overlay.classList.remove('active');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        resolve(result);
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      function onOverlay(e){ if(e.target === overlay) cleanup(false); }
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
    });
  }

  // ---- Toast "Hoàn tác" sau khi xóa (xóa thật ra là xóa mềm — set deleted_at) ----
  // onUndo là hàm async gỡ deleted_at + tải lại danh sách; tự ẩn sau 6s nếu
  // không bấm Hoàn tác.
  function showUndoToast(message, onUndo){
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Hoàn tác';
    toast.appendChild(undoBtn);
    container.appendChild(toast);
    const timer = setTimeout(function(){ toast.remove(); }, 6000);
    undoBtn.addEventListener('click', async function(){
      clearTimeout(timer);
      undoBtn.disabled = true;
      undoBtn.textContent = 'Đang hoàn tác...';
      try{
        if(onUndo) await onUndo();
      } finally {
        toast.remove();
      }
    });
  }

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
  const btnOpenAddOrder = document.getElementById('btn-open-add-order');

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
    // Đơn hàng: mọi vai trò XEM được (để chuẩn bị kế hoạch), nhưng chỉ Admin
    // được thêm/sửa — đơn hàng do nội bộ nghe lại từ sale qua điện thoại/
    // Zalo... không phải sale tự vào hệ thống nhập.
    if(btnOpenAddOrder) btnOpenAddOrder.style.display = currentUser.role === 'admin' ? '' : 'none';
    if(currentUserName) currentUserName.textContent = currentUser.full_name || currentUser.email || '—';
    if(currentUserRole) currentUserRole.textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  }

  async function loadCurrentUserProfile(authUser){
    const { data, error } = await sb.from('profiles').select('*').eq('id', authUser.id).is('deleted_at', null).single();
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
    restoreActiveTab();
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
  // Xuất Excel dùng chung cho mọi nút "Xuất Excel" — nhân bản bảng ra ngoài
  // DOM rồi thay <select>/<input> (ô sửa nhanh inline) bằng chữ đúng giá trị
  // đang hiển thị, bỏ hẳn <button> (nút thao tác) trước khi đưa cho SheetJS,
  // để giữ nguyên khả năng đọc đúng rowSpan/colSpan có sẵn của thư viện mà
  // không bị lẫn text thao tác/rỗng vào dữ liệu xuất ra.
  function exportTableToExcel(tableEl, filename, sheetName, opts){
    if(!tableEl) return;
    if(typeof XLSX === 'undefined'){
      alert('Không tải được thư viện xuất Excel — kiểm tra kết nối mạng rồi thử lại.');
      return;
    }
    const clone = tableEl.cloneNode(true);
    if(opts && opts.skipSelector){
      Array.prototype.forEach.call(clone.querySelectorAll(opts.skipSelector), function(row){ row.remove(); });
    }
    Array.prototype.forEach.call(clone.querySelectorAll('select'), function(sel){
      const text = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
      sel.replaceWith(document.createTextNode(text));
    });
    Array.prototype.forEach.call(clone.querySelectorAll('input'), function(inp){
      inp.replaceWith(document.createTextNode(inp.value || ''));
    });
    Array.prototype.forEach.call(clone.querySelectorAll('button'), function(btn){ btn.remove(); });
    const wb = XLSX.utils.table_to_book(clone, { sheet: (sheetName || 'Sheet1').slice(0, 31), raw: false });
    XLSX.writeFile(wb, filename);
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

  // ---- Gợi ý sẵn (datalist) cho các ô hay bị gõ lại tay ----
  // Tên lô hàng được tham chiếu bằng TEXT ở 6 bảng khác (PO, QC, Logistics,
  // Chứng từ, Feedback, Tồn kho) và không có cascade rename — gõ lệch 1 ký tự
  // là lô đó tách rời khỏi dữ liệu của chính nó. Cho chọn từ danh sách đơn đã
  // có thay vì gõ lại là cách rẻ nhất để triệt tiêu loại lỗi này. Vẫn dùng
  // <input list=...> chứ không phải <select> để không chặn trường hợp nhập lô
  // chưa kịp đăng ký ở tab Đơn hàng.
  function fillDatalist(datalistId, values){
    const dl = document.getElementById(datalistId);
    if(!dl) return;
    dl.textContent = '';
    values.forEach(function(v){
      if(!v) return;
      const opt = document.createElement('option');
      opt.value = v;
      dl.appendChild(opt);
    });
  }
  function knownBatchNames(){
    return Object.values(sharedBatchSummaries)
      .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
      .map(function(b){ return b.batch; })
      .sort(function(a, b){ return a.localeCompare(b, 'vi'); });
  }
  // Mô tả ngắn của đơn hàng khớp tên lô đang gõ — hiện ngay dưới ô nhập để
  // người nhập thấy đang gắn vào đúng đơn nào (khách nào, hàng gì) mà không
  // phải mở tab Đơn hàng ra đối chiếu.
  function orderHintText(batchCode){
    const b = batchCode && sharedBatchSummaries[batchCode];
    if(!b || !b.hasOrderInfo) return '';
    const parts = [];
    if(b.khachHang) parts.push('Khách: ' + b.khachHang);
    if(b.sanPhamDuKien) parts.push(b.sanPhamDuKien);
    if(b.soLuongDuKien) parts.push('dự kiến ' + b.soLuongDuKien);
    if(b.ngayGiaoMongMuon) parts.push('giao ' + fmtDate(b.ngayGiaoMongMuon));
    return parts.length ? ('Khớp đơn đã chốt — ' + parts.join(' · ')) : '';
  }
  // Gắn 1 ô input với datalist gợi ý + dòng mô tả đơn tương ứng bên dưới.
  function bindBatchHint(inputId, hintId){
    const input = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    if(!input || !hint) return;
    function update(){
      const text = orderHintText(input.value.trim());
      hint.textContent = text;
      hint.style.display = text ? '' : 'none';
    }
    input.addEventListener('input', update);
    input.addEventListener('change', update);
    onBatchSummaryChanged(update);
    update();
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

    // form.reset()/fillForm gán giá trị bằng JS nên KHÔNG tự bắn sự kiện
    // 'input' — các ô có gợi ý kèm dòng mô tả (xem bindBatchHint) sẽ giữ
    // nguyên nội dung của lần mở trước nếu không tự bắn lại.
    function refreshHintedInputs(){
      form.querySelectorAll('input[list]').forEach(function(el){
        el.dispatchEvent(new Event('input'));
      });
    }
    function openAddModal(){
      editingRow = null;
      form.reset();
      refreshHintedInputs();
      modalTitle.textContent = opts.addTitle;
      submitBtn.textContent = opts.addLabel;
      openModal();
    }
    function openEditModal(tr){
      editingRow = tr;
      opts.fillForm(form, tr);
      refreshHintedInputs();
      modalTitle.textContent = opts.editTitle;
      submitBtn.textContent = opts.editLabel;
      openModal();
    }

    async function deleteRow(tr){
      const id = tr.dataset.id;
      if(!id) return;
      const label = opts.deleteLabel ? (opts.deleteLabel(tr) || 'dòng này') : 'dòng này';
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from(opts.table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if(error) throw error;
        await refreshRows();
        if(opts.afterSave) opts.afterSave();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from(opts.table).update({ deleted_at: null }).eq('id', id);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshRows();
          if(opts.afterSave) opts.afterSave();
        });
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
      let q = sb.from(opts.table).select('*').is('deleted_at', null);
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
      if(opts.validate && !opts.validate(payload)){
        alert(opts.validateMessage || 'Thiếu thông tin bắt buộc — vui lòng kiểm tra lại các trường bắt buộc trong form.');
        return;
      }

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
    const supplierTbody = document.getElementById('raw-supplier-tbody');
    const modalTitle = document.getElementById('add-batch-modal-title');
    const submitBtn = document.getElementById('btn-submit-add-batch');
    const rawSearchInput = document.getElementById('raw-search-input');
    const rawMonthSelect = document.getElementById('raw-month-select');
    const rawYearSelect = document.getElementById('raw-year-select');
    let latestProfiles = {};
    let latestRawRows = [];

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
          statWeekNote.textContent = weekRows.length ? ('Từ ' + suppliers.size + ' đầu mối') : 'Chưa có lô nào tuần này';
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
      const batchInput = document.getElementById('f-batch');
      batchInput.readOnly = false;
      const batchHint = document.getElementById('f-batch-hint');
      if(batchHint) batchHint.textContent = 'Chọn từ danh sách đơn đã chốt để khỏi gõ sai — hoặc gõ mới theo mẫu: Tên khách hàng - Số đơn.Năm (2 số cuối)';
      // form.reset() không bắn 'input' nên dòng mô tả đơn phải tự làm mới,
      // nếu không sẽ còn sót nội dung của lô vừa mở lần trước.
      batchInput.dispatchEvent(new Event('input'));
      modalTitle.textContent = 'Thêm lô nguyên liệu';
      submitBtn.textContent = 'Thêm lô hàng';
      openModal();
    }

    function openEditModal(tr){
      editingRow = tr;
      const batchInput = document.getElementById('f-batch');
      batchInput.value = tr.dataset.batch || '';
      // Khóa đổi tên lô sau khi đã tạo — tên lô được tham chiếu bằng text ở
      // 7 bảng khác (PO, QC, Logistics, Chứng từ, Feedback, Hình thức, Xuất
      // kho), đổi tự do ở đây sẽ làm mồ côi toàn bộ dữ liệu liên quan vì
      // không có cơ chế cascade rename.
      batchInput.readOnly = true;
      const batchHint = document.getElementById('f-batch-hint');
      if(batchHint) batchHint.textContent = 'Không đổi được tên lô sau khi tạo (tránh làm mất liên kết dữ liệu QC/Logistics/Chứng từ... của lô này).';
      batchInput.dispatchEvent(new Event('input'));
      document.getElementById('f-ncc').value = tr.dataset.ncc || '';
      const loaiRadio = form.querySelector('input[name="f-loai"][value="' + tr.dataset.loai + '"]');
      if(loaiRadio) loaiRadio.checked = true;
      document.getElementById('f-chungloai').value = tr.dataset.chungLoai || '';
      document.getElementById('f-soluong').value = tr.dataset.soluong || '';
      document.getElementById('f-ngay').value = tr.dataset.ngayNhap || '';
      document.getElementById('f-ngay-hen').value = tr.dataset.ngayHenGiao || '';
      document.getElementById('f-gio-hen').value = (tr.dataset.gioHenGiao || '').slice(0, 5);
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
      const label = 'lô nguyên liệu "' + (tr.dataset.batch || '') + '"';
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if(error) throw error;
        await refreshRows();
        notifyRawBatchesChanged();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from(TABLE).update({ deleted_at: null }).eq('id', id);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshRows();
          notifyRawBatchesChanged();
        });
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    tbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){ openEditModal(editBtnEl.closest('tr')); return; }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteRow(delBtnEl.closest('tr')); return; }
      const summaryEl = e.target.closest('.batch-summary-row');
      if(summaryEl){
        const expanded = summaryEl.classList.toggle('expanded');
        let next = summaryEl.nextElementSibling;
        while(next && next.classList.contains('batch-detail-row')){
          next.style.display = expanded ? '' : 'none';
          next = next.nextElementSibling;
        }
      }
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
      tr.dataset.ngayHenGiao = d.ngay_hen_giao || '';
      tr.dataset.gioHenGiao = d.gio_hen_giao || '';
      tr.dataset.trangThai = d.trang_thai;
      tr.dataset.ghiChu = d.ghi_chu || '';
    }

    // Mỗi lượt nhập nguyên liệu là 1 dòng chi tiết; các dòng cùng 1 mã lô
    // được gộp dưới 1 dòng tổng hợp (accordion) — mặc định thu gọn, bấm vào
    // dòng tổng hợp để mở/đóng xem từng lượt nhập. Lô chỉ có 1 lượt nhập thì
    // hiện thẳng luôn, không cần gộp/mở rộng.
    function createDetailRow(d, showBatch){
      const tr = document.createElement('tr');
      tr.className = 'hoverable';
      applyRowData(tr, d);

      const batchTd = document.createElement('td');
      if(showBatch) batchTd.textContent = d.batch;
      tr.appendChild(batchTd);

      const nccTd = document.createElement('td');
      nccTd.textContent = d.ncc;
      tr.appendChild(nccTd);

      const loaiTd = document.createElement('td');
      loaiTd.textContent = d.loai;
      tr.appendChild(loaiTd);

      const chungLoaiTd = document.createElement('td');
      chungLoaiTd.textContent = d.chung_loai || '—';
      tr.appendChild(chungLoaiTd);

      const soluongTd = document.createElement('td');
      soluongTd.textContent = d.soluong ? d.soluong + ' trái' : '—';
      tr.appendChild(soluongTd);

      const ngayTd = document.createElement('td');
      ngayTd.textContent = formatDate(d.ngay_nhap);
      tr.appendChild(ngayTd);

      const trangThaiTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge ' + statusBadge[d.trang_thai];
      badge.textContent = d.trang_thai;
      trangThaiTd.appendChild(badge);
      tr.appendChild(trangThaiTd);

      const ghiChuTd = document.createElement('td');
      ghiChuTd.textContent = d.ghi_chu || '—';
      tr.appendChild(ghiChuTd);

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

      return tr;
    }

    function createSummaryRow(items){
      const tr = document.createElement('tr');
      tr.className = 'hoverable batch-summary-row';
      tr.dataset.batch = items[0].batch || '';

      const batchTd = document.createElement('td');
      const chevron = document.createElement('i');
      chevron.className = 'ti ti-chevron-right batch-chevron';
      batchTd.appendChild(chevron);
      batchTd.appendChild(document.createTextNode(' ' + (items[0].batch || '')));
      tr.appendChild(batchTd);

      const nccCount = new Set(items.map(function(d){ return d.ncc; }).filter(Boolean)).size;
      const nccTd = document.createElement('td');
      nccTd.textContent = nccCount + ' đầu mối';
      tr.appendChild(nccTd);

      const loaiTd = document.createElement('td');
      const loaiSet = Array.from(new Set(items.map(function(d){ return d.loai; }).filter(Boolean)));
      loaiTd.textContent = loaiSet.join(', ') || '—';
      tr.appendChild(loaiTd);

      const chungLoaiTd = document.createElement('td');
      const chungLoaiSet = Array.from(new Set(items.map(function(d){ return d.chung_loai; }).filter(Boolean)));
      chungLoaiTd.textContent = chungLoaiSet.join(', ') || '—';
      tr.appendChild(chungLoaiTd);

      const total = items.reduce(function(sum, d){ return sum + parseQuantity(d.soluong); }, 0);
      const totalTd = document.createElement('td');
      totalTd.textContent = total.toLocaleString('vi-VN') + ' trái (' + items.length + ' lượt)';
      tr.appendChild(totalTd);

      const dates = items.map(function(d){ return d.ngay_nhap; }).filter(Boolean).sort();
      const dateTd = document.createElement('td');
      if(!dates.length) dateTd.textContent = '—';
      else if(dates[0] === dates[dates.length - 1]) dateTd.textContent = formatDate(dates[0]);
      else dateTd.textContent = formatDate(dates[0]) + ' – ' + formatDate(dates[dates.length - 1]);
      tr.appendChild(dateTd);

      const statusTd = document.createElement('td');
      let worst = 'Đạt chuẩn';
      if(items.some(function(d){ return d.trang_thai === 'Chờ kiểm tra'; })) worst = 'Chờ kiểm tra';
      else if(items.some(function(d){ return d.trang_thai === 'Từ chối một phần'; })) worst = 'Từ chối một phần';
      const badge = document.createElement('span');
      badge.className = 'badge ' + statusBadge[worst];
      badge.textContent = worst === 'Đạt chuẩn' ? ('Đạt chuẩn (' + items.length + ')') : worst;
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      const noteCount = items.filter(function(d){ return d.ghi_chu; }).length;
      const noteTd = document.createElement('td');
      noteTd.textContent = noteCount ? (noteCount + ' ghi chú') : '—';
      tr.appendChild(noteTd);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'row-actions muted';
      actionsTd.style.fontSize = '11.5px';
      actionsTd.textContent = items.length + ' dòng';
      tr.appendChild(actionsTd);

      return tr;
    }

    function renderRows(rows){
      tbody.textContent = '';
      // Gom theo lô hàng, giữ nguyên thứ tự xuất hiện đầu tiên của mỗi lô
      // (không sắp xếp lại) — rows đã sắp theo ngày nhập/created_at mới nhất
      // trước.
      const groups = [];
      const groupIndex = {};
      rows.forEach(function(d){
        const key = d.batch || '';
        if(!(key in groupIndex)){ groupIndex[key] = groups.length; groups.push([]); }
        groups[groupIndex[key]].push(d);
      });
      groups.forEach(function(items){
        if(items.length === 1){
          tbody.appendChild(createDetailRow(items[0], true));
          return;
        }
        tbody.appendChild(createSummaryRow(items));
        items.forEach(function(d){
          const tr = createDetailRow(d, false);
          tr.classList.add('batch-detail-row');
          tr.style.display = 'none';
          tbody.appendChild(tr);
        });
      });
    }

    // Bảng "Danh sách đầu mối thu mua" — tổng hợp tự động từ chính các lô
    // nguyên liệu đã nhập (không phải bảng nhập tay riêng), để tránh trùng
    // dữ liệu với NCC thương mại bên module Nhà cung cấp.
    function rateBadge(pct){
      const badge = document.createElement('span');
      badge.className = 'badge ' + (pct >= 85 ? 'green' : (pct >= 60 ? 'amber' : 'red'));
      badge.textContent = pct + '%';
      return badge;
    }

    function renderSupplierSummary(rows, profiles){
      if(!supplierTbody) return;
      supplierTbody.textContent = '';
      profiles = profiles || {};

      const groups = [];
      const groupIndex = {};
      rows.forEach(function(d){
        const key = d.ncc || '';
        if(!key) return;
        if(!(key in groupIndex)){
          groupIndex[key] = groups.length;
          groups.push({
            ncc: key, loai: d.loai, batches: new Set(), total: 0,
            decided: 0, passed: 0, chungLoaiTotals: {},
            onTimeConsidered: 0, onTime: 0
          });
        }
        const g = groups[groupIndex[key]];
        g.batches.add(d.batch || '');
        const qty = parseQuantity(d.soluong);
        g.total += qty;
        if(d.trang_thai && d.trang_thai !== 'Chờ kiểm tra'){
          g.decided += 1;
          if(d.trang_thai === 'Đạt chuẩn') g.passed += 1;
        }
        if(d.chung_loai) g.chungLoaiTotals[d.chung_loai] = (g.chungLoaiTotals[d.chung_loai] || 0) + qty;
        if(d.ngay_hen_giao && d.ngay_nhap){
          g.onTimeConsidered += 1;
          if(d.ngay_nhap <= d.ngay_hen_giao) g.onTime += 1;
        }
      });

      // Đầu mối mới thêm qua modal (chưa có lô nguyên liệu nào) vẫn phải
      // hiện trong bảng — số liệu tổng hợp mặc định 0/— tới khi có lô thật.
      Object.keys(profiles).forEach(function(name){
        if(!(name in groupIndex)){
          groups.push({
            ncc: name, loai: null, batches: new Set(), total: 0,
            decided: 0, passed: 0, chungLoaiTotals: {},
            onTimeConsidered: 0, onTime: 0
          });
        }
      });

      if(!groups.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 12;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Chưa có đầu mối nào.';
        tr.appendChild(td);
        supplierTbody.appendChild(tr);
        return;
      }

      groups.sort(function(a, b){ return b.total - a.total; });

      groups.forEach(function(g){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.ncc = g.ncc;

        const nccTd = document.createElement('td');
        nccTd.textContent = g.ncc;
        tr.appendChild(nccTd);

        const loaiTd = document.createElement('td');
        loaiTd.textContent = g.loai || '—';
        tr.appendChild(loaiTd);

        const topChungLoaiTd = document.createElement('td');
        const chungLoaiEntries = Object.keys(g.chungLoaiTotals);
        if(chungLoaiEntries.length){
          chungLoaiEntries.sort(function(a, b){ return g.chungLoaiTotals[b] - g.chungLoaiTotals[a]; });
          topChungLoaiTd.textContent = chungLoaiEntries[0];
        } else {
          topChungLoaiTd.textContent = '—';
        }
        tr.appendChild(topChungLoaiTd);

        const countTd = document.createElement('td');
        countTd.textContent = String(g.batches.size);
        tr.appendChild(countTd);

        const totalTd = document.createElement('td');
        totalTd.textContent = g.total.toLocaleString('vi-VN') + ' trái';
        tr.appendChild(totalTd);

        const avgTd = document.createElement('td');
        avgTd.textContent = g.batches.size ? (Math.round(g.total / g.batches.size).toLocaleString('vi-VN') + ' trái') : '—';
        tr.appendChild(avgTd);

        const rateTd = document.createElement('td');
        if(g.decided) rateTd.appendChild(rateBadge(Math.round(g.passed / g.decided * 100)));
        else rateTd.textContent = '—';
        tr.appendChild(rateTd);

        const onTimeTd = document.createElement('td');
        if(g.onTimeConsidered) onTimeTd.appendChild(rateBadge(Math.round(g.onTime / g.onTimeConsidered * 100)));
        else onTimeTd.textContent = '—';
        tr.appendChild(onTimeTd);

        const profile = profiles[g.ncc] || {};

        const addressTd = document.createElement('td');
        addressTd.textContent = profile.address || '—';
        tr.appendChild(addressTd);

        const phoneTd = document.createElement('td');
        phoneTd.textContent = profile.phone || '—';
        tr.appendChild(phoneTd);

        const noteTd = document.createElement('td');
        noteTd.textContent = profile.note || '—';
        tr.appendChild(noteTd);

        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.setAttribute('aria-label', 'Sửa hồ sơ đầu mối');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        actionsTd.appendChild(editBtn);
        tr.appendChild(actionsTd);

        supplierTbody.appendChild(tr);
      });
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
        .is('deleted_at', null)
        .order('ngay_nhap', { ascending: false })
        .order('created_at', { ascending: false });
      if(error) throw error;
      return data;
    }

    // Hồ sơ đầu mối (địa chỉ/SĐT/ghi chú) — bảng riêng raw_suppliers, nhập
    // tay qua modal sửa, khớp với raw_batches.ncc theo tên. Lỗi tải hồ sơ
    // không chặn bảng tổng hợp chính hiển thị (chỉ thiếu cột địa chỉ/SĐT).
    async function fetchSupplierProfiles(){
      try{
        const { data, error } = await sb.from('raw_suppliers').select('*');
        if(error) throw error;
        const map = {};
        (data || []).forEach(function(p){ map[p.name] = p; });
        return map;
      } catch(err){
        console.error('Không tải được hồ sơ đầu mối:', err);
        return {};
      }
    }

    // Tìm kiếm + lọc tháng/năm chỉ áp cho bảng danh sách — thống kê đầu
    // trang và bảng đầu mối vẫn tính trên TOÀN BỘ dữ liệu, không theo bộ lọc
    // này (đúng vai trò tổng quan, không phải theo đang xem gì).
    function matchesRawSearch(d){
      const q = (rawSearchInput && rawSearchInput.value || '').trim().toLowerCase();
      if(!q) return true;
      return (d.batch || '').toLowerCase().indexOf(q) !== -1
        || (d.ncc || '').toLowerCase().indexOf(q) !== -1;
    }
    function matchesRawPeriod(d){
      if(!rawYearSelect || !rawYearSelect.value) return true;
      const p = periodParts(d.ngay_nhap);
      if(!p) return false;
      if(p.year !== Number(rawYearSelect.value)) return false;
      if(rawMonthSelect && rawMonthSelect.value && p.month !== Number(rawMonthSelect.value)) return false;
      return true;
    }
    function applyRawFilters(rows){
      // Có từ khóa tìm kiếm thì bỏ qua bộ lọc tháng/năm — nếu không, lô nào
      // thiếu ngày nhập hàng (ngay_nhap null, VD: nhập lô mà bỏ trống ngày)
      // sẽ vĩnh viễn không khớp bộ lọc kỳ nào cả, ẩn mất khỏi tìm kiếm dù
      // gõ đúng tên/mã lô.
      const hasSearch = !!(rawSearchInput && rawSearchInput.value.trim());
      return rows.filter(function(d){ return matchesRawSearch(d) && (hasSearch || matchesRawPeriod(d)); });
    }
    function populateRawPeriodSelect(rows){
      if(!rawYearSelect) return;
      const years = rows.map(function(d){ const p = periodParts(d.ngay_nhap); return p ? p.year : null; }).filter(Boolean);
      populateMonthYearSelect(rawMonthSelect, rawYearSelect, years);
    }
    function renderFilteredRows(){
      const filtered = applyRawFilters(latestRawRows);
      if(!latestRawRows.length) return;
      if(!filtered.length){
        tbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 9;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Không có lô nào khớp tìm kiếm/kỳ đã chọn.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      renderRows(filtered);
    }
    if(rawSearchInput) rawSearchInput.addEventListener('input', renderFilteredRows);
    if(rawMonthSelect) rawMonthSelect.addEventListener('change', renderFilteredRows);
    if(rawYearSelect) rawYearSelect.addEventListener('change', renderFilteredRows);

    async function refreshRows(){
      try{
        const rows = await fetchRows();
        latestProfiles = await fetchSupplierProfiles();
        latestRawRows = rows;
        populateRawPeriodSelect(rows);
        renderRows(applyRawFilters(rows));
        updateStats(rows);
        renderSupplierSummary(rows, latestProfiles);
        // Đầu mối gợi ý gộp cả hồ sơ đã lập (raw_suppliers) lẫn tên đã từng
        // nhập ở các lô cũ — tên gõ khác nhau cho cùng 1 đầu mối làm hỏng
        // thống kê "Tỷ lệ giao đúng hẹn" tính theo tên.
        const nccNames = {};
        Object.keys(latestProfiles).forEach(function(n){ nccNames[n] = true; });
        rows.forEach(function(d){ if(d.ncc) nccNames[d.ncc] = true; });
        fillDatalist('dl-raw-suppliers', Object.keys(nccNames).sort(function(a, b){ return a.localeCompare(b, 'vi'); }));
      } catch(err){
        console.error('Không tải được dữ liệu từ Supabase:', err);
        showError('Không tải được dữ liệu — kiểm tra kết nối Supabase.');
        if(supplierTbody) supplierTbody.textContent = '';
      }
    }

    showLoading();
    refreshRows();
    bindBatchHint('f-batch', 'f-batch-order-hint');

    form.addEventListener('submit', async function(e){
      e.preventDefault();

      const batch = document.getElementById('f-batch').value.trim();
      const ncc = document.getElementById('f-ncc').value.trim();
      const loai = form.querySelector('input[name="f-loai"]:checked').value;
      const chungloai = document.getElementById('f-chungloai').value.trim();
      const soluong = document.getElementById('f-soluong').value.trim();
      const ngay = document.getElementById('f-ngay').value;
      const ngayHen = document.getElementById('f-ngay-hen').value;
      const gioHen = document.getElementById('f-gio-hen').value;
      const trangthai = document.getElementById('f-trangthai').value;
      const ghichu = document.getElementById('f-ghichu').value.trim();

      if(!batch || !ncc){
        alert('Vui lòng nhập đủ Lô hàng và Đầu mối thu mua.');
        return;
      }

      const payload = {
        batch: batch,
        ncc: ncc,
        loai: loai,
        chung_loai: chungloai || null,
        soluong: soluong,
        ngay_nhap: ngay || null,
        ngay_hen_giao: ngayHen || null,
        gio_hen_giao: gioHen || null,
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

    // ---- Modal thêm/sửa hồ sơ đầu mối (địa chỉ/SĐT/ghi chú) ----
    const rsOverlay = document.getElementById('add-raw-supplier-overlay');
    const rsOpenBtn = document.getElementById('btn-open-add-raw-supplier');
    const rsCloseBtn = document.getElementById('btn-close-add-raw-supplier');
    const rsCancelBtn = document.getElementById('btn-cancel-add-raw-supplier');
    const rsForm = document.getElementById('form-add-raw-supplier');
    const rsSubmitBtn = document.getElementById('btn-submit-add-raw-supplier');
    const rsModalTitle = document.getElementById('add-raw-supplier-modal-title');
    const rsNameInput = document.getElementById('rs-name');

    if(rsOverlay && rsForm && supplierTbody){
      // Sửa hồ sơ đầu mối đã có (từ nút bút chì trong bảng) — tên khóa với
      // raw_batches.ncc nên khóa luôn ô tên, tránh gõ nhầm làm mất liên kết.
      const openEditRawSupplierModal = function(name){
        const profile = latestProfiles[name] || {};
        rsNameInput.value = name;
        rsNameInput.readOnly = true;
        document.getElementById('rs-address').value = profile.address || '';
        document.getElementById('rs-phone').value = profile.phone || '';
        document.getElementById('rs-note').value = profile.note || '';
        rsModalTitle.textContent = 'Sửa hồ sơ đầu mối';
        rsSubmitBtn.textContent = 'Lưu';
        rsOverlay.classList.add('active');
      };
      // Thêm đầu mối mới chưa từng có lô hàng nào — gõ tên tự do, đầu mối sẽ
      // xuất hiện ngay trong bảng tổng hợp (số liệu lô/số lượng vẫn là 0/—
      // cho tới khi có lô nguyên liệu thực nhập cho đầu mối này).
      const openAddRawSupplierModal = function(){
        rsForm.reset();
        rsNameInput.readOnly = false;
        rsModalTitle.textContent = 'Thêm đầu mối';
        rsSubmitBtn.textContent = 'Thêm đầu mối';
        rsOverlay.classList.add('active');
      };
      const closeRawSupplierModal = function(){
        rsOverlay.classList.remove('active');
        rsForm.reset();
        rsNameInput.readOnly = false;
      };

      const exportRawSupplierBtn = document.getElementById('btn-export-raw-supplier');
      if(exportRawSupplierBtn){
        exportRawSupplierBtn.addEventListener('click', function(){
          exportTableToExcel(supplierTbody.closest('table'), 'dau-moi-thu-mua-' + todayStr() + '.xlsx', 'Đầu mối thu mua');
        });
      }

      if(rsOpenBtn) rsOpenBtn.addEventListener('click', openAddRawSupplierModal);
      rsCloseBtn.addEventListener('click', closeRawSupplierModal);
      rsCancelBtn.addEventListener('click', closeRawSupplierModal);
      rsOverlay.addEventListener('click', function(e){ if(e.target === rsOverlay) closeRawSupplierModal(); });

      supplierTbody.addEventListener('click', function(e){
        const btn = e.target.closest('.row-edit-btn');
        if(!btn) return;
        const tr = btn.closest('tr');
        if(tr && tr.dataset.ncc) openEditRawSupplierModal(tr.dataset.ncc);
      });

      rsForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const name = document.getElementById('rs-name').value.trim();
        if(!name) return;
        const payload = {
          name: name,
          address: document.getElementById('rs-address').value.trim() || null,
          phone: document.getElementById('rs-phone').value.trim() || null,
          note: document.getElementById('rs-note').value.trim() || null
        };
        const originalLabel = rsSubmitBtn.textContent;
        rsSubmitBtn.disabled = true;
        rsSubmitBtn.textContent = 'Đang lưu...';
        try{
          const { error } = await sb.from('raw_suppliers').upsert(payload, { onConflict: 'name' });
          if(error) throw error;
          closeRawSupplierModal();
          await refreshRows();
        } catch(err){
          alert('Không thể lưu hồ sơ đầu mối: ' + err.message);
        } finally {
          rsSubmitBtn.disabled = false;
          rsSubmitBtn.textContent = originalLabel;
        }
      });
    }
  })();

  // ---- Nhà cung cấp ----
  (function(){
    const ratingTbody = document.getElementById('supplier-rating-tbody');
    function rankingBadgeClass(r){ return r === 'Tốt' ? 'green' : (r === 'Cần theo dõi' ? 'amber' : 'gray'); }
    function rateClass(n){ return (n !== null && n >= 85) ? 'success' : 'warn-text'; }

    // Tỷ lệ đạt QC / Giao đúng hẹn giờ tự tính thật từ purchase_orders + qc_checks
    // (giống cách đã làm cho đầu mối thu mua ở Vùng nguyên liệu), không còn gõ
    // tay — tránh số liệu bị cũ/sai vì không ai nhớ cập nhật.
    async function renderSupplierRatings(supplierRows){
      if(!ratingTbody || !sb) return;
      ratingTbody.textContent = '';
      let poRows = [], qcRows = [];
      try{
        const [poRes, qcRes] = await Promise.all([
          sb.from('purchase_orders').select('*').is('deleted_at', null),
          sb.from('qc_checks').select('batch_code,result').is('deleted_at', null)
        ]);
        poRows = poRes.data || [];
        qcRows = qcRes.data || [];
      } catch(err){
        console.error('Không tải được dữ liệu đánh giá NCC:', err);
      }

      const stats = {};
      function ensure(name){
        if(!stats[name]) stats[name] = { name: name, batches: new Set(), onTimeConsidered: 0, onTime: 0, ranking: null };
        return stats[name];
      }
      supplierRows.forEach(function(s){ if(s.name){ ensure(s.name).ranking = s.ranking || null; } });
      poRows.forEach(function(p){
        if(!p.supplier_name) return;
        const st = ensure(p.supplier_name);
        if(p.batch_code) st.batches.add(p.batch_code);
        if(p.ngay_hen_giao && p.ngay_giao_thuc_te){
          st.onTimeConsidered += 1;
          if(p.ngay_giao_thuc_te <= p.ngay_hen_giao) st.onTime += 1;
        }
      });

      const list = Object.values(stats).filter(function(s){ return s.batches.size > 0 || s.ranking; });
      if(!list.length){
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

      list.forEach(function(s){
        const decided = qcRows.filter(function(q){ return s.batches.has(q.batch_code) && q.result && q.result !== 'Chờ xác nhận'; });
        const passed = decided.filter(function(q){ return q.result === 'Đạt'; });
        const qcPassRate = decided.length ? Math.round(passed.length / decided.length * 100) : null;
        const onTimeRate = s.onTimeConsidered ? Math.round(s.onTime / s.onTimeConsidered * 100) : null;

        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        const nameTd = document.createElement('td');
        nameTd.textContent = s.name;
        const qcTd = document.createElement('td');
        qcTd.className = rateClass(qcPassRate);
        qcTd.textContent = qcPassRate != null ? qcPassRate + '%' : '—';
        const otTd = document.createElement('td');
        otTd.className = rateClass(onTimeRate);
        otTd.textContent = onTimeRate != null ? onTimeRate + '%' : '—';
        const rankTd = document.createElement('td');
        if(s.ranking){
          const badge = document.createElement('span');
          badge.className = 'badge ' + rankingBadgeClass(s.ranking);
          badge.textContent = s.ranking;
          rankTd.appendChild(badge);
        } else {
          rankTd.textContent = '—';
        }
        tr.appendChild(nameTd); tr.appendChild(qcTd); tr.appendChild(otTd); tr.appendChild(rankTd);
        ratingTbody.appendChild(tr);
      });
    }

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
        document.getElementById('s-ranking').value = tr.dataset.ranking || '';
      },
      readForm: function(form){
        return {
          name: fieldVal('s-name'),
          category: fieldVal('s-category') || null,
          contact: fieldVal('s-contact') || null,
          suggestion: fieldVal('s-suggestion') || null,
          ranking: fieldVal('s-ranking') || null
        };
      },
      validate: function(payload){ return !!payload.name; },
      validateMessage: 'Vui lòng nhập Tên nhà cung cấp.',
      afterRender: function(rows){
        renderSupplierRatings(rows);
        // Ô "NCC" ở form PO gợi ý theo đúng danh sách NCC đã lập hồ sơ — tên
        // gõ lệch sẽ tách đơn khỏi hồ sơ NCC, làm sai bảng đánh giá NCC.
        fillDatalist('dl-suppliers', rows.map(function(d){ return d.name; })
          .filter(Boolean).sort(function(a, b){ return a.localeCompare(b, 'vi'); }));
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
        const { data, error } = await sb.from('purchase_orders').select('created_at').is('deleted_at', null);
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
        tr.dataset.ngayHenGiao = d.ngay_hen_giao || '';
        tr.dataset.ngayGiaoThucTe = d.ngay_giao_thuc_te || '';

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
        document.getElementById('po-ngay-hen').value = tr.dataset.ngayHenGiao || '';
        document.getElementById('po-ngay-giao-thuc-te').value = tr.dataset.ngayGiaoThucTe || '';
        document.getElementById('po-status').value = tr.dataset.status || 'Chờ giao';
      },
      readForm: function(form){
        return {
          batch_code: fieldVal('po-batch') || null,
          po_code: fieldVal('po-code'),
          supplier_name: fieldVal('po-supplier'),
          category: fieldVal('po-category') || null,
          quantity: fieldVal('po-quantity') || null,
          ngay_hen_giao: fieldVal('po-ngay-hen') || null,
          ngay_giao_thuc_te: fieldVal('po-ngay-giao-thuc-te') || null,
          status: fieldVal('po-status')
        };
      },
      validate: function(payload){ return !!payload.po_code && !!payload.supplier_name; },
      validateMessage: 'Vui lòng nhập Mã đơn hàng và chọn Nhà cung cấp.',
      afterSave: function(){ notifyPurchaseOrdersChanged(); loadPoYears(); }
    });

    if(poMonthSelect) poMonthSelect.addEventListener('change', function(){ if(poModule) poModule.refreshRows(); });
    if(poYearSelect) poYearSelect.addEventListener('change', function(){ if(poModule) poModule.refreshRows(); });
    loadPoYears().then(function(){ if(poModule) poModule.refreshRows(); });
    bindBatchHint('po-batch', 'po-batch-order-hint');
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
    const orderSearchInput = document.getElementById('order-search-input');
    const orderMonthSelect = document.getElementById('order-month-select');
    const orderYearSelect = document.getElementById('order-year-select');

    // Khối nhập kết quả kiểm nhúng thẳng trên trang (không còn là modal nổi
    // lên nữa) — bấm 1 dòng trong bảng "Chọn lô để kiểm" là gắn khối này
    // vào ngay dưới dòng đó (insertDetailPanelAfterRow), bấm dòng đó lần
    // nữa hoặc bấm "Đóng" thì gỡ ra.
    const detailPanel = document.getElementById('qc-detail-panel');
    const pickTbody = document.getElementById('qc-pick-tbody');
    const pickSearchInput = document.getElementById('qc-pick-search');
    const pickMonthSelect = document.getElementById('qc-pick-month-select');
    const pickYearSelect = document.getElementById('qc-pick-year-select');
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

    if(!summaryTbody || !detailPanel || !pickTbody || !form || !sb) return;

    function resultBadgeClass(r){
      return { 'Chờ xác nhận': 'amber', 'Đạt': 'green', 'Không đạt 1 phần': 'red' }[r] || 'gray';
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
    // "Số lượng dự kiến" là ô gõ tay tự do lúc tạo đơn (VD "10.000 trái",
    // "5.200 cartons chanh + 200 cartons dừa") — chỉ lấy được số để so sánh
    // tiến độ khi đúng dạng "<số> trái" (đơn vị khớp với số nhập thô thật ở
    // Vùng nguyên liệu); dạng khác (thùng/cartons/nhiều dòng cộng "+") thì bỏ
    // qua, không suy đoán bừa ra 1 con số sai đơn vị.
    function parseLeadingTraiCount(text){
      const m = String(text || '').trim().match(/^([\d.,]+)\s*trái\s*$/i);
      if(!m) return null;
      const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    // Số lượng thùng của 1 đợt sản xuất = cộng dồn từng dòng Quy cách khai
    // báo sau khi đóng gói (factory_batch_boxes) — 1 đợt có thể đóng nhiều
    // quy cách khác nhau.
    function sumBoxRows(fb){
      if(!fb || !fb.factory_batch_boxes || !fb.factory_batch_boxes.length) return null;
      return fb.factory_batch_boxes.reduce(function(sum, r){ return sum + (Number(r.so_luong_thung) || 0); }, 0);
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
            varietyMap: {}, duaVarieties: [], duaBoxes: 0, sanPhamByVariety: {}, exportedByVariety: {},
            khachHang: null, sanPhamDuKien: null, soLuongDuKien: null, ngayGiaoMongMuon: null, hasOrderInfo: false, batchInfoCreatedAt: null
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
          const boxes = sumBoxRows(fb);
          if(boxes != null) b.duaBoxes += boxes;
          // Tên sản phẩm cụ thể (VD: "Dừa xiêm xanh nón lá") lấy từ đợt sản
          // xuất gần nhất khai báo cho đúng chủng loại đó — thường các đợt
          // cùng chủng loại đều chế biến ra cùng 1 sản phẩm.
          if(fb.san_pham) b.sanPhamByVariety[variety] = fb.san_pham;
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
        b.domesticType = bi.domestic_type || null;
        b.orderStatus = bi.order_status || null;
        b.note = bi.note || '';
        b.khachHang = bi.khach_hang || null;
        b.sanPhamDuKien = bi.san_pham || null;
        b.soLuongDuKien = bi.so_luong_du_kien || null;
        b.ngayGiaoMongMuon = bi.ngay_giao_mong_muon || null;
        b.batchInfoCreatedAt = bi.created_at || null;
        // Đơn đã chốt trước khi có nguyên liệu vẫn phải hiện trong bảng —
        // "có thông tin" giờ không chỉ là có nguồn thật (NCC/Vùng nguyên
        // liệu) mà còn tính cả khi đã đăng ký đơn hàng qua đây. Trước đây
        // chỉ tính là "có thông tin" nếu đã điền Khách hàng/Sản phẩm/Số
        // lượng/Ngày giao — nhưng "Thêm đơn hàng" chỉ BẮT BUỘC mỗi ô Tên
        // đơn/lô hàng, các ô còn lại đều tùy chọn, nên 1 đơn chỉ mới gõ tên
        // lô (chưa kịp điền gì khác) sẽ biến mất khỏi mọi nơi — không thấy
        // ở đây, không gợi ý được ở Vùng nguyên liệu/PO/QC. Có dòng
        // batch_info khớp đúng lô này là đủ bằng chứng "đã đăng ký", không
        // cần đợi điền thêm field nào khác mới hiện.
        b.hasOrderInfo = true;
      });

      // factory_finished_stock.exported_qty = số lượng ĐÃ xuất kho/load cont
      // thực tế cho lô đó (tổng luỹ kế, không phải thành phẩm hay hao hụt) —
      // đây mới là "Số lượng thực tế" đúng nghĩa cho phần Dừa. Từ khi Tồn kho
      // tách theo chủng loại, 1 lô có thể có NHIỀU dòng (1 dòng/chủng loại)
      // nên phải cộng dồn, không được ghi đè như trước.
      (stockRows || []).forEach(function(s){
        if(!s.batch) return;
        const b = ensure(s.batch);
        if(s.exported_qty != null){
          b.exportedQty = (b.exportedQty || 0) + Number(s.exported_qty);
          const variety = (s.chung_loai || '').trim() || 'Chưa phân loại';
          b.exportedByVariety[variety] = (b.exportedByVariety[variety] || 0) + Number(s.exported_qty);
        }
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

    const QUICK_RESULT_OPTIONS = ['Chờ xác nhận', 'Đạt', 'Không đạt 1 phần'];

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
      td.colSpan = 10;
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
        // loại") mới coi là 1 dòng "Dừa" chung như trước.
        const multi = b.duaVarieties.length > 1;
        b.duaVarieties.forEach(function(v){
          const named = v.name !== 'Chưa phân loại';
          // Sản phẩm hiện đúng tên thành phẩm khai báo ở Xưởng sản xuất (VD:
          // "Dừa xiêm xanh nón lá") nếu đã có, chưa có thì tạm dùng tên
          // chủng loại như trước. Số lượng thực tế LUÔN theo thùng — lô chỉ
          // 1 chủng loại lấy tổng đã xuất của cả lô, nhiều chủng loại thì
          // lấy đúng số đã xuất của riêng chủng loại đó.
          const exportedForVariety = multi ? b.exportedByVariety[v.name] : b.exportedQty;
          // Chưa xuất kho thì vẫn phải thấy được lô này đang có bao nhiêu
          // hàng — lùi dần về số nhập thô đã cân ở Vùng nguyên liệu, kèm nhãn
          // nói rõ đang là số nào (trước đây để trống, nhìn như thiếu dữ liệu
          // dù lô đã có nguyên liệu và đã kiểm QC).
          let qtyText = '—';
          let qtyNote = null;
          if(exportedForVariety != null){
            qtyText = fmtBoxQty(exportedForVariety);
            qtyNote = 'đã xuất kho';
          } else if(v.qty){
            qtyText = fmtQty(v.qty);
            qtyNote = 'nhập thô';
            // Tiến độ thu mua so với dự kiến — chỉ tính khi lô CHỈ 1 chủng
            // loại (dự kiến ghi cho cả lô, không tách theo từng dòng, nên lô
            // nhiều chủng loại không biết phần dự kiến này thuộc dòng nào) và
            // "Số lượng dự kiến" đúng dạng "<số> trái" (cùng đơn vị với số
            // nhập thô, so sánh khác đơn vị sẽ ra % vô nghĩa).
            if(!multi){
              const expectedTrai = parseLeadingTraiCount(b.soLuongDuKien);
              if(expectedTrai) qtyNote = 'nhập thô — ' + Math.round(v.qty / expectedTrai * 100) + '% so với dự kiến';
            }
          }
          lines.push({
            ncc: 'Xưởng Ba Phi',
            category: b.sanPhamByVariety[v.name] || (named ? v.name : 'Dừa'),
            qcCategory: 'Dừa',
            chungLoai: named ? v.name : null,
            qty: qtyText,
            qtyNote: qtyNote
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

    // Mốc ngày đại diện cho 1 đơn hàng, dùng để sắp xếp mới→cũ và lọc theo
    // tháng/năm — ưu tiên ngày nhập nguyên liệu gần nhất (hoạt động thật gần
    // đây nhất), lô chưa có nguyên liệu thì tạm dùng ngày đăng ký đơn.
    function orderRecencyDate(b){
      if(b.ngayNhap) return b.ngayNhap;
      if(b.batchInfoCreatedAt) return String(b.batchInfoCreatedAt).slice(0, 10);
      return null;
    }

    function matchesOrderSearch(b){
      const q = (orderSearchInput && orderSearchInput.value || '').trim().toLowerCase();
      if(!q) return true;
      return (b.batch || '').toLowerCase().indexOf(q) !== -1
        || (b.khachHang || '').toLowerCase().indexOf(q) !== -1;
    }

    function matchesOrderPeriod(b){
      if(!orderYearSelect || !orderYearSelect.value) return true;
      const d = orderRecencyDate(b);
      const p = d ? periodParts(d) : null;
      if(!p) return false;
      if(p.year !== Number(orderYearSelect.value)) return false;
      if(orderMonthSelect && orderMonthSelect.value && p.month !== Number(orderMonthSelect.value)) return false;
      return true;
    }

    function renderSummary(){
      // "Có thông tin" tính cả lô mới đăng ký qua Đơn hàng (chưa có nguyên
      // liệu thật) — sắp xếp mới nhất lên trước, lọc theo ô tìm kiếm + kỳ
      // tháng/năm nếu có chọn.
      const batches = Object.values(batchSummaries)
        .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
        .filter(matchesOrderSearch)
        .filter(matchesOrderPeriod)
        .sort(function(a, b){
          const da = orderRecencyDate(a) || '';
          const db = orderRecencyDate(b) || '';
          if(da === db) return a.batch.localeCompare(b.batch);
          return db.localeCompare(da);
        });
      summaryTbody.textContent = '';
      if(!batches.length){ showSummaryMessage('Không có đơn hàng nào khớp.'); return; }

      batches.forEach(function(b){
        const lines = buildLines(b);
        const rowspan = lines.length;

        lines.forEach(function(line, idx){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.batch = b.batch;

          if(idx === 0){
            // Khách hàng nằm ngay dưới tên lô thay vì 1 cột riêng: chỉ đơn
            // tạo qua "Thêm đơn hàng" mới có dữ liệu này, nên để cột riêng
            // thì hầu hết dòng chỉ hiện "—"; hơn nữa tên lô vốn đã chứa tên
            // khách viết tắt ("MINH NHÂN - 23.26").
            const batchTd = document.createElement('td');
            batchTd.rowSpan = rowspan;
            const batchName = document.createElement('div');
            batchName.textContent = b.batch;
            batchTd.appendChild(batchName);
            if(b.khachHang){
              const khLine = document.createElement('div');
              khLine.className = 'muted';
              khLine.style.cssText = 'font-size:11px;margin-top:2px;';
              khLine.textContent = b.khachHang;
              batchTd.appendChild(khLine);
            }
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
            // Chỉ có nghĩa với "Nội địa" — đa số đơn Nội địa thực ra bán cho
            // broker để họ tự xuất khẩu, chỉ số ít mới tiêu thụ thật trong
            // nước, nên tách riêng để phân biệt 2 trường hợp này.
            if(b.saleType === 'Nội địa'){
              const domesticTypeSelect = buildDomesticTypeSelect(b);
              domesticTypeSelect.className = 'table-inline-select';
              domesticTypeSelect.style.marginTop = '4px';
              saleTypeTd.appendChild(domesticTypeSelect);
            }
            tr.appendChild(saleTypeTd);
          }

          const qtyTd = document.createElement('td');
          qtyTd.className = 'muted';
          // Ở các dòng nối tiếp (idx>0), các ô rowspan (Trạng thái/Ghi chú/
          // Thao tác) không lặp lại nên qtyTd vô tình thành ô cuối cùng
          // trong <tr> đó — CSS "td:last-child{text-align:right}" (dành
          // riêng cho cột Thao tác) sẽ bắt nhầm qtyTd, làm số liệu lúc lệch
          // trái lúc lệch phải không đồng nhất giữa các dòng. Ép rõ
          // text-align:left để tránh.
          qtyTd.style.textAlign = 'left';
          if(line.qty !== '—'){
            const qtyValue = document.createElement('div');
            qtyValue.style.whiteSpace = 'nowrap';
            qtyValue.textContent = line.qty;
            qtyTd.appendChild(qtyValue);
            if(line.qtyNote){
              const qtyNote = document.createElement('div');
              qtyNote.style.cssText = 'font-size:10.5px;opacity:.75;margin-top:1px;';
              qtyNote.textContent = line.qtyNote;
              qtyTd.appendChild(qtyNote);
            }
          } else if(b.soLuongDuKien){
            const qtyValue = document.createElement('div');
            qtyValue.style.whiteSpace = 'nowrap';
            qtyValue.textContent = b.soLuongDuKien;
            qtyTd.appendChild(qtyValue);
            const qtyNote = document.createElement('div');
            qtyNote.style.cssText = 'font-size:10.5px;opacity:.75;margin-top:1px;';
            qtyNote.textContent = 'dự kiến';
            qtyTd.appendChild(qtyNote);
          } else {
            qtyTd.textContent = '—';
          }
          tr.appendChild(qtyTd);

          if(idx === 0){
            const ngayGiaoTd = document.createElement('td');
            ngayGiaoTd.rowSpan = rowspan;
            ngayGiaoTd.className = 'muted';
            ngayGiaoTd.textContent = fmtDate(b.ngayGiaoMongMuon);
            tr.appendChild(ngayGiaoTd);

            // Tiến độ = 2 mốc của cùng 1 lô (đã có nguyên liệu chưa → đã đóng
            // hàng chưa), trước đây tách 2 cột nên chiếm chỗ gấp đôi mà vẫn
            // phải đọc chéo mới hiểu lô đang ở đâu.
            const progressTd = document.createElement('td');
            progressTd.rowSpan = rowspan;
            const materialBadge = document.createElement('span');
            materialBadge.className = 'badge ' + (b.hasSourceInfo ? 'green' : 'amber');
            materialBadge.textContent = b.hasSourceInfo ? 'Đã có nguyên liệu' : 'Chưa có nguyên liệu';
            progressTd.appendChild(materialBadge);
            const orderStatusSelect = buildOrderStatusSelect(b);
            orderStatusSelect.className = 'table-inline-select';
            orderStatusSelect.style.marginTop = '4px';
            progressTd.appendChild(orderStatusSelect);
            tr.appendChild(progressTd);
          }

          // Đánh giá chất lượng sửa trực tiếp ngay trong bảng — select phản
          // ánh đúng kết quả kiểm "Thành phẩm" GẦN NHẤT của riêng dòng này
          // (category + chungLoai), chọn lại là lưu ngay (update nếu đã có
          // bản ghi khớp, insert mới nếu chưa) (ép text-align:left như qtyTd
          // để tránh CSS td:last-child bắt nhầm ở dòng nối tiếp).
          // Kết quả kiểm và % đạt luôn thuộc về cùng 1 lần kiểm nên gộp chung
          // 1 cột (% hiện ngay dưới ô chọn) — tách 2 cột chỉ làm bảng rộng
          // thêm mà vẫn phải đọc ghép 2 ô mới đủ nghĩa.
          const statusTd = document.createElement('td');
          statusTd.style.textAlign = 'left';
          const statusSelect = buildQuickResultSelect(b.batch, line.qcCategory, line.chungLoai);
          statusSelect.className = 'table-inline-select';
          statusTd.appendChild(statusSelect);
          const matchedCheck = finishedCheck(b.batch, line.qcCategory, line.chungLoai);
          const rate = matchedCheck ? checkPassRate(matchedCheck) : null;
          if(rate){
            const rateLine = document.createElement('div');
            rateLine.className = 'muted';
            rateLine.style.cssText = 'font-size:11px;margin-top:2px;padding-left:6px;';
            rateLine.textContent = 'Tỷ lệ đạt ' + rate.pct + '%';
            statusTd.appendChild(rateLine);
          }
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
            viewBtn.setAttribute('aria-label', 'Nhập/xem kết quả kiểm QC');
            viewBtn.innerHTML = '<i class="ti ti-clipboard-check"></i>';
            actionsTd.appendChild(viewBtn);
            const traceBtn = document.createElement('button');
            traceBtn.type = 'button';
            traceBtn.className = 'row-edit-btn trace-btn';
            traceBtn.setAttribute('aria-label', 'Xem hành trình đầy đủ');
            traceBtn.innerHTML = '<i class="ti ti-timeline"></i>';
            actionsTd.appendChild(traceBtn);
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
      select.addEventListener('change', async function(){
        const previous = b.saleType || '';
        const next = select.value;
        // Đổi Hình thức sau khi đã chốt trước đó (không phải lần gán đầu
        // tiên) có thể làm giai đoạn Logistics đang theo dõi không còn hợp
        // lệ (VD: đang "Trên biển" mà đổi sang Nội địa) — hỏi lại trước khi
        // lưu thay vì đổi ngay, hạn chế đổi tùy tiện giữa chừng.
        if(previous && previous !== next){
          const ok = await confirmDialog(
            'Đổi Hình thức từ "' + previous + '" sang "' + (next || '— Chưa phân loại —') + '" cho lô này? Nếu Logistics đang ở 1 giai đoạn không còn hợp lệ với Hình thức mới, giai đoạn đó sẽ cần chọn lại.',
            { title: 'Xác nhận đổi Hình thức', okLabel: 'Đổi', danger: false }
          );
          if(!ok){
            select.value = previous;
            applySelectColor(select, saleTypeColorName(previous));
            return;
          }
        }
        applySelectColor(select, saleTypeColorName(next));
        saveSaleType(b.batch, next);
      });
      return select;
    }

    async function saveDomesticType(batchCode, value){
      try{
        const { error } = await sb.from('batch_info').upsert({ batch: batchCode, domestic_type: value || null }, { onConflict: 'batch' });
        if(error) throw error;
        await loadAll();
      } catch(err){
        alert('Không thể lưu Loại đơn Nội địa: ' + err.message);
      }
    }

    function domesticTypeColorName(v){
      return { 'Bán cho broker (họ tự xuất khẩu)': 'blue', 'Tiêu thụ nội địa (Việt Nam)': 'gray' }[v] || 'amber';
    }
    // Chỉ hiện khi Hình thức = Nội địa (xem điểm gọi ở renderSummary) — phân
    // biệt bán cho broker (họ tự lo xuất khẩu) với tiêu thụ nội địa thật, 2
    // luồng khác hẳn nhau dù cùng gắn nhãn "Nội địa".
    function buildDomesticTypeSelect(b){
      const select = document.createElement('select');
      [['', '— Chưa phân loại —'], ['Bán cho broker (họ tự xuất khẩu)', 'Bán cho broker (họ tự xuất khẩu)'], ['Tiêu thụ nội địa (Việt Nam)', 'Tiêu thụ nội địa (Việt Nam)']].forEach(function(o){
        const opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if((b.domesticType || '') === o[0]) opt.selected = true;
        select.appendChild(opt);
      });
      applySelectColor(select, domesticTypeColorName(b.domesticType));
      select.addEventListener('change', function(){
        applySelectColor(select, domesticTypeColorName(select.value));
        saveDomesticType(b.batch, select.value);
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
          const { data: existing, error: findErr } = await sb.from('shipments').select('id').eq('batch_code', batchCode).is('deleted_at', null).limit(1);
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

    // Phần tổng quan lô (NCC/số lượng/sản xuất/xuất kho) đã có đầy đủ và cập
    // nhật hơn ở trang Truy xuất lô hàng — modal này giờ chỉ tập trung vào
    // việc nhập/sửa kết quả kiểm, tránh tính trùng 2 nơi.
    function renderInfoGrid(b){
      infoGrid.textContent = '';
      const linkWrap = document.createElement('div');
      linkWrap.style.gridColumn = '1 / -1';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'btn-secondary';
      link.style.cssText = 'font-size:12.5px;padding:7px 14px;display:inline-flex;align-items:center;gap:6px;';
      link.innerHTML = 'Xem đầy đủ hành trình lô hàng <i class="ti ti-arrow-right" aria-hidden="true"></i>';
      link.addEventListener('click', function(){
        closeBatchModal();
        goToBatchTrace(b.batch);
      });
      linkWrap.appendChild(link);
      infoGrid.appendChild(linkWrap);
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

    // Tỷ lệ đạt của 1 lần kiểm: ưu tiên số lượng kiểm/đạt nếu đã nhập (chính
    // xác theo đúng số lượng thực tế); chưa nhập thì tạm coi Kết quả là
    // nhị phân (Đạt = 100%, còn lại = 0%) để vẫn có số mà không bắt buộc
    // phải đo số lượng mỗi lần kiểm.
    function checkPassRate(d){
      if(d.so_luong_kiem != null && Number(d.so_luong_kiem) > 0){
        const dat = d.so_luong_dat != null ? Number(d.so_luong_dat) : 0;
        return { kiem: Number(d.so_luong_kiem), dat: dat, pct: Math.round(dat / Number(d.so_luong_kiem) * 100) };
      }
      if(!d.result || d.result === 'Chờ xác nhận') return null;
      const pass = d.result === 'Đạt';
      return { kiem: 1, dat: pass ? 1 : 0, pct: pass ? 100 : 0 };
    }

    function renderHistory(batchCode){
      const checks = allQcRows.filter(function(q){ return q.batch_code === batchCode; });
      historyTbody.textContent = '';
      if(!checks.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
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
        tr.dataset.soLuongKiem = d.so_luong_kiem != null ? d.so_luong_kiem : '';
        tr.dataset.soLuongDat = d.so_luong_dat != null ? d.so_luong_dat : '';

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

        const rateTd = document.createElement('td');
        rateTd.className = 'muted';
        if(d.so_luong_kiem != null && Number(d.so_luong_kiem) > 0){
          const rate = checkPassRate(d);
          rateTd.textContent = rate.dat.toLocaleString('vi-VN') + '/' + rate.kiem.toLocaleString('vi-VN') + ' · ' + rate.pct + '%';
        } else {
          rateTd.textContent = '—';
        }
        tr.appendChild(rateTd);

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
      const label = 'kết quả kiểm "' + (tr.dataset.type || '') + '"';
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from('qc_checks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if(error) throw error;
        if(editingQcId === id) resetForm();
        await loadAll();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from('qc_checks').update({ deleted_at: null }).eq('id', id);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await loadAll();
        });
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

    // Trạng thái tổng + tỷ lệ đạt của 1 lô cho bảng "Chọn lô để kiểm" — cùng
    // thứ tự ưu tiên (Không đạt > Chờ xác nhận > Đạt) với batchQcStatus ở
    // Tổng quan, viết riêng vì khác closure, không gọi chéo được.
    function pickBatchStatus(batchCode){
      const checks = allQcRows.filter(function(q){ return q.batch_code === batchCode; });
      if(!checks.length) return 'Chưa kiểm';
      if(checks.some(function(q){ return q.result === 'Không đạt 1 phần'; })) return 'Không đạt 1 phần';
      if(checks.some(function(q){ return !q.result || q.result === 'Chờ xác nhận'; })) return 'Chờ xác nhận';
      return 'Đạt';
    }
    function pickBatchPassRate(batchCode){
      let kiem = 0, dat = 0;
      allQcRows.filter(function(q){ return q.batch_code === batchCode; }).forEach(function(q){
        const rate = checkPassRate(q);
        if(!rate) return;
        kiem += rate.kiem; dat += rate.dat;
      });
      return kiem ? Math.round(dat / kiem * 100) : null;
    }

    function matchesPickSearch(b){
      const q = (pickSearchInput && pickSearchInput.value || '').trim().toLowerCase();
      return !q || b.batch.toLowerCase().indexOf(q) !== -1;
    }
    function matchesPickPeriod(b){
      if(!pickYearSelect || !pickYearSelect.value) return true;
      const d = orderRecencyDate(b);
      const p = d ? periodParts(d) : null;
      if(!p) return false;
      if(p.year !== Number(pickYearSelect.value)) return false;
      if(pickMonthSelect && pickMonthSelect.value && p.month !== Number(pickMonthSelect.value)) return false;
      return true;
    }
    function populatePickPeriodSelect(){
      if(!pickYearSelect) return;
      const years = Object.values(batchSummaries)
        .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
        .map(function(b){ const d = orderRecencyDate(b); const p = d ? periodParts(d) : null; return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(pickMonthSelect, pickYearSelect, years);
    }
    function findPickRow(batchCode){
      return Array.from(pickTbody.querySelectorAll('tr[data-batch]')).find(function(tr){ return tr.dataset.batch === batchCode; }) || null;
    }
    function renderPickList(){
      let batches = Object.values(batchSummaries)
        .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
        .filter(matchesPickSearch)
        .filter(matchesPickPeriod)
        .sort(function(a, b){
          const da = orderRecencyDate(a) || '';
          const db = orderRecencyDate(b) || '';
          if(da === db) return a.batch.localeCompare(b.batch);
          return db.localeCompare(da);
        });
      // Lô đang mở khối nhập bên dưới phải LUÔN có mặt trong bảng dù bộ lọc
      // tìm/tháng/năm đang loại nó ra — không thì khối nhập mất chỗ bám (VD:
      // mở từ icon QC ở tab Đơn hàng trong khi ở đây đang lọc kỳ khác).
      if(currentBatch && detailPanel.style.display !== 'none' && !batches.some(function(b){ return b.batch === currentBatch; })){
        const pinned = batchSummaries[currentBatch];
        if(pinned) batches = [pinned].concat(batches);
      }

      pickTbody.textContent = '';
      if(!batches.length){
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.cssText = 'text-align:center;color:var(--ink-soft);padding:20px;';
        td.textContent = 'Không có lô nào khớp.';
        tr.appendChild(td);
        pickTbody.appendChild(tr);
        return;
      }
      batches.forEach(function(b){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.batch = b.batch;

        const batchTd = document.createElement('td');
        batchTd.textContent = b.batch;
        tr.appendChild(batchTd);

        const catTd = document.createElement('td');
        catTd.className = 'muted';
        catTd.textContent = b.category || '—';
        tr.appendChild(catTd);

        const dateTd = document.createElement('td');
        dateTd.className = 'muted';
        dateTd.textContent = fmtDate(orderRecencyDate(b));
        tr.appendChild(dateTd);

        const status = pickBatchStatus(b.batch);
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge ' + resultBadgeClass(status);
        badge.textContent = status;
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);

        const rate = pickBatchPassRate(b.batch);
        const rateTd = document.createElement('td');
        rateTd.className = 'muted';
        rateTd.textContent = rate != null ? rate + '%' : '—';
        tr.appendChild(rateTd);

        pickTbody.appendChild(tr);
      });
      if(currentBatch && detailPanel.style.display !== 'none') insertDetailPanelAfterRow(currentBatch);
    }

    function insertDetailPanelAfterRow(batchCode){
      const oldExpando = pickTbody.querySelector('.qc-detail-row');
      if(oldExpando) oldExpando.remove();
      const row = findPickRow(batchCode);
      if(!row) return;
      const expandoTr = document.createElement('tr');
      expandoTr.className = 'qc-detail-row';
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.cssText = 'padding:16px;background:var(--surface-2);';
      td.appendChild(detailPanel);
      expandoTr.appendChild(td);
      row.after(expandoTr);
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
      detailPanel.style.display = '';
      // Gọi từ tab khác (VD: icon QC ở bảng Đơn hàng) thì chuyển qua tab
      // Đánh giá chất lượng trước, rồi mới gắn khối nhập vào đúng dòng.
      const tabQc = document.getElementById('tab-qc');
      if(tabQc && !tabQc.classList.contains('active')) goTab('qc');
      renderPickList();
    }

    function closeBatchModal(){
      detailPanel.style.display = 'none';
      const oldExpando = pickTbody.querySelector('.qc-detail-row');
      if(oldExpando) oldExpando.remove();
      currentBatch = null;
      resetForm();
    }

    summaryTbody.addEventListener('click', function(e){
      const traceBtn = e.target.closest('.trace-btn');
      if(traceBtn){
        const tr = traceBtn.closest('tr');
        if(tr && tr.dataset.batch) goToBatchTrace(tr.dataset.batch);
        return;
      }
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      const tr = btn.closest('tr');
      if(tr && tr.dataset.batch) openBatchModal(tr.dataset.batch);
    });

    pickTbody.addEventListener('click', function(e){
      const tr = e.target.closest('tr[data-batch]');
      if(!tr) return;
      const batchCode = tr.dataset.batch;
      if(currentBatch === batchCode && detailPanel.style.display !== 'none') closeBatchModal();
      else openBatchModal(batchCode);
    });

    closeBtn.addEventListener('click', closeBatchModal);
    cancelBtn.addEventListener('click', resetForm);
    if(pickSearchInput) pickSearchInput.addEventListener('input', renderPickList);
    if(pickMonthSelect) pickMonthSelect.addEventListener('change', renderPickList);
    if(pickYearSelect) pickYearSelect.addEventListener('change', renderPickList);

    // Lọc tháng/năm cho bảng Đơn hàng — dựa theo cùng mốc ngày dùng để sắp
    // xếp (orderRecencyDate), không phải periodDate (đó là mốc SỚM NHẤT,
    // dùng cho biểu đồ Tổng quan, khác mục đích).
    function populateOrderPeriodSelect(){
      if(!orderYearSelect) return;
      const years = Object.values(batchSummaries)
        .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
        .map(function(b){ const d = orderRecencyDate(b); const p = d ? periodParts(d) : null; return p ? p.year : null; })
        .filter(Boolean);
      populateMonthYearSelect(orderMonthSelect, orderYearSelect, years);
    }
    if(orderSearchInput) orderSearchInput.addEventListener('input', renderSummary);
    if(orderMonthSelect) orderMonthSelect.addEventListener('change', renderSummary);
    if(orderYearSelect) orderYearSelect.addEventListener('change', renderSummary);

    historyTbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){
        const tr = editBtnEl.closest('tr');
        editingQcId = tr.dataset.id;
        categorySelect.value = tr.dataset.category || 'Dừa';
        populateChungLoaiOptions(currentBatch, tr.dataset.chungLoai || '');
        updateChungLoaiVisibility();
        document.getElementById('qc-result').value = tr.dataset.result || 'Chờ xác nhận';
        document.getElementById('qc-so-luong-kiem').value = tr.dataset.soLuongKiem || '';
        document.getElementById('qc-so-luong-dat').value = tr.dataset.soLuongDat || '';
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
        // Tính theo trọng số số lượng (so_luong_dat / so_luong_kiem) khi đã
        // nhập — lần kiểm nào chưa nhập số lượng thì tạm tính như 1 đơn vị
        // đạt/không đạt theo Kết quả, để không phá thống kê của các lần kiểm
        // cũ (trước khi có 2 ô số lượng này).
        let totalKiem = 0, totalDat = 0;
        allQcRows.forEach(function(d){
          const rate = checkPassRate(d);
          if(!rate) return;
          totalKiem += rate.kiem;
          totalDat += rate.dat;
        });
        statPass.textContent = totalKiem ? Math.round(totalDat / totalKiem * 100) + '%' : '—';
      }
    }

    async function loadAll(){
      try{
        const [rawRes, poRes, qcRes, batchInfoRes, stockRes] = await Promise.all([
          sb.from('raw_batches').select('*, factory_batches(*, factory_batch_boxes(*))').is('deleted_at', null),
          sb.from('purchase_orders').select('*').is('deleted_at', null),
          sb.from('qc_checks').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          sb.from('batch_info').select('*'),
          sb.from('factory_finished_stock').select('*').is('deleted_at', null)
        ]);
        [rawRes, poRes, qcRes, stockRes].forEach(function(r){ if(r.error) throw r.error; });
        // batch_info có thể chưa tồn tại nếu chưa chạy migration — bỏ qua lỗi
        // đó thay vì làm hỏng cả bảng tổng hợp.
        const batchInfoRows = batchInfoRes.error ? [] : (batchInfoRes.data || []);

        allQcRows = qcRes.data || [];
        batchSummaries = buildSummaries(rawRes.data || [], poRes.data || [], allQcRows, batchInfoRows, stockRes.data || []);
        sharedBatchSummaries = batchSummaries;
        // Đổ lại gợi ý tên lô cho các ô nhập ở Vùng nguyên liệu/Nhà cung cấp
        // ngay khi danh sách lô đổi — nguồn sự thật vẫn là bảng tổng hợp này.
        fillDatalist('dl-batch-names', knownBatchNames());
        notifyBatchSummaryChanged();
        populateOrderPeriodSelect();
        renderSummary();
        populatePickPeriodSelect();
        renderPickList();
        updateStats();

        if(currentBatch && detailPanel.style.display !== 'none'){
          const b = batchSummaries[currentBatch];
          if(b){ renderInfoGrid(b); renderPoBreakdown(b); }
          renderHistory(currentBatch);
        }
      } catch(err){
        console.error('Không tải được dữ liệu Đánh giá chất lượng:', err);
        showSummaryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

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
        so_luong_kiem: parseQty(fieldVal('qc-so-luong-kiem')),
        so_luong_dat: parseQty(fieldVal('qc-so-luong-dat')),
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
        submitBtn.textContent = originalLabel;
      } finally {
        submitBtn.disabled = false;
      }
    });

    // ---- Thêm đơn hàng mới (chỉ Admin — xem applyRolePermissions) ----
    // Đơn chốt trước khi có nguyên liệu, ghi thẳng vào batch_info — cùng
    // nguồn dữ liệu với Hình thức/Trạng thái/Ghi chú ở bảng trên, để Vùng
    // nguyên liệu/Nhà cung cấp thấy ngay khi bắt đầu nhập đúng tên lô này.
    // Không có ô Ghi chú riêng ở đây — dùng chung đúng 1 ô Ghi chú inline
    // trong bảng (tránh 2 nơi cùng sửa 1 trường gây đè lẫn nhau).
    const exportOrdersBtn = document.getElementById('btn-export-orders');
    if(exportOrdersBtn){
      exportOrdersBtn.addEventListener('click', function(){
        exportTableToExcel(summaryTbody.closest('table'), 'danh-sach-don-hang-' + todayStr() + '.xlsx', 'Đơn hàng');
      });
    }

    const orderOverlay = document.getElementById('add-order-overlay');
    const orderOpenBtn = document.getElementById('btn-open-add-order');
    const orderCloseBtn = document.getElementById('btn-close-add-order');
    const orderCancelBtn = document.getElementById('btn-cancel-add-order');
    const orderForm = document.getElementById('form-add-order');
    const orderSubmitBtn = document.getElementById('btn-submit-add-order');

    if(orderOverlay && orderForm){
      const closeOrderModal = function(){
        orderOverlay.classList.remove('active');
        orderForm.reset();
        const group = document.getElementById('ord-loai-noi-dia-group');
        if(group) group.style.display = 'none';
      };
      if(orderOpenBtn){
        orderOpenBtn.addEventListener('click', function(){
          orderForm.reset();
          const group = document.getElementById('ord-loai-noi-dia-group');
          if(group) group.style.display = 'none';
          orderOverlay.classList.add('active');
        });
      }
      if(orderCloseBtn) orderCloseBtn.addEventListener('click', closeOrderModal);
      if(orderCancelBtn) orderCancelBtn.addEventListener('click', closeOrderModal);
      orderOverlay.addEventListener('click', function(e){ if(e.target === orderOverlay) closeOrderModal(); });

      // "Loại đơn Nội địa" chỉ có nghĩa khi Hình thức = Nội địa — đa số đơn
      // Nội địa thực ra là bán cho broker để họ tự xuất khẩu, chỉ số ít mới
      // tiêu thụ thật trong nước, nên tách riêng để phân biệt 2 trường hợp.
      const ordHinhThucSelect = document.getElementById('ord-hinh-thuc');
      const ordLoaiNoiDiaGroup = document.getElementById('ord-loai-noi-dia-group');
      if(ordHinhThucSelect && ordLoaiNoiDiaGroup){
        ordHinhThucSelect.addEventListener('change', function(){
          ordLoaiNoiDiaGroup.style.display = ordHinhThucSelect.value === 'Nội địa' ? '' : 'none';
        });
      }

      orderForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const batch = document.getElementById('ord-batch').value.trim();
        if(!batch){
          alert('Vui lòng nhập Tên đơn / lô hàng.');
          return;
        }
        const hinhThuc = document.getElementById('ord-hinh-thuc').value || null;
        const payload = {
          batch: batch,
          khach_hang: document.getElementById('ord-khach-hang').value.trim() || null,
          san_pham: document.getElementById('ord-san-pham').value.trim() || null,
          so_luong_du_kien: document.getElementById('ord-so-luong').value.trim() || null,
          sale_type: hinhThuc,
          domestic_type: hinhThuc === 'Nội địa' ? (document.getElementById('ord-loai-noi-dia').value || null) : null,
          ngay_giao_mong_muon: document.getElementById('ord-ngay-giao').value || null
        };
        const originalLabel = orderSubmitBtn.textContent;
        orderSubmitBtn.disabled = true;
        orderSubmitBtn.textContent = 'Đang lưu...';
        try{
          const { error } = await sb.from('batch_info').upsert(payload, { onConflict: 'batch' });
          if(error) throw error;
          await loadAll();
          closeOrderModal();
        } catch(err){
          alert('Không thể lưu đơn hàng: ' + err.message);
        } finally {
          orderSubmitBtn.disabled = false;
          orderSubmitBtn.textContent = originalLabel;
        }
      });
    }
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
    // Cùng 1 danh sách giai đoạn cho mọi lô, không phân biệt Hình thức
    // (Nội địa/Xuất khẩu) nữa — kể cả đơn "Nội địa" cũng có thể cần theo dõi
    // đủ các bước (VD: bán cho broker để họ tự xuất khẩu vẫn qua cảng, biển).
    const STAGE_OPTIONS = ['Kho nội địa', 'Cảng đi', 'Trên biển', 'Thông quan', 'Cảng đến', 'Giao khách hàng', 'Khách đã nhận hàng'];
    function updateStageOptions(preserveValue){
      const select = document.getElementById('ship-stage');
      if(!select) return;
      const warningEl = document.getElementById('ship-stage-warning');
      const list = STAGE_OPTIONS;
      const current = preserveValue !== undefined ? preserveValue : select.value;
      select.textContent = '';
      list.forEach(function(stage){
        const opt = document.createElement('option');
        opt.value = stage;
        opt.textContent = stage;
        select.appendChild(opt);
      });
      // Giá trị cũ không còn hợp lệ (VD: dữ liệu cũ lưu sai chính tả tên giai
      // đoạn) — báo rõ cho người dùng biết giai đoạn đã bị đổi, thay vì âm
      // thầm nhảy về bước đầu rồi lỡ tay Lưu đè mất giai đoạn thật.
      if(current && list.indexOf(current) === -1){
        select.value = list[0];
        if(warningEl){
          warningEl.textContent = 'Giai đoạn "' + current + '" không hợp lệ, đã tự chuyển về "' + list[0] + '" — kiểm tra lại trước khi lưu.';
          warningEl.style.display = 'block';
        }
      } else {
        select.value = current;
        if(warningEl){ warningEl.style.display = 'none'; warningEl.textContent = ''; }
      }
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

    // Tra vị trí container theo hãng tàu — không hãng tàu nào cho nhúng
    // trang tra cứu của họ vào đây (đã kiểm tra: MSC/CMA CGM chặn bot, mở
    // trực tiếp qua URL cũng bị họ redirect về trang chủ), nên chỉ mở đúng
    // trang tra cứu ở tab mới và tự copy sẵn số cont vào clipboard cho khỏi
    // phải gõ lại. Danh sách URL bên dưới là trang tra cứu gốc của từng
    // hãng — có thể đổi bất cứ lúc nào mà không báo trước.
    const SHIPPING_LINE_URLS = {
      'maersk': 'https://www.maersk.com/tracking/',
      'msc': 'https://www.msc.com/en/track-a-shipment',
      'cma-cgm': 'https://www.cma-cgm.com/ebusiness/tracking',
      'one': 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking',
      'evergreen': 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do',
      'cosco': 'https://elines.coscoshipping.com/ebusiness/cargoTracking',
      'hapag-lloyd': 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html',
      'wan-hai': 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml',
      'yang-ming': 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx',
      'zim': 'https://www.zim.com/tools/track-a-shipment',
      'hmm': 'https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do',
      'oocl': 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx',
      'kmtc': 'https://www.ekmtc.com/index.html#/cargo-tracking',
      // "Khác"/không chọn hãng tàu — trang đa hãng của SeaRates tự nhận diện
      // hãng tàu theo 4 ký tự đầu số cont.
      'khac': 'https://www.searates.com/container/tracking/'
    };
    // navigator.clipboard.writeText() yêu cầu document đang có focus tại
    // thời điểm ghi — nếu gọi window.open() ngay sau đó (không đợi promise
    // xong), tab mới cướp focus trước khi lệnh copy kịp chạy, khiến clipboard
    // âm thầm KHÔNG được ghi (lỗi NotAllowedError bị nuốt bởi catch rỗng) dù
    // giao diện vẫn báo "đã copy". Phải await xong rồi mới window.open, và
    // báo bằng alert (chặn luồng, chắc chắn người dùng thấy) thay vì chỉ đổi
    // chữ trên nút — nút nằm ở tab cũ đã mất focus nên dễ bị bỏ qua.
    async function openContainerTracking(containerNo, line){
      if(!containerNo){
        alert('Vui lòng nhập Số container trước.');
        return;
      }
      const url = SHIPPING_LINE_URLS[line] || SHIPPING_LINE_URLS['khac'];
      let copied = false;
      if(navigator.clipboard && navigator.clipboard.writeText){
        try{
          await navigator.clipboard.writeText(containerNo);
          copied = true;
        } catch(err){
          copied = false;
        }
      }
      alert(copied
        ? ('Đã copy số cont "' + containerNo + '" — dán (Ctrl+V) vào ô tìm kiếm ở trang vừa mở.')
        : ('Không tự copy được — tự chép số cont này: ' + containerNo));
      window.open(url, '_blank');
    }
    const lookupContainerBtn = document.getElementById('btn-lookup-container');
    if(lookupContainerBtn){
      lookupContainerBtn.addEventListener('click', function(){
        openContainerTracking(fieldVal('ship-container'), fieldVal('ship-line'));
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
        tr.dataset.containerNo = d.container_no || '';
        tr.dataset.shippingLine = d.shipping_line || '';
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
        if(d.container_no){
          const containerBtn = document.createElement('button');
          containerBtn.type = 'button';
          containerBtn.className = 'btn-secondary';
          containerBtn.style.cssText = 'display:inline-flex;align-items:center;margin-top:4px;margin-left:4px;padding:3px 10px;font-size:11px;line-height:1.6;white-space:nowrap;';
          containerBtn.textContent = 'Tra vị trí cont ↗';
          containerBtn.addEventListener('click', function(){ openContainerTracking(d.container_no, d.shipping_line); });
          tr.cells[4].appendChild(containerBtn);
        }
        tr.cells[5].textContent = fmtDate(d.etd);
        tr.cells[6].textContent = fmtDate(d.eta);
      },
      fillForm: function(form, tr){
        populateBatchSelect(tr.dataset.batch || '');
        syncProductField(tr.dataset.product);
        updateStageOptions(tr.dataset.stage || 'Kho nội địa');
        document.getElementById('ship-pi-po').value = tr.dataset.piPo || '';
        document.getElementById('ship-location').value = tr.dataset.location || '';
        document.getElementById('ship-container').value = tr.dataset.containerNo || '';
        document.getElementById('ship-line').value = tr.dataset.shippingLine || '';
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
          container_no: fieldVal('ship-container') || null,
          shipping_line: fieldVal('ship-line') || null,
          etd: fieldVal('ship-etd') || null,
          eta: fieldVal('ship-eta') || null,
          // Chuyển sang "Khách đã nhận hàng" mà không nhập ngày cụ thể thì tự
          // lấy ngày hôm nay, để Feedback KH luôn tính được hạn 3 ngày ngay.
          received_date: enteredReceivedDate || (stage === 'Khách đã nhận hàng' ? todayStr() : null),
          is_featured: document.getElementById('ship-featured').checked
        };
      },
      validate: function(payload){ return !!payload.batch_code; },
      validateMessage: 'Vui lòng chọn Lô hàng.',
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

    const exportShipmentsBtn = document.getElementById('btn-export-shipments');
    if(exportShipmentsBtn && shipmentTbody){
      exportShipmentsBtn.addEventListener('click', function(){
        exportTableToExcel(shipmentTbody.closest('table'), 'lo-van-chuyen-' + todayStr() + '.xlsx', 'Logistics');
      });
    }

    const shipOpenBtn = document.getElementById('btn-open-add-shipment');
    if(shipOpenBtn){
      shipOpenBtn.addEventListener('click', function(){
        populateBatchSelect(null);
        syncProductField();
        updateStageOptions();
      });
    }
    if(shipBatchSelect){
      shipBatchSelect.addEventListener('change', function(){
        syncProductField();
        updateStageOptions();
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
      updateStageOptions();
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

    // Sắp hết hạn = còn hạn nhưng trong vòng DOC_DUE_SOON_DAYS ngày tới —
    // cùng ngưỡng cảnh báo với FEEDBACK_DEADLINE_DAYS ở module Feedback KH,
    // dùng chung cho "Trung tâm cảnh báo trễ hạn" ở Tổng quan.
    const DOC_DUE_SOON_DAYS = 3;
    function docDeadlineStatus(deadline){
      if(!deadline) return { key: 'none', label: 'Chưa có hạn', color: 'gray' };
      const today = todayStr();
      if(deadline < today) return { key: 'overdue', label: 'Quá hạn', color: 'red' };
      if(deadline <= addDays(today, DOC_DUE_SOON_DAYS)) return { key: 'soon', label: 'Sắp hết hạn', color: 'amber' };
      return { key: 'ok', label: 'Còn hạn', color: 'green' };
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
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.style.color = 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = 'Không có lô nào thiếu chứng từ.';
        tr.appendChild(td);
        missingTbody.appendChild(tr);
        return;
      }
      // Ưu tiên hiện lô gấp nhất trước — quá hạn > sắp hết hạn > còn hạn >
      // chưa có hạn (cùng nhóm thì lô có hạn gần hơn lên trước).
      const urgencyOrder = { overdue: 0, soon: 1, ok: 2, none: 3 };
      const sorted = missing.slice().sort(function(a, b){
        const sa = docDeadlineStatus(a.deadline), sb = docDeadlineStatus(b.deadline);
        const diff = urgencyOrder[sa.key] - urgencyOrder[sb.key];
        if(diff !== 0) return diff;
        return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
      });
      sorted.forEach(function(d){
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
        const status = docDeadlineStatus(d.deadline);
        if(status.key === 'overdue' || status.key === 'soon') deadlineTd.className = 'warn-text';
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge ' + status.color;
        badge.textContent = status.label;
        statusTd.appendChild(badge);
        tr.appendChild(batchTd); tr.appendChild(missingTd); tr.appendChild(marketTd); tr.appendChild(deadlineTd); tr.appendChild(statusTd);
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
      document.getElementById('fb-assignee').value = card.dataset.assignee || '';
      document.getElementById('fb-deadline').value = card.dataset.deadline || '';
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
      const label = 'feedback lô "' + (card.dataset.batch || '') + '"';
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if(error) throw error;
        await refreshList();
        notifyFeedbacksChanged();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from(TABLE).update({ deleted_at: null }).eq('id', id);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshList();
          notifyFeedbacksChanged();
        });
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
      card.dataset.assignee = d.assignee || '';
      card.dataset.deadline = d.response_deadline || '';

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
      statusRow.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
      const badge = document.createElement('span');
      // 3 mức: Chưa xử lý (mới, cần nhận việc) → Đang xử lý → Đã xử lý (đóng).
      badge.className = 'badge ' + ({ 'Chưa xử lý': 'red', 'Đang xử lý': 'amber', 'Đã xử lý': 'green' }[d.status] || 'red');
      badge.textContent = d.status || 'Chưa xử lý';
      statusRow.appendChild(badge);
      if(d.assignee){
        const assigneeEl = document.createElement('span');
        assigneeEl.className = 'muted';
        assigneeEl.style.fontSize = '11.5px';
        assigneeEl.textContent = 'Phụ trách: ' + d.assignee;
        statusRow.appendChild(assigneeEl);
      }
      // Hạn xử lý chỉ còn ý nghĩa cảnh báo khi CHƯA đóng (Đã xử lý coi như
      // xong, không cần nhắc trễ hạn nữa dù deadline đã qua).
      if(d.response_deadline && d.status !== 'Đã xử lý'){
        const overdue = d.response_deadline < todayStr();
        const deadlineEl = document.createElement('span');
        deadlineEl.className = 'badge ' + (overdue ? 'red' : 'gray');
        deadlineEl.textContent = (overdue ? 'Quá hạn xử lý ' : 'Hạn xử lý ') + fmtDate(d.response_deadline);
        statusRow.appendChild(deadlineEl);
      }

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
        const { data, error } = await sb.from(TABLE).select('*').is('deleted_at', null).order('created_at', { ascending: false });
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
        status: form.querySelector('input[name="fb-status"]:checked').value,
        assignee: fieldVal('fb-assignee') || null,
        response_deadline: fieldVal('fb-deadline') || null
      };
      if(!payload.batch_code){
        alert('Vui lòng chọn Lô hàng.');
        return;
      }

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
    const FACTORY_COLS = 15;
    const factoryMonthSelect = document.getElementById('factory-month-select');
    const factoryYearSelect = document.getElementById('factory-year-select');

    if(!factoryOverlay || !factoryForm || !factoryTbody || !sb) return;

    // Danh sách năm lấy riêng từ ngay_nhap (không phụ thuộc rows đã lọc của
    // lần fetch trước) — cùng cột đang dùng để tính periodDate cho lô Dừa.
    async function loadFactoryYears(){
      if(!factoryYearSelect) return;
      try{
        const { data, error } = await sb.from('raw_batches').select('ngay_nhap').is('deleted_at', null);
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
    // Số lượng thùng của 1 đợt sản xuất = cộng dồn từng dòng Quy cách khai
    // báo sau khi đóng gói (factory_batch_boxes) — 1 đợt có thể đóng nhiều
    // quy cách khác nhau, không còn 1 giá trị/đợt như trước.
    function sumBoxRows(fb){
      if(!fb || !fb.factory_batch_boxes || !fb.factory_batch_boxes.length) return null;
      return fb.factory_batch_boxes.reduce(function(sum, r){ return sum + (Number(r.so_luong_thung) || 0); }, 0);
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

    // 1 dòng chi tiết = 1 tổ hợp (đợt sản xuất, quy cách). Lô chỉ có đúng 1
    // dòng thì hiện thẳng luôn; nhiều dòng thì gộp dưới 1 dòng tổng hợp
    // (accordion) — bấm vào để mở/đóng, giống bảng Lô nguyên liệu ở Vùng
    // nguyên liệu. batchCellContent/totalCellContent = null nghĩa là ô rỗng
    // (không dùng rowSpan nữa vì rowSpan sẽ vỡ khi ẩn/hiện dòng bên dưới).
    function buildFactoryRow(r, fb, box, subIdx, deliveryRowspan, batchCellContent, totalCellContent, hidden){
      const tr = document.createElement('tr');
      tr.className = 'hoverable';
      if(hidden){ tr.classList.add('batch-detail-row'); tr.style.display = 'none'; }
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
      tr.dataset.boxes = fb && fb.factory_batch_boxes ? JSON.stringify(fb.factory_batch_boxes) : '[]';

      const batchTd = document.createElement('td');
      if(batchCellContent != null) batchTd.textContent = batchCellContent;
      tr.appendChild(batchTd);

      if(subIdx === 0){
        const nccTd = document.createElement('td');
        nccTd.rowSpan = deliveryRowspan;
        nccTd.textContent = r.ncc || '—';
        tr.appendChild(nccTd);

        const chungLoaiTd = document.createElement('td');
        chungLoaiTd.rowSpan = deliveryRowspan;
        chungLoaiTd.className = 'muted';
        chungLoaiTd.textContent = r.chung_loai || '—';
        tr.appendChild(chungLoaiTd);

        const qtyTd = document.createElement('td');
        qtyTd.rowSpan = deliveryRowspan;
        qtyTd.className = 'muted';
        qtyTd.textContent = r.soluong ? r.soluong + ' trái' : '—';
        tr.appendChild(qtyTd);

        const dateTd = document.createElement('td');
        dateTd.rowSpan = deliveryRowspan;
        dateTd.className = 'muted';
        dateTd.textContent = r.ngay_nhap ? fmtDate(r.ngay_nhap) : '—';
        tr.appendChild(dateTd);

        const prodDateTd = document.createElement('td');
        prodDateTd.rowSpan = deliveryRowspan;
        prodDateTd.className = 'muted';
        prodDateTd.textContent = fb && fb.production_date ? fmtDate(fb.production_date) : '—';
        tr.appendChild(prodDateTd);

        const finishedTd = document.createElement('td');
        finishedTd.rowSpan = deliveryRowspan;
        finishedTd.className = 'muted';
        finishedTd.textContent = fb ? fmtQty(fb.finished_qty) : '—';
        tr.appendChild(finishedTd);
      }

      // Sản phẩm giờ theo TỪNG dòng Quy cách (không rowspan theo cả đợt
      // nữa) — dòng nào chưa có san_pham riêng (dữ liệu cũ trước khi tách)
      // thì tạm hiện tên đại diện của cả đợt (fb.san_pham).
      const sanPhamTd = document.createElement('td');
      sanPhamTd.className = 'muted';
      sanPhamTd.style.textAlign = 'left';
      sanPhamTd.textContent = (box && box.san_pham) || (fb && fb.san_pham) || '—';
      tr.appendChild(sanPhamTd);

      const quyCachTd = document.createElement('td');
      quyCachTd.className = 'muted';
      quyCachTd.style.textAlign = 'left';
      quyCachTd.textContent = box ? (box.quy_cach + ' trái/thùng') : '—';
      tr.appendChild(quyCachTd);

      const soLuongThungTd = document.createElement('td');
      soLuongThungTd.className = 'muted';
      soLuongThungTd.style.textAlign = 'left';
      soLuongThungTd.textContent = box ? fmtBoxQty(box.so_luong_thung) : '—';
      tr.appendChild(soLuongThungTd);

      if(subIdx === 0){
        const inputQty = parseQty(r.soluong);
        const outputQty = fb && fb.finished_qty != null ? Number(fb.finished_qty) : null;
        const lossTd = document.createElement('td');
        lossTd.rowSpan = deliveryRowspan;
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
        startTd.rowSpan = deliveryRowspan;
        startTd.className = 'muted';
        startTd.textContent = (fb && fb.start_time) || '—';
        tr.appendChild(startTd);

        const finishTd = document.createElement('td');
        finishTd.rowSpan = deliveryRowspan;
        finishTd.className = 'muted';
        finishTd.textContent = (fb && fb.expected_finish) || '—';
        tr.appendChild(finishTd);
      }

      const totalTd = document.createElement('td');
      if(totalCellContent != null) totalTd.textContent = totalCellContent;
      tr.appendChild(totalTd);

      if(subIdx === 0){
        const actionsTd = document.createElement('td');
        actionsTd.rowSpan = deliveryRowspan;
        actionsTd.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.setAttribute('aria-label', 'Chỉnh sửa');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        actionsTd.appendChild(editBtn);
        tr.appendChild(actionsTd);
      }

      return tr;
    }

    function createFactorySummaryRow(items, totalBoxes, rowCount){
      const tr = document.createElement('tr');
      tr.className = 'hoverable batch-summary-row';
      tr.dataset.batch = items[0].batch || '';

      const batchTd = document.createElement('td');
      const chevron = document.createElement('i');
      chevron.className = 'ti ti-chevron-right batch-chevron';
      batchTd.appendChild(chevron);
      batchTd.appendChild(document.createTextNode(' ' + (items[0].batch || '')));
      tr.appendChild(batchTd);

      const nccCount = new Set(items.map(function(r){ return r.ncc; }).filter(Boolean)).size;
      const nccTd = document.createElement('td');
      nccTd.textContent = nccCount + ' đầu mối';
      tr.appendChild(nccTd);

      const chungLoaiSet = Array.from(new Set(items.map(function(r){ return r.chung_loai; }).filter(Boolean)));
      const chungLoaiTd = document.createElement('td');
      chungLoaiTd.textContent = chungLoaiSet.join(', ') || '—';
      tr.appendChild(chungLoaiTd);

      const totalInput = items.reduce(function(sum, r){ return sum + (parseQty(r.soluong) || 0); }, 0);
      const qtyTd = document.createElement('td');
      qtyTd.textContent = totalInput.toLocaleString('vi-VN') + ' trái (' + items.length + ' lượt)';
      tr.appendChild(qtyTd);

      const dates = items.map(function(r){ return r.ngay_nhap; }).filter(Boolean).sort();
      const dateTd = document.createElement('td');
      dateTd.textContent = dates.length ? (dates[0] === dates[dates.length - 1] ? fmtDate(dates[0]) : fmtDate(dates[0]) + ' – ' + fmtDate(dates[dates.length - 1])) : '—';
      tr.appendChild(dateTd);

      const prodDates = items.map(function(r){ const fb = getFb(r); return fb && fb.production_date; }).filter(Boolean).sort();
      const prodDateTd = document.createElement('td');
      prodDateTd.textContent = prodDates.length ? (prodDates[0] === prodDates[prodDates.length - 1] ? fmtDate(prodDates[0]) : fmtDate(prodDates[0]) + ' – ' + fmtDate(prodDates[prodDates.length - 1])) : '—';
      tr.appendChild(prodDateTd);

      let totalFinished = null;
      items.forEach(function(r){
        const fb = getFb(r);
        if(fb && fb.finished_qty != null) totalFinished = (totalFinished || 0) + Number(fb.finished_qty);
      });
      const finishedTd = document.createElement('td');
      finishedTd.textContent = totalFinished != null ? fmtQty(totalFinished) : '—';
      tr.appendChild(finishedTd);

      const sanPhamSet = Array.from(new Set(items.map(function(r){ const fb = getFb(r); return fb && fb.san_pham; }).filter(Boolean)));
      const sanPhamTd = document.createElement('td');
      sanPhamTd.textContent = sanPhamSet.join(', ') || '—';
      tr.appendChild(sanPhamTd);

      const quyCachTd = document.createElement('td');
      quyCachTd.textContent = rowCount + ' quy cách';
      tr.appendChild(quyCachTd);

      const soLuongThungTd = document.createElement('td');
      soLuongThungTd.textContent = '—';
      tr.appendChild(soLuongThungTd);

      // Hao hụt trung bình tính theo TRỌNG SỐ sản lượng (tổng thành phẩm /
      // tổng đầu vào của cả lô) — không lấy trung bình cộng % của từng đợt,
      // tránh lô nhỏ kéo lệch số liệu như ở ô thống kê đầu trang.
      const lossTd = document.createElement('td');
      if(totalInput > 0 && totalFinished != null){
        const loss = (1 - totalFinished / totalInput) * 100;
        lossTd.textContent = loss.toFixed(0) + '%';
        if(loss > 15) lossTd.className = 'warn-text';
      } else {
        lossTd.textContent = '—';
      }
      tr.appendChild(lossTd);

      const startTd = document.createElement('td');
      startTd.textContent = '—';
      tr.appendChild(startTd);
      const finishTd = document.createElement('td');
      finishTd.textContent = '—';
      tr.appendChild(finishTd);

      const totalTd = document.createElement('td');
      totalTd.textContent = fmtBoxQty(totalBoxes);
      tr.appendChild(totalTd);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'row-actions muted';
      actionsTd.style.fontSize = '11.5px';
      actionsTd.textContent = rowCount + ' dòng';
      tr.appendChild(actionsTd);

      return tr;
    }

    function renderFactoryRows(rawRows){
      factoryTbody.textContent = '';
      if(!rawRows.length){ showFactoryMessage('Chưa có lô nguyên liệu nào.'); return; }

      // Gom theo lô hàng, giữ nguyên thứ tự xuất hiện đầu tiên (rows đã sắp
      // theo ngày nhập mới→cũ nên nhóm cũng tự động mới→cũ theo đây).
      const groups = [];
      const groupIndex = {};
      rawRows.forEach(function(r){
        const key = r.batch || '';
        if(!(key in groupIndex)){ groupIndex[key] = groups.length; groups.push([]); }
        groups[groupIndex[key]].push(r);
      });

      groups.forEach(function(items){
        // Mỗi đợt sản xuất tách thành N dòng theo đúng số Quy cách đã khai
        // báo (ít nhất 1 dòng, kể cả khi chưa có Quy cách nào — hiện "—")
        // để dễ kiểm soát từng quy cách riêng biệt thay vì gộp chung 1 ô.
        const itemBoxes = items.map(function(r){
          const fb = getFb(r);
          const boxes = fb && fb.factory_batch_boxes && fb.factory_batch_boxes.length ? fb.factory_batch_boxes : [null];
          return boxes;
        });
        const rowCount = itemBoxes.reduce(function(sum, boxes){ return sum + boxes.length; }, 0);

        // Tổng số lượng thùng = cộng dồn số thùng TỪNG đợt (mỗi đợt có thể
        // khác Quy cách) — đợt nào chưa điền Quy cách thì không tính được,
        // bỏ qua đợt đó thay vì làm sai cả tổng.
        let totalBoxes = null;
        items.forEach(function(r){
          const boxes = sumBoxRows(getFb(r));
          if(boxes != null) totalBoxes = (totalBoxes || 0) + boxes;
        });

        const collapse = rowCount > 1;
        if(collapse) factoryTbody.appendChild(createFactorySummaryRow(items, totalBoxes, rowCount));

        let firstRowDone = false;
        items.forEach(function(r, itemIdx){
          const fb = getFb(r);
          const boxes = itemBoxes[itemIdx];
          const deliveryRowspan = boxes.length;

          boxes.forEach(function(box, subIdx){
            const isVeryFirst = !firstRowDone;
            firstRowDone = true;
            const batchCellContent = (!collapse && isVeryFirst) ? r.batch : null;
            const totalCellContent = (!collapse && isVeryFirst) ? fmtBoxQty(totalBoxes) : null;
            factoryTbody.appendChild(buildFactoryRow(r, fb, box, subIdx, deliveryRowspan, batchCellContent, totalCellContent, collapse));
          });
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
        let q = sb.from('raw_batches').select('*, factory_batches(*, factory_batch_boxes(*))').is('deleted_at', null);
        if(factoryYearSelect && factoryYearSelect.value){
          const range = periodRange(Number(factoryYearSelect.value), factoryMonthSelect && factoryMonthSelect.value ? Number(factoryMonthSelect.value) : null);
          q = q.gte('ngay_nhap', range.start).lt('ngay_nhap', range.end);
        }
        // Chỉ sắp theo ngày nhập mới→cũ — KHÔNG sort theo tên lô trước nữa
        // (trước đây làm vậy khiến lô đặt tên theo alphabet đứng trước dù
        // mới hơn). renderFactoryRows gom nhóm theo thứ tự XUẤT HIỆN ĐẦU
        // TIÊN của mỗi lô nên nhóm cũng tự động xếp mới→cũ theo đây.
        const { data, error } = await q
          .order('ngay_nhap', { ascending: false });
        if(error) throw error;
        renderFactoryRows(data || []);
        updateFactoryStats(data || []);
        // Gợi ý tên sản phẩm ở ô "Sản phẩm" của từng dòng Quy cách — đây là
        // ô gõ tay tự do duy nhất còn lại cho tên sản phẩm trong cả app (Tồn
        // kho/QC đều chọn từ dữ liệu có sẵn), gõ khác nhau 1 chữ sẽ tách lẻ
        // thành phẩm cùng loại ra nhiều dòng ở bảng Tồn kho/tổng hợp.
        const sanPhamNames = {};
        (data || []).forEach(function(r){
          const fb = r.factory_batches && (Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches);
          if(!fb) return;
          if(fb.san_pham) sanPhamNames[fb.san_pham] = true;
          (fb.factory_batch_boxes || []).forEach(function(box){ if(box.san_pham) sanPhamNames[box.san_pham] = true; });
        });
        fillDatalist('dl-san-pham', Object.keys(sanPhamNames).sort(function(a, b){ return a.localeCompare(b, 'vi'); }));
      } catch(err){
        console.error('Không tải được dữ liệu Xưởng Ba Phi:', err);
        showFactoryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    // Danh sách Quy cách động trong modal — mỗi dòng là 1 tổ hợp (Quy cách,
    // Số lượng thùng), thêm/xóa tùy ý vì chỉ biết được sau khi đóng gói.
    const boxesListEl = document.getElementById('fac-boxes-list');
    const addBoxRowBtn = document.getElementById('btn-add-box-row');

    // Sản phẩm giờ khai báo riêng cho TỪNG dòng Quy cách (không còn 1 ô
    // Sản phẩm dùng chung cho cả đợt) — 1 đợt có thể vừa ra sản phẩm chính
    // vừa ra vài thùng sản phẩm khác (VD: mẫu cho khách khác) mà không bị
    // gắn nhầm tên sản phẩm cho toàn bộ số thùng.
    function createBoxRow(sanPham, quyCach, soLuongThung, hanSuDung){
      if(!boxesListEl) return;
      const row = document.createElement('div');
      row.className = 'box-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
      const sanPhamInput = document.createElement('input');
      sanPhamInput.type = 'text';
      sanPhamInput.placeholder = 'Sản phẩm';
      sanPhamInput.setAttribute('list', 'dl-san-pham');
      // Dòng mới thêm (không truyền sẵn giá trị) mặc định lấy theo dòng
      // ngay trước — đa số các dòng trong 1 đợt vẫn cùng 1 sản phẩm (và cùng
      // hạn sử dụng), tiện hơn phải gõ lại, nhưng vẫn sửa được nếu dòng đó
      // là sản phẩm khác.
      const isNewRow = sanPham == null;
      if(isNewRow){
        const existingRows = boxesListEl.querySelectorAll('.box-row');
        if(existingRows.length){
          const lastInputs = existingRows[existingRows.length - 1].querySelectorAll('input');
          sanPham = lastInputs[0].value;
          if(hanSuDung == null) hanSuDung = lastInputs[3].value;
        }
      }
      sanPhamInput.value = sanPham || '';
      sanPhamInput.style.flex = '1.3';
      const quyCachInput = document.createElement('input');
      quyCachInput.type = 'text';
      quyCachInput.placeholder = 'Quy cách (trái/thùng)';
      quyCachInput.value = quyCach != null ? quyCach : '';
      quyCachInput.style.flex = '1';
      const soLuongInput = document.createElement('input');
      soLuongInput.type = 'text';
      soLuongInput.placeholder = 'Số lượng thùng';
      soLuongInput.value = soLuongThung != null ? soLuongThung : '';
      soLuongInput.style.flex = '1';
      // Hạn sử dụng (ngày) tính từ Ngày sản xuất — dùng để xếp FEFO ở tab Tồn
      // kho. Không bắt buộc: để trống thì dòng đó chỉ không xếp được theo
      // hạn, không chặn lưu Quy cách.
      const hanSuDungInput = document.createElement('input');
      hanSuDungInput.type = 'text';
      hanSuDungInput.placeholder = 'Hạn dùng (ngày)';
      hanSuDungInput.value = hanSuDung != null ? hanSuDung : '';
      hanSuDungInput.style.flex = '0.8';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa dòng quy cách');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); });
      row.appendChild(sanPhamInput);
      row.appendChild(quyCachInput);
      row.appendChild(soLuongInput);
      row.appendChild(hanSuDungInput);
      row.appendChild(removeBtn);
      boxesListEl.appendChild(row);
    }

    function resetBoxRows(boxes){
      if(!boxesListEl) return;
      boxesListEl.textContent = '';
      if(boxes && boxes.length){
        boxes.forEach(function(b){ createBoxRow(b.san_pham, b.quy_cach, b.so_luong_thung, b.han_su_dung_ngay); });
      } else {
        createBoxRow('');
      }
    }

    function readBoxRows(){
      if(!boxesListEl) return [];
      return Array.from(boxesListEl.querySelectorAll('.box-row')).map(function(row){
        const inputs = row.querySelectorAll('input');
        return {
          sanPham: (inputs[0].value || '').trim(),
          quyCach: parseQty(inputs[1].value),
          soLuongThung: parseQty(inputs[2].value),
          hanSuDungNgay: parseQty(inputs[3].value)
        };
      }).filter(function(r){ return r.quyCach && r.soLuongThung; });
    }

    if(addBoxRowBtn) addBoxRowBtn.addEventListener('click', function(){ createBoxRow(); });

    function openModal(){ factoryOverlay.classList.add('active'); }
    function closeModal(){ factoryOverlay.classList.remove('active'); factoryForm.reset(); resetBoxRows(); editingRawBatchId = null; editingBatchLabel = ''; }

    function openEditModal(tr){
      editingRawBatchId = tr.dataset.rawId;
      editingBatchLabel = tr.dataset.batch || '';
      if(factoryModalBatchInfo){
        factoryModalBatchInfo.textContent = 'Lô hàng: ' + tr.dataset.batch + ' · NCC: ' + (tr.dataset.ncc || '—') +
          ' · Số lượng nhập: ' + (tr.dataset.soluong ? tr.dataset.soluong + ' trái' : '—');
      }
      document.getElementById('fac-production-date').value = tr.dataset.productionDate || '';
      document.getElementById('fac-finished-qty').value = tr.dataset.finishedQty || '';
      let boxes = [];
      try{ boxes = JSON.parse(tr.dataset.boxes || '[]'); } catch(e){ boxes = []; }
      resetBoxRows(boxes);
      document.getElementById('fac-start').value = tr.dataset.start || '';
      document.getElementById('fac-finish').value = tr.dataset.finish || '';
      factoryModalTitle.textContent = 'Cập nhật sản xuất';
      openModal();
    }

    if(closeFactoryBtn) closeFactoryBtn.addEventListener('click', closeModal);
    if(cancelFactoryBtn) cancelFactoryBtn.addEventListener('click', closeModal);
    factoryOverlay.addEventListener('click', function(e){ if(e.target === factoryOverlay) closeModal(); });
    factoryTbody.addEventListener('click', function(e){
      const summaryEl = e.target.closest('.batch-summary-row');
      if(summaryEl){
        const expanded = summaryEl.classList.toggle('expanded');
        let next = summaryEl.nextElementSibling;
        while(next && next.classList.contains('batch-detail-row')){
          next.style.display = expanded ? '' : 'none';
          next = next.nextElementSibling;
        }
        return;
      }
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      openEditModal(btn.closest('tr'));
    });

    factoryForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingRawBatchId){
        alert('Không xác định được đang cập nhật sản xuất cho lô nào — đóng cửa sổ này rồi bấm lại nút sửa ở đúng dòng lô hàng.');
        return;
      }
      const startVal = fieldVal('fac-start') || null;
      const finishVal = fieldVal('fac-finish') || null;
      const boxRows = readBoxRows();
      // factory_batches.san_pham không còn ô nhập riêng — vẫn giữ lại 1 giá
      // trị đại diện cho cả đợt (dòng Quy cách đầu tiên) để QC và các chỗ
      // hiển thị cũ (chưa tách theo dòng) vẫn có tên sản phẩm để đọc.
      const payload = {
        raw_batch_id: editingRawBatchId,
        production_date: fieldVal('fac-production-date') || null,
        finished_qty: parseQty(fieldVal('fac-finished-qty')),
        san_pham: (boxRows[0] && boxRows[0].sanPham) || null,
        start_time: startVal,
        expected_finish: finishVal,
        duration_hours: computeDurationHours(startVal, finishVal),
        batch_code: editingBatchLabel
      };

      const originalLabel = factorySubmitBtn.textContent;
      factorySubmitBtn.disabled = true;
      factorySubmitBtn.textContent = 'Đang lưu...';
      try{
        const { data: fbRows, error } = await sb.from('factory_batches').upsert(payload, { onConflict: 'raw_batch_id' }).select('id');
        if(error) throw error;
        const factoryBatchId = fbRows && fbRows[0] && fbRows[0].id;
        // Đồng bộ danh sách Quy cách bằng cách xóa hết bản ghi cũ rồi chèn
        // lại đúng danh sách hiện có trong form — đơn giản hơn diff từng dòng
        // đã đổi/thêm/xóa.
        if(factoryBatchId){
          const { error: delErr } = await sb.from('factory_batch_boxes').delete().eq('factory_batch_id', factoryBatchId);
          if(delErr) throw delErr;
          if(boxRows.length){
            const { error: insErr } = await sb.from('factory_batch_boxes').insert(boxRows.map(function(r){
              return { factory_batch_id: factoryBatchId, quy_cach: r.quyCach, so_luong_thung: r.soLuongThung, san_pham: r.sanPham || '', han_su_dung_ngay: r.hanSuDungNgay };
            }));
            if(insErr) throw insErr;
          }
        }
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

    const exportFactoryBtn = document.getElementById('btn-export-factory');
    if(exportFactoryBtn){
      exportFactoryBtn.addEventListener('click', function(){
        // Bỏ các dòng tổng hợp accordion (batch-summary-row) — dòng chi tiết
        // bên dưới đã có đủ dữ liệu từng đợt/quy cách, giữ cả 2 sẽ trùng lặp.
        exportTableToExcel(factoryTbody.closest('table'), 'san-xuat-hao-hut-' + todayStr() + '.xlsx', 'Sản xuất', { skipSelector: '.batch-summary-row' });
      });
    }

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
      validateMessage: 'Vui lòng nhập Họ tên nhân viên.',
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
    const statRemaining = document.getElementById('stat-stock-remaining');
    const statLots = document.getElementById('stat-stock-lots');
    const statUrgent = document.getElementById('stat-stock-urgent');
    const stockTbody = document.getElementById('stock-tbody');

    const closeInvBtn = document.getElementById('btn-close-add-inventory');
    const cancelInvBtn = document.getElementById('btn-cancel-add-inventory');
    const inventoryForm = document.getElementById('form-add-inventory');
    const inventoryTbody = document.getElementById('inventory-tbody');
    const inventoryOverlay = document.getElementById('add-inventory-overlay');
    const inventoryModalBatchInfo = document.getElementById('inventory-modal-batch-info');
    const inventorySubmitBtn = document.getElementById('btn-submit-add-inventory');
    const INVENTORY_COLS = 9;
    const STOCK_COLS = 7;
    const URGENT_DAYS = 5;
    const WARNING_DAYS = 15;
    const UNSPECIFIED_VARIETY = 'Chưa phân loại';

    if(!inventoryOverlay || !inventoryForm || !inventoryTbody || !sb) return;

    let editingBatch = null;
    let editingVariety = null;
    let editingQuyCach = null;
    let editingSanPham = null;

    function parseQty(s){
      if(s === undefined || s === null || String(s).trim() === '') return null;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? null : n;
    }
    function fmtQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' trái'; }
    function fmtBoxQty(n){ return n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' thùng'; }
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

    function showStockMessage(text, color){
      if(!stockTbody) return;
      stockTbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = STOCK_COLS;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      stockTbody.appendChild(tr);
    }

    // Tab "Tồn kho" theo FEFO — 1 dòng/tổ hợp (Sản phẩm, Quy cách) đang CÒN
    // TỒN (remainingTrai > 0), sắp theo Còn lại (ngày) tăng dần: sắp hết hạn
    // nhất lên đầu, kể cả đã quá hạn (số âm) — càng cần thấy ngay, không
    // phải thấy ít hơn. Dòng chưa biết Còn lại (thiếu Hạn dùng/Ngày sản
    // xuất) xếp cuối cùng, không trộn lẫn với dòng đã biết vì không so sánh
    // được "chưa rõ" với 1 con số cụ thể.
    function renderStockRows(groups){
      if(!stockTbody) return;
      const rows = [];
      groups.forEach(function(group){
        group.lines.forEach(function(line){
          line.quyCachEntries.forEach(function(entry){
            if(entry.remainingTrai == null || entry.remainingTrai <= 0) return;
            rows.push({ batch: group.batch, variety: line.variety, entry: entry });
          });
        });
      });
      rows.sort(function(a, b){
        const da = a.entry.remainingDays, db = b.entry.remainingDays;
        if(da == null && db == null) return a.batch.localeCompare(b.batch);
        if(da == null) return 1;
        if(db == null) return -1;
        return da - db;
      });

      stockTbody.textContent = '';
      if(!rows.length){ showStockMessage('Không còn hàng tồn kho.'); return; }

      rows.forEach(function(r){
        const entry = r.entry;
        const tr = document.createElement('tr');
        tr.className = 'hoverable';

        const batchTd = document.createElement('td');
        batchTd.textContent = r.batch;
        tr.appendChild(batchTd);

        const sanPhamTd = document.createElement('td');
        sanPhamTd.className = 'muted';
        sanPhamTd.textContent = entry.sanPham || '—';
        tr.appendChild(sanPhamTd);

        const quyCachTd = document.createElement('td');
        quyCachTd.className = 'muted';
        quyCachTd.textContent = entry.quyCach != null ? (entry.quyCach + ' trái/thùng') : '—';
        tr.appendChild(quyCachTd);

        const remainingTd = document.createElement('td');
        remainingTd.textContent = fmtQty(entry.remainingTrai);
        tr.appendChild(remainingTd);

        const prodDateTd = document.createElement('td');
        prodDateTd.className = 'muted';
        prodDateTd.textContent = entry.productionDate ? fmtDate(entry.productionDate) : '—';
        tr.appendChild(prodDateTd);

        const hanDungTd = document.createElement('td');
        hanDungTd.className = 'muted';
        hanDungTd.textContent = entry.hanSuDungNgay != null ? (entry.hanSuDungNgay + ' ngày') : '—';
        tr.appendChild(hanDungTd);

        const remainingDaysTd = document.createElement('td');
        if(entry.remainingDays == null){
          remainingDaysTd.textContent = '—';
          remainingDaysTd.className = 'muted';
          remainingDaysTd.title = 'Chưa rõ Ngày sản xuất hoặc Hạn sử dụng của dòng này — khai báo ở Xưởng sản xuất để xếp theo FEFO.';
        } else {
          const badge = document.createElement('span');
          badge.className = 'badge ' + (entry.remainingDays < 0 ? 'red' : (entry.remainingDays < URGENT_DAYS ? 'red' : (entry.remainingDays < WARNING_DAYS ? 'amber' : 'green')));
          badge.textContent = entry.remainingDays < 0 ? ('Quá hạn ' + Math.abs(entry.remainingDays) + ' ngày') : (entry.remainingDays + ' ngày');
          remainingDaysTd.appendChild(badge);
        }
        tr.appendChild(remainingDaysTd);

        stockTbody.appendChild(tr);
      });
    }

    function renderInventoryRows(groups){
      inventoryTbody.textContent = '';
      if(!groups.length){ showInventoryMessage('Chưa có lô nào có thành phẩm.'); return; }

      groups.forEach(function(group){
        // batchRowspan = tổng số dòng con của TẤT CẢ chủng loại trong lô
        // (mỗi chủng loại tách theo số Quy cách, ít nhất 1 dòng).
        const batchRowspan = group.lines.reduce(function(sum, line){ return sum + line.quyCachEntries.length; }, 0);

        let batchCellDone = false;
        // batchLevelDone gộp chung cho cả Ngày xuất hàng lẫn Tổng đã xuất —
        // 2 cột này luôn hiện cùng lúc ở dòng đầu tiên của cả lô.
        let batchLevelDone = false;

        group.lines.forEach(function(line){
          line.quyCachEntries.forEach(function(entry, subIdx){
            const tr = document.createElement('tr');
            tr.className = 'hoverable';
            tr.dataset.batch = group.batch;
            tr.dataset.variety = line.variety;
            tr.dataset.sanPham = entry.sanPham || '';
            tr.dataset.quyCach = entry.quyCach != null ? entry.quyCach : '';
            tr.dataset.produced = entry.producedThung != null ? entry.producedThung : '';
            tr.dataset.exportDate = entry.exportDate || '';
            tr.dataset.exportedQty = entry.exportedQty != null ? entry.exportedQty : '';
            tr.dataset.stockId = entry.stockId != null ? entry.stockId : '';

            if(!batchCellDone){
              const batchTd = document.createElement('td');
              batchTd.rowSpan = batchRowspan;
              batchTd.textContent = group.batch;
              tr.appendChild(batchTd);
              batchCellDone = true;
            }

            // Sản phẩm giờ theo TỪNG tổ hợp Sản phẩm+Quy cách (không rowspan
            // theo cả chủng loại nữa) — 1 chủng loại có thể vừa ra sản phẩm
            // chính vừa ra vài thùng sản phẩm khác.
            const sanPhamTd = document.createElement('td');
            sanPhamTd.className = 'muted';
            sanPhamTd.textContent = entry.sanPham || '—';
            tr.appendChild(sanPhamTd);

            const quyCachTd = document.createElement('td');
            quyCachTd.className = 'muted';
            quyCachTd.textContent = entry.quyCach != null ? (entry.quyCach + ' trái/thùng') : '—';
            tr.appendChild(quyCachTd);

            const soLuongThungTd = document.createElement('td');
            soLuongThungTd.className = 'muted';
            soLuongThungTd.textContent = entry.producedThung ? fmtBoxQty(entry.producedThung) : '—';
            tr.appendChild(soLuongThungTd);

            if(!batchLevelDone){
              const exportDateTd = document.createElement('td');
              exportDateTd.rowSpan = batchRowspan;
              exportDateTd.className = 'muted';
              exportDateTd.textContent = group.exportDate ? fmtDate(group.exportDate) : '—';
              tr.appendChild(exportDateTd);
            }

            // "Đã xuất" giờ theo đúng TỪNG quy cách (không rowspan theo sản
            // phẩm nữa) — 1 chủng loại đóng nhiều quy cách thì mỗi quy cách
            // biết chính xác đã xuất bao nhiêu, không gộp chung 1 số nữa.
            const exportedTd = document.createElement('td');
            exportedTd.className = 'muted';
            exportedTd.textContent = fmtBoxQty(entry.exportedQty);
            tr.appendChild(exportedTd);

            if(!batchLevelDone){
              const totalExportedTd = document.createElement('td');
              totalExportedTd.rowSpan = batchRowspan;
              totalExportedTd.textContent = fmtBoxQty(group.totalExportedQty);
              tr.appendChild(totalExportedTd);
              batchLevelDone = true;
            }

            // Biết đúng Quy cách của dòng này nên quy đổi thẳng ra trái luôn
            // được (quy_cach × (đã đóng gói − đã xuất)), không cần quy cách
            // bình quân gần đúng như trước nữa.
            const remainingTd = document.createElement('td');
            if(entry.remainingTrai == null){
              remainingTd.textContent = '—';
              remainingTd.className = 'muted';
              remainingTd.title = 'Chưa rõ Quy cách của dòng này ở Xưởng sản xuất nên chưa quy đổi được ra trái.';
            } else {
              remainingTd.textContent = fmtQty(entry.remainingTrai);
              if(entry.remainingTrai < 0){
                remainingTd.className = '';
                remainingTd.style.color = 'var(--red)';
                remainingTd.style.fontWeight = '600';
                remainingTd.title = 'Số đã xuất lớn hơn số đã đóng gói cho quy cách này — kiểm tra lại số liệu.';
              } else {
                remainingTd.className = entry.remainingTrai === 0 ? 'success' : 'warn-text';
              }
            }
            tr.appendChild(remainingTd);

            // Thao tác giờ theo từng dòng (từng quy cách), vì mỗi dòng là 1
            // bản ghi xuất hàng riêng biệt.
            const actionsTd = document.createElement('td');
            actionsTd.className = 'row-actions';
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'row-edit-btn';
            editBtn.setAttribute('aria-label', 'Chỉnh sửa');
            editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
            actionsTd.appendChild(editBtn);
            if(entry.stockId != null){
              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.className = 'row-delete-btn';
              deleteBtn.setAttribute('aria-label', 'Xóa');
              deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
              actionsTd.appendChild(deleteBtn);
            }
            tr.appendChild(actionsTd);

            inventoryTbody.appendChild(tr);
          });
        });
      });
    }

    function updateInventoryStats(groups){
      let totalRemaining = 0;
      let lotsWithStock = 0;
      let urgentCount = 0;
      groups.forEach(function(group){
        let batchRemaining = 0;
        group.lines.forEach(function(line){
          line.quyCachEntries.forEach(function(entry){
            // Dòng chưa quy đổi được (remainingTrai null) thì bỏ qua khỏi
            // tổng — không được coi như 0 hay cộng nhầm số đã đóng gói vào.
            if(entry.remainingTrai == null) return;
            batchRemaining += Math.max(entry.remainingTrai, 0);
            if(entry.remainingTrai > 0 && entry.remainingDays != null && entry.remainingDays < URGENT_DAYS) urgentCount++;
          });
        });
        totalRemaining += batchRemaining;
        if(batchRemaining > 0) lotsWithStock++;
      });
      if(statRemaining) statRemaining.textContent = groups.length ? totalRemaining.toLocaleString('vi-VN') + ' trái' : '—';
      if(statLots) statLots.textContent = String(lotsWithStock);
      if(statUrgent) statUrgent.textContent = String(urgentCount);
    }

    function varietyKey(batch, variety){ return batch + '::' + variety; }
    function quyCachKeyOf(quyCach){ return quyCach == null ? '' : String(quyCach); }

    async function refreshInventoryRows(){
      try{
        const [rawRes, stockRes] = await Promise.all([
          sb.from('raw_batches').select('batch, chung_loai, factory_batches(finished_qty, san_pham, production_date, factory_batch_boxes(quy_cach, so_luong_thung, san_pham, han_su_dung_ngay))').is('deleted_at', null),
          sb.from('factory_finished_stock').select('*').is('deleted_at', null)
        ]);
        if(rawRes.error) throw rawRes.error;
        if(stockRes.error) throw stockRes.error;

        // Gom theo (lô hàng, chủng loại), rồi tách tiếp theo TỪNG tổ hợp
        // (Sản phẩm, Quy cách) đã đóng gói (boxesByKey) — 1 chủng loại có
        // thể đóng nhiều quy cách VÀ nhiều sản phẩm khác nhau (VD: vài
        // thùng làm mẫu cho khách khác), mỗi tổ hợp theo dõi "Đã xuất"
        // riêng, không được gộp chung.
        const varietyMap = {};
        function ensureVariety(batch, variety){
          const key = varietyKey(batch, variety);
          if(!varietyMap[key]) varietyMap[key] = { batch: batch, variety: variety, boxesByKey: {}, productionDate: null };
          return varietyMap[key];
        }
        function boxKeyOf(sanPham, quyCach){ return (sanPham || '') + '::' + quyCachKeyOf(quyCach); }
        function ensureBox(v, sanPham, quyCach){
          const key = boxKeyOf(sanPham, quyCach);
          if(!v.boxesByKey[key]) v.boxesByKey[key] = { sanPham: sanPham || '', quyCach: quyCach, produced: 0, hanSuDungNgay: null };
          return v.boxesByKey[key];
        }
        (rawRes.data || []).forEach(function(r){
          const fb = getFb(r);
          if(!fb || fb.finished_qty == null) return;
          const variety = (r.chung_loai || '').trim() || UNSPECIFIED_VARIETY;
          const v = ensureVariety(r.batch, variety);
          v.productionDate = fb.production_date || null;
          (fb.factory_batch_boxes || []).forEach(function(box){
            // Dữ liệu cũ trước khi tách Sản phẩm theo dòng chưa có
            // box.san_pham riêng — tạm dùng tên đại diện của cả đợt.
            const sanPham = box.san_pham || fb.san_pham || '';
            const entry = ensureBox(v, sanPham, box.quy_cach);
            entry.produced += (Number(box.so_luong_thung) || 0);
            // 1 chủng loại có thể có nhiều đợt sản xuất/nhiều dòng box cùng
            // 1 tổ hợp (sản phẩm, quy cách) — giữ hạn dùng đã khai báo gần
            // nhất nếu có, không để dòng sau ghi đè thành trống.
            if(box.han_su_dung_ngay != null) entry.hanSuDungNgay = Number(box.han_su_dung_ngay);
          });
        });

        const stockByFullKey = {};
        (stockRes.data || []).forEach(function(s){
          if(!s.batch) return;
          const variety = s.chung_loai || UNSPECIFIED_VARIETY;
          const v = ensureVariety(s.batch, variety);
          const sanPham = s.san_pham || '';
          stockByFullKey[varietyKey(s.batch, variety) + '::' + boxKeyOf(sanPham, s.quy_cach)] = s;
          // Đã có bản ghi xuất cho tổ hợp này thì vẫn phải hiện ra dù
          // Xưởng sản xuất hiện không còn đợt nào khớp đúng nữa (không
          // được để mất dữ liệu xuất đã nhập).
          ensureBox(v, sanPham, s.quy_cach);
        });

        // Số ngày còn lại trước khi hết hạn = Hạn dùng − (Hôm nay − Ngày sản
        // xuất) — cả 2 vế đều thiếu thì không tính được (null), không suy
        // đoán bừa. Âm nghĩa là đã quá hạn (vẫn hiện, tô đỏ, KHÔNG ẩn đi —
        // hàng quá hạn còn tồn kho càng cần thấy ngay, không phải thấy ít
        // hơn).
        function daysBetween(fromStr, toStr){
          const a = new Date(fromStr + 'T00:00:00Z');
          const b = new Date(toStr + 'T00:00:00Z');
          return Math.round((b - a) / 86400000);
        }
        function computeRemainingDays(productionDate, hanSuDungNgay){
          if(!productionDate || hanSuDungNgay == null) return null;
          return hanSuDungNgay - daysBetween(productionDate, todayStr());
        }

        // Gom các dòng chủng loại theo lô để tính Tổng đã xuất (thùng) của
        // cả lô (rowspan cùng cột Lô hàng).
        const byBatch = {};
        Object.values(varietyMap).forEach(function(v){
          const keys = Object.keys(v.boxesByKey);
          const quyCachEntries = (keys.length ? keys : [boxKeyOf('', null)]).map(function(key){
            const box = v.boxesByKey[key] || { sanPham: '', quyCach: null, produced: 0, hanSuDungNgay: null };
            const stock = stockByFullKey[varietyKey(v.batch, v.variety) + '::' + key];
            const exportedQty = stock && stock.exported_qty != null ? Number(stock.exported_qty) : null;
            // Biết đúng Quy cách của dòng này nên quy đổi thẳng ra trái,
            // không cần quy cách bình quân gần đúng nữa. Dòng "chưa rõ Quy
            // cách" (quyCach null) thì vẫn để trống, không đoán.
            const remainingTrai = box.quyCach != null ? box.quyCach * (box.produced - (exportedQty || 0)) : null;
            return {
              sanPham: box.sanPham,
              quyCach: box.quyCach,
              producedThung: box.produced,
              exportedQty: exportedQty,
              exportDate: stock ? stock.export_date : null,
              stockId: stock ? stock.id : null,
              remainingTrai: remainingTrai,
              hanSuDungNgay: box.hanSuDungNgay,
              productionDate: v.productionDate,
              remainingDays: computeRemainingDays(v.productionDate, box.hanSuDungNgay)
            };
          });
          const line = {
            batch: v.batch,
            variety: v.variety,
            quyCachEntries: quyCachEntries
          };
          if(!byBatch[v.batch]) byBatch[v.batch] = [];
          byBatch[v.batch].push(line);
        });

        const groups = Object.keys(byBatch).sort(function(a, b){ return a.localeCompare(b); }).map(function(batch){
          const lines = byBatch[batch].sort(function(a, b){ return a.variety.localeCompare(b.variety, 'vi'); });
          const totalExportedQty = lines.reduce(function(sum, l){
            return sum + l.quyCachEntries.reduce(function(s2, e){ return s2 + (e.exportedQty || 0); }, 0);
          }, 0);
          // Ngày xuất hàng gộp chung theo cả lô (giống cột Lô hàng) — 1 container
          // chỉ xuất đi 1 ngày, không phải mỗi dòng 1 ngày riêng. Lấy ngày gần
          // nhất nếu các dòng lỡ có ngày khác nhau.
          const exportDate = lines.reduce(function(latest, l){
            return l.quyCachEntries.reduce(function(lat2, e){
              return e.exportDate && (!lat2 || e.exportDate > lat2) ? e.exportDate : lat2;
            }, latest);
          }, null);
          return { batch: batch, lines: lines, totalExportedQty: totalExportedQty, exportDate: exportDate };
        });

        renderInventoryRows(groups);
        renderStockRows(groups);
        updateInventoryStats(groups);
      } catch(err){
        console.error('Không tải được dữ liệu Tồn kho:', err);
        showInventoryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
        showStockMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    function openModal(){ inventoryOverlay.classList.add('active'); }
    function closeModal(){ inventoryOverlay.classList.remove('active'); inventoryForm.reset(); editingBatch = null; editingVariety = null; editingQuyCach = null; editingSanPham = null; }

    function openEditModal(tr){
      // Dòng "chưa rõ Quy cách" VÀ chưa từng có bản ghi xuất nào thì không
      // có gì để gắn bản ghi mới vào — phải khai báo Quy cách ở Xưởng sản
      // xuất trước, tránh tạo bản ghi xuất mơ hồ không biết thuộc quy cách
      // nào. Bản ghi cũ (trước khi có Quy cách theo dõi riêng) vẫn sửa/xóa
      // được bình thường để dọn dữ liệu.
      if(!tr.dataset.quyCach && !tr.dataset.stockId){
        alert('Chủng loại này chưa có Quy cách nào ở Xưởng sản xuất — cần khai báo Quy cách trước khi ghi nhận xuất hàng.');
        return;
      }
      editingBatch = tr.dataset.batch;
      editingVariety = tr.dataset.variety || UNSPECIFIED_VARIETY;
      editingQuyCach = tr.dataset.quyCach || null;
      editingSanPham = tr.dataset.sanPham || '';
      if(inventoryModalBatchInfo){
        const varietyLabel = editingVariety === UNSPECIFIED_VARIETY ? '' : (' · Chủng loại: ' + editingVariety);
        const sanPhamLabel = editingSanPham ? (' · Sản phẩm: ' + editingSanPham) : '';
        const quyCachLabel = editingQuyCach ? (' · Quy cách: ' + editingQuyCach + ' trái/thùng') : ' · Quy cách: chưa rõ (bản ghi cũ)';
        inventoryModalBatchInfo.textContent = 'Lô hàng: ' + tr.dataset.batch + varietyLabel + sanPhamLabel + quyCachLabel +
          ' · Đã đóng gói: ' + (tr.dataset.produced ? fmtBoxQty(Number(tr.dataset.produced)) : '—');
      }
      document.getElementById('inv-export-date').value = tr.dataset.exportDate || '';
      document.getElementById('inv-exported-qty').value = tr.dataset.exportedQty || '';
      openModal();
    }

    if(closeInvBtn) closeInvBtn.addEventListener('click', closeModal);
    if(cancelInvBtn) cancelInvBtn.addEventListener('click', closeModal);
    inventoryOverlay.addEventListener('click', function(e){ if(e.target === inventoryOverlay) closeModal(); });
    async function deleteStockRow(tr){
      const stockId = tr.dataset.stockId;
      if(!stockId) return;
      const varietyLabel = tr.dataset.variety && tr.dataset.variety !== UNSPECIFIED_VARIETY ? ' (' + tr.dataset.variety + ')' : '';
      const sanPhamLabel = tr.dataset.sanPham ? ' — ' + tr.dataset.sanPham : '';
      const quyCachLabel = tr.dataset.quyCach ? ' — quy cách ' + tr.dataset.quyCach + ' trái/thùng' : '';
      const label = 'bản ghi xuất hàng của lô "' + tr.dataset.batch + '"' + varietyLabel + sanPhamLabel + quyCachLabel;
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from('factory_finished_stock').update({ deleted_at: new Date().toISOString() }).eq('id', stockId);
        if(error) throw error;
        await refreshInventoryRows();
        notifyFactoryProductionChanged();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from('factory_finished_stock').update({ deleted_at: null }).eq('id', stockId);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshInventoryRows();
          notifyFactoryProductionChanged();
        });
      } catch(err){
        alert('Không thể xóa: ' + err.message);
      }
    }

    inventoryTbody.addEventListener('click', function(e){
      const editBtnEl = e.target.closest('.row-edit-btn');
      if(editBtnEl){ openEditModal(editBtnEl.closest('tr')); return; }
      const delBtnEl = e.target.closest('.row-delete-btn');
      if(delBtnEl){ deleteStockRow(delBtnEl.closest('tr')); return; }
    });

    inventoryForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingBatch) return;
      const payload = {
        batch: editingBatch,
        chung_loai: editingVariety || UNSPECIFIED_VARIETY,
        quy_cach: editingQuyCach != null ? Number(editingQuyCach) : null,
        san_pham: editingSanPham || '',
        export_date: fieldVal('inv-export-date') || null,
        exported_qty: parseQty(fieldVal('inv-exported-qty')),
        deleted_at: null
      };

      const originalLabel = inventorySubmitBtn.textContent;
      inventorySubmitBtn.disabled = true;
      inventorySubmitBtn.textContent = 'Đang lưu...';
      try{
        const { error } = await sb.from('factory_finished_stock').upsert(payload, { onConflict: 'batch,chung_loai,quy_cach,san_pham' });
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

    const exportStockBtn = document.getElementById('btn-export-stock');
    if(exportStockBtn && stockTbody){
      exportStockBtn.addEventListener('click', function(){
        exportTableToExcel(stockTbody.closest('table'), 'ton-kho-' + todayStr() + '.xlsx', 'Tồn kho');
      });
    }
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
    const INVENTORY_STALE_DAYS = 14;
    const DELIVERY_WARNING_DAYS = 7;
    const ETA_WARNING_DAYS = 5;

    if(!recentTbody || !sb) return;

    // Bấm vào từng thẻ số liệu để xem đầy đủ ở đúng module tính ra con số đó.
    [
      [kpiActive, 'qc'],
      [kpiContainers, 'logistics'],
      [kpiQcRate, 'qc'],
      [kpiSatisfaction, 'feedback']
    ].forEach(function(pair){
      const el = pair[0], tab = pair[1];
      const card = el && el.closest('.kpi-card');
      if(!card) return;
      card.classList.add('clickable');
      card.addEventListener('click', function(){ goTab(tab); });
    });

    function stageBadgeClass(stage){
      return { 'Trên biển': 'amber', 'Thông quan': 'blue', 'Cảng đến': 'blue', 'Giao khách hàng': 'blue', 'Khách đã nhận hàng': 'green' }[stage] || 'gray';
    }

    function setText(el, text){ if(el) el.textContent = text; }

    // "Cần xử lý ngay" — gom các cảnh báo đang nằm rải rác ở từng module
    // (Chứng từ/Feedback KH/Đánh giá chất lượng) thành 1 danh sách ưu tiên
    // ngay đầu Tổng quan, bấm vào 1 dòng sẽ nhảy thẳng tới module đó.
    function renderAlerts(missingDocsCount, docsOverdueCount, overdueFeedbackCount, unresolvedFeedbackOverdueCount, qcPendingCount, staleInventoryCount, pendingOrderCount, upcomingDeliveryCount, upcomingContainerEtaCount){
      if(!alertsList) return;
      alertsList.textContent = '';
      const items = [
        { count: upcomingDeliveryCount, icon: 'ti-calendar-exclamation', chip: 'nic-red', text: 'đơn sắp/đã tới hạn giao (trong ' + DELIVERY_WARNING_DAYS + ' ngày) mà chưa đóng hàng', sub: 'Đơn hàng', tab: 'donhang' },
        { count: upcomingContainerEtaCount, icon: 'ti-ship', chip: 'nic-blue', text: 'container sắp/đã tới ETA (trong ' + ETA_WARNING_DAYS + ' ngày) mà chưa ghi nhận khách nhận hàng', sub: 'Logistics', tab: 'logistics' },
        { count: docsOverdueCount, icon: 'ti-file-alert', chip: 'nic-red', text: 'lô đã QUÁ HẠN bổ sung chứng từ', sub: 'Chứng từ', tab: 'docs' },
        { count: unresolvedFeedbackOverdueCount, icon: 'ti-message-exclamation', chip: 'nic-red', text: 'khiếu nại khách hàng đã QUÁ HẠN xử lý', sub: 'Feedback KH', tab: 'feedback' },
        { count: pendingOrderCount, icon: 'ti-shopping-cart', chip: 'nic-amber', text: 'đơn đã chốt nhưng chưa có nguyên liệu', sub: 'Đơn hàng', tab: 'donhang' },
        { count: missingDocsCount, icon: 'ti-file-text', chip: 'nic-amber', text: 'lô đang thiếu chứng từ trước khi thông quan', sub: 'Chứng từ', tab: 'docs' },
        { count: overdueFeedbackCount, icon: 'ti-message-star', chip: 'nic-amber', text: 'lô đã quá hạn phản hồi khách hàng (quá ' + FEEDBACK_DEADLINE_DAYS + ' ngày)', sub: 'Feedback KH', tab: 'feedback' },
        { count: qcPendingCount, icon: 'ti-clipboard-check', chip: 'nic-blue', text: 'lượt kiểm QC đang chờ xác nhận kết quả', sub: 'Đánh giá chất lượng', tab: 'qc' },
        { count: staleInventoryCount, icon: 'ti-package', chip: 'nic-amber', text: 'lô tồn kho quá ' + INVENTORY_STALE_DAYS + ' ngày chưa xuất hết', sub: 'Xưởng Ba Phi', tab: 'factory' }
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
          sb.from('qc_checks').select('*').is('deleted_at', null),
          sb.from('shipments').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          sb.from('documents_checklist').select('*'),
          sb.from('feedbacks').select('*').is('deleted_at', null)
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
        const passedQc = decidedQc.filter(function(d){ return d.result === 'Đạt'; });
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
          .filter(function(b){ return b.hasSourceInfo && b.saleType !== 'Nội địa' && b.orderStatus === 'Đã đóng hàng'; })
          .filter(function(b){
            const d = docRows.find(function(r){ return r.batch_code === b.batch; });
            return !d || !d.contract_ok || !d.co_ok || !d.quarantine_ok || !d.bill_of_lading_ok;
          }).length;
        // Tách riêng phần đã QUÁ HẠN bổ sung (deadline đã đặt và đã qua) khỏi
        // missingDocsCount chung — đây là tín hiệu gấp hơn hẳn "thiếu chứng
        // từ" nói chung (thiếu nhưng còn hạn/chưa đặt hạn thì chưa gấp bằng).
        const docsOverdueCount = Object.values(sharedBatchSummaries)
          .filter(function(b){ return b.hasSourceInfo && b.saleType !== 'Nội địa' && b.orderStatus === 'Đã đóng hàng'; })
          .filter(function(b){
            const d = docRows.find(function(r){ return r.batch_code === b.batch; });
            if(!d || !d.deadline) return false;
            const missing = !d.contract_ok || !d.co_ok || !d.quarantine_ok || !d.bill_of_lading_ok;
            return missing && d.deadline < todayStr();
          }).length;
        const unresolvedFeedbackOverdueCount = fbRows.filter(function(d){
          return d.response_deadline && d.status !== 'Đã xử lý' && d.response_deadline < todayStr();
        }).length;
        const qcPendingCount = qcRows.filter(function(d){ return d.result === 'Chờ xác nhận'; }).length;
        const overdueFeedbackCount = shipRows.filter(function(d){
          if(d.stage !== 'Khách đã nhận hàng' || !d.received_date) return false;
          const hasFeedback = fbRows.some(function(f){ return f.batch_code === d.batch_code; });
          if(hasFeedback) return false;
          const deadline = addDays(d.received_date, FEEDBACK_DEADLINE_DAYS);
          return !!deadline && todayStr() > deadline;
        }).length;
        // Đã có thành phẩm, còn tồn kho (thành phẩm > đã xuất) mà nhập nguyên
        // liệu đã quá lâu vẫn chưa xuất hết — dùng ngayNhap làm mốc vì đây là
        // ngày sớm nhất chắc chắn đã có trong sharedBatchSummaries.
        const staleInventoryCount = Object.values(sharedBatchSummaries)
          .filter(function(b){
            if(!b.hasFactory || !b.finishedQty) return false;
            const remaining = b.finishedQty - (b.exportedQty || 0);
            if(remaining <= 0) return false;
            if(!b.ngayNhap) return false;
            const deadline = addDays(b.ngayNhap, INVENTORY_STALE_DAYS);
            return !!deadline && todayStr() > deadline;
          }).length;
        const pendingOrderCount = Object.values(sharedBatchSummaries)
          .filter(function(b){ return b.hasOrderInfo && !b.hasSourceInfo; }).length;
        // "Sắp/đã tới hạn" = còn trong DELIVERY_WARNING_DAYS ngày nữa hoặc đã
        // trễ so với Ngày giao mong muốn — nhưng chỉ tính khi lô CHƯA đóng
        // hàng (order_status khác "Đã đóng hàng"), vì sau mốc đó việc giao
        // đúng hạn đã chuyển sang trách nhiệm của Logistics, không còn là
        // rủi ro "quên chuẩn bị hàng" nữa.
        const deliveryWarnBy = addDays(todayStr(), DELIVERY_WARNING_DAYS);
        const upcomingDeliveryCount = Object.values(sharedBatchSummaries)
          .filter(function(b){
            if(!b.ngayGiaoMongMuon || b.orderStatus === 'Đã đóng hàng') return false;
            return !!deliveryWarnBy && b.ngayGiaoMongMuon <= deliveryWarnBy;
          }).length;
        // Container sắp/đã tới ETA mà lô vẫn chưa chuyển sang "Khách đã nhận
        // hàng" — cần chuẩn bị chứng từ/thanh toán trước khi hàng cập cảng,
        // kể cả ETA đã qua (chưa cập nhật trạng thái càng cần thấy ngay, y
        // hệt cách tính "sắp/đã tới hạn giao" ở trên).
        const etaWarnBy = addDays(todayStr(), ETA_WARNING_DAYS);
        const upcomingContainerEtaCount = shipRows.filter(function(d){
          if(!d.eta || d.stage === 'Khách đã nhận hàng') return false;
          return !!etaWarnBy && d.eta <= etaWarnBy;
        }).length;
        renderAlerts(missingDocsCount, docsOverdueCount, overdueFeedbackCount, unresolvedFeedbackOverdueCount, qcPendingCount, staleInventoryCount, pendingOrderCount, upcomingDeliveryCount, upcomingContainerEtaCount);

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
          tr.addEventListener('click', function(){ goToBatchTrace(d.batch_code); });

          const batchTd = document.createElement('td');
          batchTd.textContent = d.batch_code;

          const stageTd = document.createElement('td');
          const badge = document.createElement('span');
          badge.className = 'badge ' + stageBadgeClass(d.stage);
          badge.textContent = d.stage || '—';
          stageTd.appendChild(badge);

          // Lô "Nội địa" không cần chứng từ xuất khẩu (giống điều kiện ẩn ở
          // module Chứng từ) — không được báo cảnh báo thiếu chứng từ cho lô
          // vốn dĩ không bao giờ có bản ghi chứng từ nào cả.
          const b = sharedBatchSummaries[d.batch_code];
          const isDomesticBatch = !!(b && b.saleType === 'Nội địa');
          const docTd = document.createElement('td');
          if(isDomesticBatch){
            docTd.textContent = '—';
            docTd.className = 'muted';
          } else {
            const doc = docRows.find(function(x){ return x.batch_code === d.batch_code; });
            const docOk = !!doc && doc.contract_ok && doc.co_ok && doc.quarantine_ok && doc.bill_of_lading_ok;
            const docIcon = document.createElement('i');
            docIcon.className = docOk ? 'ti ti-check icon-ok' : 'ti ti-alert-triangle icon-warn';
            docTd.appendChild(docIcon);
          }

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
    const volumeContainer = document.getElementById('chart-volume');
    const lossContainer = document.getElementById('chart-loss');
    const qcRateContainer = document.getElementById('chart-qc-rate');
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
      // Có hiện số trên đầu cột (showValues) thì cột cao nhất chỉ được chiếm
      // tối đa 82% chiều cao biểu đồ — chừa khoảng trống phía trên cho chữ
      // số, tránh dính sát/chồng lên viền trên của card khi giá trị đó đúng
      // bằng mức cao nhất (cột cao 100%).
      const usableH = opts.showValues ? chartH * 0.82 : chartH;
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
        const h = (item.value / maxVal) * usableH;
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

      // Sản lượng/hao hụt chỉ tính được cho Dừa (đi qua Xưởng Ba Phi) — Chanh/
      // Thanh long mua ngoài qua NCC không có totalQty/finishedQty theo cùng
      // 1 cách, giống hệt phạm vi của thẻ "Hao hụt gọt vỏ trung bình" đã có
      // sẵn ở tab Xưởng Ba Phi.
      if(volumeContainer){
        const volumeByMonth = new Array(12).fill(0);
        batches.forEach(function(b){
          if(!b.isDua || !b.totalQty) return;
          const p = periodParts(b.periodDate);
          if(!p || p.year !== year) return;
          volumeByMonth[p.month - 1] += b.totalQty;
        });
        const volumeItems = volumeByMonth.map(function(qty, i){
          return {
            label: MONTH_NAMES[i],
            value: qty,
            color: 'var(--blue)',
            muted: monthFilter ? (i + 1 !== monthFilter) : false,
            tooltip: 'Tháng ' + (i + 1) + '/' + year + ': ' + qty.toLocaleString('vi-VN') + ' trái'
          };
        });
        renderBarChart(volumeContainer, volumeItems, {
          height: 190,
          gap: 6,
          emptyText: 'Chưa có dữ liệu sản lượng trong năm ' + year + '.'
        });
      }

      // Hao hụt trung bình theo THÁNG tính theo trọng số sản lượng (tổng
      // thành phẩm / tổng nguyên liệu của cả tháng) — cùng cách tính với ô
      // "Hao hụt trung bình" ở bảng gộp theo lô (Xưởng Ba Phi), không lấy
      // trung bình cộng % từng lô để tránh lô nhỏ kéo lệch số liệu.
      if(lossContainer){
        const lossInputByMonth = new Array(12).fill(0);
        const lossOutputByMonth = new Array(12).fill(0);
        const lossHasDataByMonth = new Array(12).fill(false);
        batches.forEach(function(b){
          if(!b.isDua || !b.totalQty || b.finishedQty == null) return;
          const p = periodParts(b.periodDate);
          if(!p || p.year !== year) return;
          lossInputByMonth[p.month - 1] += b.totalQty;
          lossOutputByMonth[p.month - 1] += b.finishedQty;
          lossHasDataByMonth[p.month - 1] = true;
        });
        const lossItems = lossInputByMonth.map(function(input, i){
          const hasData = lossHasDataByMonth[i] && input > 0;
          const pct = hasData ? Math.round((1 - lossOutputByMonth[i] / input) * 100) : 0;
          return {
            label: MONTH_NAMES[i],
            value: hasData ? Math.max(pct, 0) : 0,
            color: pct > 15 ? 'var(--red)' : 'var(--amber)',
            muted: monthFilter ? (i + 1 !== monthFilter) : false,
            tooltip: hasData ? ('Tháng ' + (i + 1) + '/' + year + ': hao hụt ' + pct + '%') : ('Tháng ' + (i + 1) + '/' + year + ': chưa có dữ liệu')
          };
        });
        renderBarChart(lossContainer, lossItems, {
          height: 190,
          gap: 6,
          showValues: true,
          emptyText: 'Chưa có dữ liệu hao hụt trong năm ' + year + '.'
        });
      }

      // Tỷ lệ đạt QC theo tháng — gộp mọi ngành hàng (không riêng Dừa), tính
      // trên số lượt kiểm ĐÃ có kết quả (bỏ "Chờ xác nhận"), giống hệt cách
      // module Đánh giá chất lượng tự tính tỷ lệ đạt tổng.
      if(qcRateContainer){
        const qcDecidedByMonth = new Array(12).fill(0);
        const qcPassedByMonth = new Array(12).fill(0);
        qcCheckRows.forEach(function(q){
          if(!q.result || q.result === 'Chờ xác nhận') return;
          const p = periodParts(q.created_at);
          if(!p || p.year !== year) return;
          qcDecidedByMonth[p.month - 1] += 1;
          if(q.result === 'Đạt') qcPassedByMonth[p.month - 1] += 1;
        });
        const qcRateItems = qcDecidedByMonth.map(function(decided, i){
          const pct = decided > 0 ? Math.round(qcPassedByMonth[i] / decided * 100) : 0;
          return {
            label: MONTH_NAMES[i],
            value: pct,
            color: 'var(--forest)',
            muted: monthFilter ? (i + 1 !== monthFilter) : false,
            tooltip: decided > 0 ? ('Tháng ' + (i + 1) + '/' + year + ': đạt ' + pct + '% (' + qcPassedByMonth[i] + '/' + decided + ' lượt)') : ('Tháng ' + (i + 1) + '/' + year + ': chưa có lượt kiểm')
          };
        });
        renderBarChart(qcRateContainer, qcRateItems, {
          height: 190,
          gap: 6,
          showValues: true,
          emptyText: 'Chưa có lượt kiểm QC trong năm ' + year + '.'
        });
      }
    }

    // Tỷ lệ đạt QC theo tháng cần qc_checks (không có sẵn trong
    // sharedBatchSummaries) — tự tải riêng, cache lại để đổi tháng/năm không
    // phải tải lại; tải mới mỗi khi sharedBatchSummaries đổi (bao gồm cả sau
    // khi lưu kết quả QC mới, vì module Đánh giá chất lượng luôn gọi
    // notifyBatchSummaryChanged() sau khi tự tải lại qc_checks).
    let qcCheckRows = [];
    async function refreshQcChecksCache(){
      if(!qcRateContainer) { renderCharts(); return; }
      try{
        const { data, error } = await sb.from('qc_checks').select('batch_code,result,created_at').is('deleted_at', null);
        if(error) throw error;
        qcCheckRows = data || [];
      } catch(err){
        console.error('Không tải được dữ liệu QC cho biểu đồ:', err);
        qcCheckRows = [];
      }
      renderCharts();
    }

    populateSelectors();
    refreshQcChecksCache();

    monthSelect.addEventListener('change', renderCharts);
    yearSelect.addEventListener('change', function(){ renderCharts(); });
    onBatchSummaryChanged(function(){ populateSelectors(); refreshQcChecksCache(); });
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
      const label = 'tài khoản "' + (u.full_name || u.email) + '"';
      const ok = await confirmDialog('Xóa ' + label + '? Người này sẽ mất quyền truy cập dashboard ngay lập tức.');
      if(!ok) return;
      try{
        const { error } = await sb.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', u.id);
        if(error) throw error;
        await refreshUsers();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from('profiles').update({ deleted_at: null }).eq('id', u.id);
          if(restoreErr){ alert('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshUsers();
        });
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
      const ok = await confirmDialog('Gửi email đặt lại mật khẩu tới ' + u.email + '?', { title: 'Xác nhận', okLabel: 'Gửi', danger: false });
      if(!ok) return;
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
        const { data, error } = await sb.from('profiles').select('*').is('deleted_at', null).order('email');
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

  // ---- Thùng rác (dữ liệu đã xóa mềm từ mọi module) ----
  // Gom deleted_at khác null từ 9 bảng có nút xóa, cho khôi phục (gỡ
  // deleted_at) hoặc xóa vĩnh viễn thật sự (.delete()) — đây là nơi DUY NHẤT
  // trong app còn gọi .delete() cho dữ liệu người dùng tạo ra.
  (function(){
    const trashTbody = document.getElementById('trash-tbody');
    if(!trashTbody || !sb) return;

    const TRASH_TABLES = [
      { table: 'raw_batches', label: 'Lô nguyên liệu',
        describe: function(d){ return (d.batch || '—') + ' — ' + (d.ncc || '—') + (d.soluong ? ' (' + d.soluong + ' trái)' : ''); },
        notify: function(){ notifyRawBatchesChanged(); } },
      { table: 'suppliers', label: 'Nhà cung cấp',
        describe: function(d){ return d.name || '—'; } },
      { table: 'purchase_orders', label: 'Đơn đặt hàng',
        describe: function(d){ return (d.po_code || '—') + ' — ' + (d.supplier_name || d.batch_code || ''); },
        notify: function(){ notifyPurchaseOrdersChanged(); } },
      { table: 'shipments', label: 'Vận chuyển',
        describe: function(d){ return d.batch_code || '—'; } },
      { table: 'factory_staff', label: 'Nhân sự Xưởng Ba Phi',
        describe: function(d){ return d.full_name || '—'; } },
      { table: 'qc_checks', label: 'Kết quả QC',
        describe: function(d){ return (d.batch_code || '—') + ' — ' + (d.check_type || ''); } },
      { table: 'feedbacks', label: 'Feedback KH',
        describe: function(d){ return d.batch_code || '—'; },
        notify: function(){ notifyFeedbacksChanged(); } },
      { table: 'factory_finished_stock', label: 'Xuất kho thành phẩm',
        describe: function(d){ return (d.batch || '—') + (d.san_pham ? ' — ' + d.san_pham : ''); },
        notify: function(){ notifyFactoryProductionChanged(); } },
      { table: 'profiles', label: 'Tài khoản',
        describe: function(d){ return d.full_name || d.email || '—'; } }
    ];

    function formatDeletedAt(value){
      if(!value) return '—';
      const d = new Date(value);
      if(isNaN(d.getTime())) return '—';
      const pad = function(n){ return String(n).padStart(2, '0'); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function showMessage(text, color){
      trashTbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      trashTbody.appendChild(tr);
    }

    async function fetchTrash(){
      const results = await Promise.all(TRASH_TABLES.map(function(cfg){
        return sb.from(cfg.table).select('*').not('deleted_at', 'is', null)
          .then(function(res){ return { cfg: cfg, res: res }; });
      }));
      const items = [];
      results.forEach(function(r){
        if(r.res.error){
          console.error('Không tải được thùng rác (' + r.cfg.table + '):', r.res.error);
          return;
        }
        (r.res.data || []).forEach(function(d){ items.push({ cfg: r.cfg, data: d }); });
      });
      items.sort(function(a, b){ return new Date(b.data.deleted_at) - new Date(a.data.deleted_at); });
      return items;
    }

    function renderTrash(items){
      trashTbody.textContent = '';
      if(!items.length){ showMessage('Thùng rác trống.'); return; }
      items.forEach(function(item){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';

        const typeTd = document.createElement('td');
        typeTd.textContent = item.cfg.label;
        tr.appendChild(typeTd);

        const descTd = document.createElement('td');
        descTd.textContent = item.cfg.describe(item.data) || '—';
        tr.appendChild(descTd);

        const dateTd = document.createElement('td');
        dateTd.textContent = formatDeletedAt(item.data.deleted_at);
        tr.appendChild(dateTd);

        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'btn-secondary';
        restoreBtn.style.cssText = 'padding:5px 12px;font-size:12px;margin-right:6px;';
        restoreBtn.textContent = 'Khôi phục';
        restoreBtn.addEventListener('click', function(){ restoreItem(item); });
        actionsTd.appendChild(restoreBtn);

        const purgeBtn = document.createElement('button');
        purgeBtn.type = 'button';
        purgeBtn.className = 'btn-danger';
        purgeBtn.style.cssText = 'padding:5px 12px;font-size:12px;';
        purgeBtn.textContent = 'Xóa vĩnh viễn';
        purgeBtn.addEventListener('click', function(){ purgeItem(item); });
        actionsTd.appendChild(purgeBtn);

        tr.appendChild(actionsTd);
        trashTbody.appendChild(tr);
      });
    }

    async function refreshTrash(){
      try{
        const items = await fetchTrash();
        renderTrash(items);
      } catch(err){
        console.error('Không tải được thùng rác:', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    async function restoreItem(item){
      const label = item.cfg.label + ' "' + item.cfg.describe(item.data) + '"';
      const ok = await confirmDialog('Khôi phục ' + label + '?', { title: 'Khôi phục', okLabel: 'Khôi phục', danger: false });
      if(!ok) return;
      try{
        const { error } = await sb.from(item.cfg.table).update({ deleted_at: null }).eq('id', item.data.id);
        if(error) throw error;
        await refreshTrash();
        if(item.cfg.notify) item.cfg.notify();
      } catch(err){
        alert('Không thể khôi phục: ' + err.message);
      }
    }

    async function purgeItem(item){
      const label = item.cfg.label + ' "' + item.cfg.describe(item.data) + '"';
      const ok = await confirmDialog('Xóa VĨNH VIỄN ' + label + '? Hành động này không thể hoàn tác, dữ liệu sẽ mất hẳn.', { title: 'Xóa vĩnh viễn', okLabel: 'Xóa vĩnh viễn' });
      if(!ok) return;
      try{
        const { error } = await sb.from(item.cfg.table).delete().eq('id', item.data.id);
        if(error) throw error;
        await refreshTrash();
      } catch(err){
        alert('Không thể xóa vĩnh viễn: ' + err.message);
      }
    }

    showMessage('Đang tải dữ liệu...');
    refreshTrash();
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

  // ---- Truy xuất nguồn gốc lô hàng ----
  // Trang tổng hợp 1 lô hàng trên 1 màn, dựa vào sharedBatchSummaries (đã có
  // sẵn Nguyên liệu/Sản xuất/PO/hình thức, do module Đánh giá chất lượng xây
  // dựng) + truy vấn riêng theo batch_code cho QC/Logistics/Chứng từ/Feedback
  // (không đọc trực tiếp state riêng của các module đó vì chúng đóng kín
  // trong IIFE của mình, tách biệt module cho gọn).
  (function(){
    const bodyEl = document.getElementById('order-detail-body');
    if(!bodyEl || !sb) return;

    const STAGES_REF = ['Kho nội địa', 'Cảng đi', 'Trên biển', 'Thông quan', 'Cảng đến', 'Giao khách hàng', 'Khách đã nhận hàng'];

    function fmtDate(v){
      if(!v) return '—';
      const p = String(v).split('-');
      return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : v;
    }
    function fmtNum(n){ return (n || 0).toLocaleString('vi-VN'); }

    function showPlaceholder(text){
      bodyEl.textContent = '';
      const div = document.createElement('div');
      div.className = 'card';
      div.style.cssText = 'text-align:center;color:var(--ink-soft);padding:40px;';
      div.textContent = text;
      bodyEl.appendChild(div);
    }

    const STATE_COLOR = { done: 'var(--green)', active: 'var(--blue)', pending: 'var(--ink-soft)' };

    function stepNode(label, state){
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:110px;text-align:center;flex-shrink:0;';
      const circle = document.createElement('div');
      const bg = state === 'done' ? 'var(--green)' : (state === 'active' ? 'var(--blue)' : 'var(--surface-2)');
      const fg = state === 'pending' ? 'var(--ink-soft)' : '#fff';
      circle.style.cssText = 'width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + bg + ';color:' + fg + ';';
      const icon = document.createElement('i');
      icon.className = 'ti ' + (state === 'done' ? 'ti-check' : (state === 'active' ? 'ti-clock' : 'ti-circle'));
      icon.style.fontSize = '15px';
      circle.appendChild(icon);
      wrap.appendChild(circle);
      const p = document.createElement('p');
      p.textContent = label;
      p.style.cssText = 'font-size:12px;font-weight:600;margin:8px 0 0;color:' + (state === 'pending' ? 'var(--ink-soft)' : 'var(--ink)') + ';';
      wrap.appendChild(p);
      return wrap;
    }

    function connectorLine(active){
      const line = document.createElement('div');
      line.style.cssText = 'height:1px;flex:1;margin-top:15px;background:' + (active ? 'var(--green)' : 'var(--border)') + ';';
      return line;
    }

    function infoCard(iconName, title, rows){
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:16px 20px;';
      const h = document.createElement('p');
      h.style.cssText = 'font-size:13px;font-weight:700;margin:0 0 10px;display:flex;align-items:center;gap:6px;';
      const icon = document.createElement('i');
      icon.className = 'ti ' + iconName;
      icon.style.cssText = 'font-size:16px;color:var(--ink-soft);';
      h.appendChild(icon);
      h.appendChild(document.createTextNode(title));
      card.appendChild(h);
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;font-size:13px;';
      rows.forEach(function(r){
        const tr = document.createElement('tr');
        const tdL = document.createElement('td');
        tdL.style.cssText = 'color:var(--ink-soft);padding:3px 0;';
        tdL.textContent = r[0];
        const tdR = document.createElement('td');
        tdR.style.cssText = 'text-align:right;padding:3px 0;' + (r[2] ? ('color:' + r[2] + ';') : '');
        tdR.textContent = r[1];
        tr.appendChild(tdL); tr.appendChild(tdR);
        table.appendChild(tr);
      });
      card.appendChild(table);
      return card;
    }

    function renderBatch(batchCode, b, qcRows, shipRows, docRow, fbRows){
      bodyEl.textContent = '';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;';
      const h3 = document.createElement('div');
      h3.style.cssText = 'font-size:18px;font-weight:700;color:var(--ink);';
      h3.textContent = batchCode;
      header.appendChild(h3);
      const badges = document.createElement('div');
      badges.style.cssText = 'display:flex;gap:8px;';
      if(b && b.saleType){
        const badge1 = document.createElement('span');
        badge1.className = 'badge blue';
        badge1.textContent = b.saleType;
        badges.appendChild(badge1);
      }
      if(b && b.orderStatus){
        const badge2 = document.createElement('span');
        badge2.className = 'badge amber';
        badge2.textContent = b.orderStatus;
        badges.appendChild(badge2);
      }
      header.appendChild(badges);
      bodyEl.appendChild(header);

      const finishedQc = qcRows.filter(function(q){ return q.check_type === 'Thành phẩm'; });
      let qcState = 'pending';
      if(finishedQc.some(function(q){ return q.result === 'Đạt'; })) qcState = 'done';
      else if(finishedQc.length) qcState = 'active';

      let xuatKhoState = 'pending';
      if(b && b.exportedQty) xuatKhoState = 'done';
      else if(b && b.hasFactory) xuatKhoState = 'active';

      const sanXuatState = (b && b.hasFactory) ? 'done' : 'pending';
      const nguyenLieuState = (b && b.hasSourceInfo) ? 'done' : 'pending';

      const row1 = document.createElement('div');
      row1.style.cssText = 'display:flex;align-items:flex-start;overflow-x:auto;margin-bottom:20px;';
      const steps = [['Nguyên liệu', nguyenLieuState], ['Sản xuất', sanXuatState], ['QC', qcState], ['Xuất kho', xuatKhoState]];
      steps.forEach(function(s, i){
        row1.appendChild(stepNode(s[0], s[1]));
        if(i < steps.length - 1) row1.appendChild(connectorLine(s[1] === 'done'));
      });
      bodyEl.appendChild(row1);

      const latestShip = shipRows[0] || null;
      const stageList = STAGES_REF;
      let logisticsState = 'pending';
      let logisticsText = 'Chưa bắt đầu';
      if(latestShip){
        logisticsText = latestShip.stage || '—';
        const idx = stageList.indexOf(latestShip.stage);
        logisticsState = (idx === stageList.length - 1) ? 'done' : 'active';
      }

      // Chứng từ (C/O, Kiểm dịch...) chỉ áp dụng cho hàng Xuất khẩu — đơn Nội
      // địa không cần, ẩn hẳn khỏi khối song song thay vì hiện "0/4" gây hiểu
      // lầm là đang thiếu. Còn 1 mình Logistics thì không còn gì để "song
      // song" nữa nên cũng bỏ luôn khung viền + nhãn đó.
      const isDomestic = !!(b && b.saleType === 'Nội địa');
      const docCount = docRow ? [docRow.contract_ok, docRow.co_ok, docRow.quarantine_ok, docRow.bill_of_lading_ok].filter(Boolean).length : 0;
      const docsState = docCount === 4 ? 'done' : (docCount > 0 ? 'active' : 'pending');

      const logisticsCard = infoCard('ti-truck', 'Logistics', [
        ['Giai đoạn', logisticsText, STATE_COLOR[logisticsState]]
      ]);

      if(isDomestic){
        logisticsCard.style.marginBottom = '20px';
        bodyEl.appendChild(logisticsCard);
      } else {
        const parallelWrap = document.createElement('div');
        parallelWrap.style.cssText = 'border:1px dashed var(--border);border-radius:var(--radius);padding:16px;margin-bottom:20px;';
        const parallelLabel = document.createElement('p');
        parallelLabel.style.cssText = 'font-size:11.5px;color:var(--ink-soft);margin:0 0 12px;';
        parallelLabel.innerHTML = '<i class="ti ti-arrow-fork" style="margin-right:5px;" aria-hidden="true"></i>Chạy song song — không chờ nhau';
        parallelWrap.appendChild(parallelLabel);

        const parallelGrid = document.createElement('div');
        parallelGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;';
        parallelGrid.appendChild(logisticsCard);
        parallelGrid.appendChild(infoCard('ti-file', 'Chứng từ', [
          ['Đã hoàn tất', docCount + '/4', STATE_COLOR[docsState]]
        ]));
        parallelWrap.appendChild(parallelGrid);
        bodyEl.appendChild(parallelWrap);
      }

      const detailGrid = document.createElement('div');
      detailGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;';

      detailGrid.appendChild(infoCard('ti-leaf', 'Nguyên liệu', [
        ['Đầu mối', b && b.nccSet && b.nccSet.size ? Array.from(b.nccSet).join(', ') : '—'],
        ['Tổng nhập', b && b.totalQty ? (fmtNum(b.totalQty) + ' trái') : '—'],
        ['Ngày nhập gần nhất', b ? fmtDate(b.ngayNhap) : '—']
      ]));

      detailGrid.appendChild(infoCard('ti-building-factory-2', 'Sản xuất — Xưởng Ba Phi', [
        ['Thành phẩm', b && b.finishedQty ? (fmtNum(b.finishedQty) + ' trái') : '—'],
        ['Đã xuất kho', b && b.exportedQty ? (fmtNum(b.exportedQty) + ' trái') : '—']
      ]));

      const qcSummaryRows = finishedQc.length
        ? [['Kết quả gần nhất', finishedQc[0].result || '—', finishedQc[0].result === 'Đạt' ? 'var(--green)' : null], ['Số lần kiểm', String(qcRows.length)]]
        : [['Kết quả', 'Chưa có', 'var(--ink-soft)']];
      detailGrid.appendChild(infoCard('ti-clipboard-check', 'Đánh giá chất lượng', qcSummaryRows));

      const fbSummaryRows = fbRows.length
        ? [['Đánh giá gần nhất', fbRows[0].rating != null ? (fbRows[0].rating + '/5 sao') : '—'], ['Số phản hồi', String(fbRows.length)]]
        : [['Phản hồi', 'Chưa có', 'var(--ink-soft)']];
      detailGrid.appendChild(infoCard('ti-message-star', 'Feedback khách hàng', fbSummaryRows));

      bodyEl.appendChild(detailGrid);
    }

    async function loadBatch(batchCode){
      showPlaceholder('Đang tải dữ liệu...');
      const b = sharedBatchSummaries[batchCode] || null;
      let qcRows = [], shipRows = [], docRow = null, fbRows = [];
      try{
        const [qcRes, shipRes, docRes, fbRes] = await Promise.all([
          sb.from('qc_checks').select('*').eq('batch_code', batchCode).is('deleted_at', null),
          sb.from('shipments').select('*').eq('batch_code', batchCode).is('deleted_at', null).order('created_at', { ascending: false }),
          sb.from('documents_checklist').select('*').eq('batch_code', batchCode).maybeSingle(),
          sb.from('feedbacks').select('*').eq('batch_code', batchCode).is('deleted_at', null).order('created_at', { ascending: false })
        ]);
        qcRows = qcRes.data || [];
        shipRows = shipRes.data || [];
        docRow = docRes.data || null;
        fbRows = fbRes.data || [];
      } catch(err){
        console.error('Không tải được dữ liệu truy xuất:', err);
      }
      renderBatch(batchCode, b, qcRows, shipRows, docRow, fbRows);
    }

    // Danh sách đơn hàng (module Đánh giá chất lượng) và khối chi tiết này
    // cùng sống trong 1 tab "Đơn hàng" — chuyển qua lại bằng cách ẩn/hiện 2
    // khối, không cần gọi hàm chéo giữa 2 IIFE.
    const listSection = document.getElementById('order-list-section');
    const detailSection = document.getElementById('order-detail-section');
    const backBtn = document.getElementById('order-detail-back');
    if(backBtn){
      backBtn.addEventListener('click', function(){
        if(detailSection) detailSection.style.display = 'none';
        if(listSection) listSection.style.display = '';
      });
    }

    showPlaceholder('Chọn 1 lô hàng ở bảng danh sách để xem toàn bộ hành trình.');

    traceModuleOpen = function(batchCode){
      if(!batchCode) return;
      if(listSection) listSection.style.display = 'none';
      if(detailSection) detailSection.style.display = '';
      loadBatch(batchCode);
    };
  })();

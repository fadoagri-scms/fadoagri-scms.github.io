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
    thumua:    ["Thu mua & Bán chợ", "Thu mua dừa, sơ chế và bán ra thị trường nội địa — độc lập với chuỗi xuất khẩu"],
    baocao:    ["Báo cáo", "Xuất báo cáo tổng hợp theo kỳ và hồ sơ theo lô hàng ra PDF"],
    users:     ["Quản lý tài khoản", "Gán vai trò cho tài khoản đăng nhập"]
  };

  const ACTIVE_TAB_STORAGE_KEY = 'fadoagri_active_tab';

  // ---- Điều hướng tab/subtab qua URL (#tab hoặc #tab/subtab) ----
  // Trước đây chuyển tab/subtab chỉ đổi class .active trên DOM, KHÔNG ghi
  // gì vào lịch sử trình duyệt — nên nút chuột Back/Forward luôn thoát
  // thẳng ra khỏi app (cả phiên chỉ có đúng 1 mục trong lịch sử: lần tải
  // trang ban đầu). Giờ mỗi lần chuyển tab/subtab đều pushState 1 mốc mới;
  // Back/Forward chỉ đổi DOM qua popstate (KHÔNG tải lại trang, không mất
  // dữ liệu form/modal đang mở ở chỗ khác), đi lại đúng giữa các tab/subtab
  // đã xem — chỉ thật sự thoát app khi đã lùi hết các mốc đó.
  function currentSubtabOf(tab){
    const panel = document.getElementById('tab-' + tab);
    if(!panel) return null;
    const activeBtn = panel.querySelector('.subtab-item.active');
    return activeBtn ? activeBtn.dataset.subtab : null;
  }
  function hashFor(tab, subtab){
    return '#' + tab + (subtab ? '/' + subtab : '');
  }
  // Mốc lịch sử riêng cho khối "xem tiến độ lô hàng" trong tab Đơn hàng —
  // không phải subtab thật, chỉ mượn URL #donhang/order/<mã lô> để nút
  // Back của trình duyệt có 1 mốc để quay về (xem thêm ở parseHash và
  // popstate bên dưới).
  function hashForOrder(batchCode){
    return '#donhang/order/' + encodeURIComponent(batchCode);
  }
  function parseHash(){
    const raw = (location.hash || '').replace(/^#\/?/, '');
    if(!raw) return null;
    const parts = raw.split('/');
    if(parts[1] === 'order' && parts[2]){
      return { tab: parts[0] || null, subtab: null, order: decodeURIComponent(parts[2]) };
    }
    return { tab: parts[0] || null, subtab: parts[1] || null };
  }

  // Đổi DOM theo đúng tab/subtab — dùng chung cho click (goTab/goSubtab) lẫn
  // popstate (Back/Forward), khác nhau ở việc CÓ ghi thêm 1 mốc lịch sử mới
  // hay không (pushHistory). Chỉ cuộn lên đầu trang khi TAB thật sự đổi —
  // giữ đúng hành vi cũ: chuyển subtab trong cùng 1 tab không tự cuộn.
  function applyView(tab, subtab, pushHistory){
    if(!titles[tab]) return;
    const tabPanel = document.getElementById('tab-' + tab);
    const tabChanged = !tabPanel || !tabPanel.classList.contains('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === 'tab-' + tab));
    document.getElementById('page-title').textContent = titles[tab][0];
    document.getElementById('page-sub').textContent = titles[tab][1];
    if(tabChanged) window.scrollTo({top:0, behavior:'smooth'});
    try{ localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab); }catch(e){}

    let resolvedSubtab = null;
    if(tabPanel){
      const btns = tabPanel.querySelectorAll('.subtab-item');
      if(btns.length){
        const panels = tabPanel.querySelectorAll(':scope > .subtab-panel');
        const wanted = subtab && tabPanel.querySelector('.subtab-item[data-subtab="' + subtab + '"]') ? subtab : (currentSubtabOf(tab) || btns[0].dataset.subtab);
        resolvedSubtab = wanted;
        btns.forEach(function(b){ b.classList.toggle('active', b.dataset.subtab === wanted); });
        panels.forEach(function(p){ p.classList.toggle('active', p.id === 'subtab-' + wanted); });
      }
    }

    const url = hashFor(tab, resolvedSubtab);
    if(location.hash !== url){
      if(pushHistory) history.pushState({ tab: tab, subtab: resolvedSubtab }, '', url);
      // Không push (VD lúc tải trang lần đầu) vẫn đồng bộ URL cho khớp,
      // nhưng dùng replaceState để không đẻ thêm mốc lịch sử thừa.
      else history.replaceState({ tab: tab, subtab: resolvedSubtab }, '', url);
    }
  }

  function goTab(tab){
    applyView(tab, currentSubtabOf(tab), true);
  }
  function goSubtab(tab, subtab){
    applyView(tab, subtab, true);
  }

  // Cho phép các module khác (Tổng quan...) điều hướng thẳng tới 1 lô hàng
  // cụ thể trong tab Truy xuất lô hàng — module đó tự gán hàm thật vào
  // traceModuleOpen sau khi khởi tạo xong (tránh phụ thuộc thứ tự IIFE).
  let traceModuleOpen = null;
  // Hiện/ẩn khối chi tiết lô hàng thật sự (đổi DOM) — traceModuleOpen ở
  // dưới lo phần ghi mốc lịch sử, còn popstate (Back/Forward) gọi thẳng 2
  // hàm này để đồng bộ DOM theo đúng mốc đang đứng, không ghi thêm lịch sử.
  let orderDetailOpen = null;
  let orderDetailClose = null;
  function goToBatchTrace(batchCode){
    goTab('donhang');
    if(traceModuleOpen) traceModuleOpen(batchCode);
  }

  // Refresh trang xong vẫn ở đúng module đang xem trước đó — ưu tiên đọc từ
  // URL (VD người dùng bấm Back/Forward rồi tải lại trang, hoặc chia sẻ
  // link), không có thì rơi về mục đã lưu ở lần trước (localStorage). Chỉ
  // khôi phục sau khi quyền theo vai trò đã áp dụng (applyRolePermissions),
  // để không nhảy vào 1 module mà role hiện tại không có quyền xem.
  function restoreActiveTab(){
    const fromHash = parseHash();
    if(fromHash && fromHash.tab && titles[fromHash.tab]){
      const navBtn = document.querySelector('.nav-item[data-tab="' + fromHash.tab + '"]');
      if(navBtn && navBtn.style.display !== 'none'){
        applyView(fromHash.tab, fromHash.subtab, false);
        if(fromHash.order && orderDetailOpen){
          orderDetailOpen(fromHash.order);
          // applyView ở trên tự đồng bộ hash về '#donhang' (không biết gì về
          // /order/...) — ghi đè lại đúng hash+state có order, không thì mốc
          // lịch sử này mất dấu "đang xem chi tiết", Forward sau đó sẽ hiện
          // sai (về danh sách thay vì chi tiết).
          const orderUrl = hashForOrder(fromHash.order);
          if(location.hash !== orderUrl) history.replaceState({ tab: fromHash.tab, subtab: null, order: fromHash.order }, '', orderUrl);
        }
        return;
      }
    }
    let saved;
    try{ saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY); }catch(e){ saved = null; }
    if(!saved || !titles[saved]) return;
    const navBtn = document.querySelector('.nav-item[data-tab="' + saved + '"]');
    if(!navBtn || navBtn.style.display === 'none') return;
    applyView(saved, null, false);
  }

  window.addEventListener('popstate', function(e){
    const state = (e.state && e.state.tab) ? e.state : parseHash();
    if(!state || !state.tab || !titles[state.tab]) return;
    const navBtn = document.querySelector('.nav-item[data-tab="' + state.tab + '"]');
    if(!navBtn || navBtn.style.display === 'none') return;
    applyView(state.tab, state.subtab, false);
    if(state.order && orderDetailOpen){
      orderDetailOpen(state.order);
      // Cùng lý do như trong restoreActiveTab: applyView vừa ghi đè hash về
      // '#donhang', trả lại đúng hash+state có order cho mốc lịch sử này.
      const orderUrl = hashForOrder(state.order);
      if(location.hash !== orderUrl) history.replaceState({ tab: state.tab, subtab: null, order: state.order }, '', orderUrl);
    } else if(orderDetailClose){
      orderDetailClose();
    }
  });

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

  // ---- Toast báo lỗi (thay alert() cho các thông báo không cần chặn luồng) ----
  // alert() đứng hình cả trang, phải bấm OK mới làm tiếp được — khó chịu khi
  // gõ liên tục nhiều dòng. Toast chỉ hiện góc dưới phải, tự biến mất, không
  // chặn thao tác đang làm dở. Vẫn có nút đóng (X) cho ai muốn tắt ngay, và
  // để lâu hơn "Hoàn tác" (8s so với 6s) vì không có nút nào khác giữ sự chú
  // ý lại — người dùng cần đủ thời gian đọc hết lỗi.
  // KHÔNG dùng cho những chỗ đã có comment giải thích rõ vì sao alert() ở đó
  // là CỐ Ý (VD openContainerTracking — mở tab mới cướp focus ngay sau đó,
  // toast ở tab cũ dễ bị bỏ lỡ).
  function showErrorToast(message){
    const container = document.getElementById('toast-container');
    if(!container){ alert(message); return; }
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    const icon = document.createElement('i');
    icon.className = 'ti ti-alert-circle';
    toast.appendChild(icon);
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Đóng');
    closeBtn.innerHTML = '<i class="ti ti-x"></i>';
    closeBtn.addEventListener('click', function(){ toast.remove(); });
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 8000);
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
    const tabContentEl = bar.closest('.tab-content');
    const tabName = tabContentEl ? tabContentEl.id.replace(/^tab-/, '') : null;
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        btns.forEach(function(b){ b.classList.toggle('active', b === btn); });
        panels.forEach(function(p){ p.classList.toggle('active', p.id === 'subtab-' + btn.dataset.subtab); });
        // Ghi vào lịch sử trình duyệt để Back/Forward đi lại đúng subtab đã
        // xem — xem applyView/goSubtab ở đầu file. DOM đã tự đổi ở 2 dòng
        // trên rồi nên goSubtab chỉ cần lo phần URL/lịch sử, gọi lại
        // applyView 1 lần nữa cũng vô hại (idempotent).
        if(tabName) goSubtab(tabName, btn.dataset.subtab);
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
    xuat_khau: 'Xuất khẩu',
    ke_toan_xuong: 'Kế toán xưởng'
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
    'tab-feedback': 'feedback_kh',
    'tab-thumua': 'thu_mua_ban_cho'
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
  const navItemBaocao = document.getElementById('nav-item-baocao');
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
    // Báo cáo tổng hợp: chỉ Admin (đúng phạm vi đã chốt — dữ liệu toàn chuỗi).
    if(navItemBaocao) navItemBaocao.style.display = currentUser.role === 'admin' ? '' : 'none';
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

  // Tổng quan tính ra danh sách "Cần xử lý ngay" (renderAlerts) rồi phát lại
  // qua đây — chuông thông báo ở topbar + chấm cảnh báo ở sidebar dùng
  // chung đúng 1 danh sách này, không tự query/đếm lại lần nữa.
  const alertItemsListeners = [];
  function onAlertItemsChanged(cb){ alertItemsListeners.push(cb); }
  function notifyAlertItemsChanged(items){ alertItemsListeners.forEach(function(cb){ cb(items); }); }

  // Dùng chung cho khối "Cần xử lý ngay" ở Tổng quan.
  function countPendingRawMaterial(){
    return Object.values(sharedBatchSummaries).filter(function(b){ return b.hasOrderInfo && !b.hasSourceInfo; }).length;
  }
  function countPendingProduction(){
    return Object.values(sharedBatchSummaries).filter(function(b){ return b.isDua && b.hasSourceInfo && !b.hasFactory; }).length;
  }

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

  // Tồn kho công bố danh sách thùng còn tồn kèm hạn sử dụng (FEFO) — Tổng
  // quan dùng để lên Lịch deadline tổng hợp, không tính lại logic quy đổi
  // trái/thùng + trừ đã xuất (đã có sẵn và đúng ở Tồn kho).
  let sharedExpiringStock = [];
  const expiringStockListeners = [];
  function onExpiringStockChanged(cb){ expiringStockListeners.push(cb); }
  function notifyExpiringStockChanged(){ expiringStockListeners.forEach(function(cb){ cb(); }); }

  // Bảng "Hạn sử dụng" (tab Tồn kho) là nguồn hạn dùng theo sản phẩm dùng
  // chung toàn hệ thống — "Cập nhật sản xuất" tự tra theo map này thay vì
  // gõ tay hạn dùng ở từng lô. Key đã chuẩn hoá qua normalizeSanPham.
  let sharedShelfLifeMap = {};
  const shelfLifeListeners = [];
  function onShelfLifeChanged(cb){ shelfLifeListeners.push(cb); }
  function notifyShelfLifeChanged(){ shelfLifeListeners.forEach(function(cb){ cb(); }); }
  // Chuẩn hoá tên sản phẩm trước khi so khớp — 2 lần gõ cùng 1 tên (VD: lúc
  // khai báo hạn sử dụng vs lúc nhập sản xuất) có thể lệch nhau ở khoảng
  // trắng thừa hoặc cách gõ dấu tiếng Việt khác nhau (Unicode tổ hợp vs
  // dựng sẵn) dù nhìn y hệt trên màn hình — không chuẩn hoá thì tra không ra.
  function normalizeSanPham(sanPham){
    return (sanPham || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  }

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
      showErrorToast('Không tải được thư viện xuất Excel — kiểm tra kết nối mạng rồi thử lại.');
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
  // Trái bị dạt = Số lượng nhập (raw_batches.soluong) − Thành phẩm
  // (factory_batches.finished_qty) — tự tính, không nhập tay, dùng chung cho
  // cả cột "Trái bị dạt" ở Sản xuất lẫn "Xử lý hàng tồn & rớt" ở Tồn kho.
  function computeCulledQty(inputTrai, finishedTrai){
    if(inputTrai == null || finishedTrai == null) return null;
    return Number(inputTrai) - Number(finishedTrai);
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
    // Đơn tạo qua form mới ghi vào batch_info_products (nhiều dòng sản
    // phẩm) — đơn cũ trước khi có bảng này vẫn còn sanPhamDuKien/
    // soLuongDuKien 1 dòng gộp chung, giữ lại làm phương án dự phòng.
    if(b.products && b.products.length){
      parts.push(b.products.map(function(p){
        return p.soLuongDuKien ? (p.sanPham + ' (' + p.soLuongDuKien + ')') : p.sanPham;
      }).filter(Boolean).join(', '));
    } else {
      if(b.sanPhamDuKien) parts.push(b.sanPhamDuKien);
      if(b.soLuongDuKien) parts.push('dự kiến ' + b.soLuongDuKien);
    }
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshRows();
          if(opts.afterSave) opts.afterSave();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
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
          // Mỗi dòng dựng riêng trong try/catch của chính nó — trước đây 1
          // dòng lỗi khi dựng (throw) sẽ rớt xuống catch NGOÀI của cả
          // refreshRows(), xoá sạch bảng và thay bằng "Không tải được dữ
          // liệu — kiểm tra kết nối Supabase" dù mọi dòng khác vẫn tải tốt —
          // chẩn đoán sai (tưởng mất mạng) trong khi thật ra chỉ 1 dòng lỗi.
          // Cô lập lỗi theo từng dòng dùng chung cho MỌI module gọi
          // initCrudModule (Nhân sự, Logistics, NCC, Hạn sử dụng...).
          displayRows.forEach(function(d){
            try{
              tbody.appendChild(createRow(d));
            } catch(rowErr){
              console.error('Không dựng được 1 dòng dữ liệu (' + opts.table + '):', rowErr);
              const errTr = document.createElement('tr');
              const errTd = document.createElement('td');
              errTd.colSpan = opts.cellCount + 1;
              errTd.style.cssText = 'color:var(--red);background:var(--red-bg);font-size:12px;padding:8px 12px;';
              errTd.textContent = 'Lỗi khi hiện 1 dòng dữ liệu — xem console (F12) để biết chi tiết.';
              errTr.appendChild(errTd);
              tbody.appendChild(errTr);
            }
          });
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
        showErrorToast(opts.validateMessage || 'Thiếu thông tin bắt buộc — vui lòng kiểm tra lại các trường bắt buộc trong form.');
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
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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

    // Danh sách chủng loại cố định cho dropdown — "Khác" có ô ghi chú cụ
    // thể riêng (chung_loai_ghi_chu) để không mất mô tả khi không khớp
    // đúng 1 trong các lựa chọn có sẵn.
    const CHUNG_LOAI_OPTIONS = ['Xiêm xanh', 'Xiêm đỏ', 'Mã lai bầu', 'Mã lai chu', 'Dừa khô', 'Dừa trọc', 'Dừa mứt', 'Dừa sáp'];
    const chungLoaiFormSelect = document.getElementById('f-chungloai');
    const chungLoaiKhacGroup = document.getElementById('f-chungloai-khac-group');
    const chungLoaiKhacInput = document.getElementById('f-chungloai-khac');
    function toggleChungLoaiKhac(){
      if(chungLoaiKhacGroup) chungLoaiKhacGroup.style.display = (chungLoaiFormSelect && chungLoaiFormSelect.value === 'Khác') ? '' : 'none';
    }
    if(chungLoaiFormSelect) chungLoaiFormSelect.addEventListener('change', toggleChungLoaiKhac);

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
      toggleChungLoaiKhac();
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
      toggleChungLoaiKhac();
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
      // Dữ liệu cũ trước khi có dropdown cố định có thể không khớp đúng 1
      // trong các lựa chọn có sẵn (gõ tay tự do trước đây) — rơi về "Khác"
      // kèm hiện nguyên văn cũ trong ô ghi chú cụ thể, không được âm thầm
      // đổi/mất giá trị cũ.
      const storedChungLoai = tr.dataset.chungLoai || '';
      if(!storedChungLoai){
        chungLoaiFormSelect.value = '';
        chungLoaiKhacInput.value = '';
      } else if(CHUNG_LOAI_OPTIONS.indexOf(storedChungLoai) !== -1){
        chungLoaiFormSelect.value = storedChungLoai;
        chungLoaiKhacInput.value = '';
      } else if(storedChungLoai === 'Khác'){
        chungLoaiFormSelect.value = 'Khác';
        chungLoaiKhacInput.value = tr.dataset.chungLoaiGhiChu || '';
      } else {
        chungLoaiFormSelect.value = 'Khác';
        chungLoaiKhacInput.value = storedChungLoai;
      }
      toggleChungLoaiKhac();
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshRows();
          notifyRawBatchesChanged();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
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
      tr.dataset.chungLoaiGhiChu = d.chung_loai_ghi_chu || '';
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
      chungLoaiTd.textContent = (d.chung_loai === 'Khác' && d.chung_loai_ghi_chu) ? ('Khác (' + d.chung_loai_ghi_chu + ')') : (d.chung_loai || '—');
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
      // Nhớ lại các lô đang mở rộng (accordion) TRƯỚC khi xoá bảng để vẽ lại
      // — không thì mỗi lần lưu/sửa 1 dòng (VD đổi Trạng thái) bảng lại thu
      // gọn hết về mặc định, phải bấm mở lại mới thấy kết quả vừa lưu.
      const expandedBatches = new Set(
        Array.from(tbody.querySelectorAll('.batch-summary-row.expanded')).map(function(el){ return el.dataset.batch; })
      );
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
      // Mỗi lô dựng riêng trong try/catch của chính nó — 1 lô lỗi khi dựng
      // (throw) trước đây làm forEach dừng luôn, các lô SAU nó lặng lẽ biến
      // mất khỏi bảng (đúng lỗi đã gặp ở thẻ mã QR truy xuất). Giờ lỗi 1 lô
      // không kéo mất các lô còn lại.
      groups.forEach(function(items){
        try{
          if(items.length === 1){
            tbody.appendChild(createDetailRow(items[0], true));
            return;
          }
          const summaryRow = createSummaryRow(items);
          const isExpanded = expandedBatches.has(items[0].batch || '');
          if(isExpanded) summaryRow.classList.add('expanded');
          tbody.appendChild(summaryRow);
          items.forEach(function(d){
            const tr = createDetailRow(d, false);
            tr.classList.add('batch-detail-row');
            tr.style.display = isExpanded ? '' : 'none';
            tbody.appendChild(tr);
          });
        } catch(groupErr){
          console.error('Không dựng được lô "' + (items[0] && items[0].batch) + '":', groupErr);
          const errTr = document.createElement('tr');
          const errTd = document.createElement('td');
          errTd.colSpan = 9;
          errTd.style.cssText = 'color:var(--red);background:var(--red-bg);font-size:12px;padding:8px 12px;';
          errTd.textContent = 'Lỗi khi hiện lô "' + ((items[0] && items[0].batch) || '') + '" — xem console (F12) để biết chi tiết.';
          errTr.appendChild(errTd);
          tbody.appendChild(errTr);
        }
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
      // Lô CHƯA CÓ ngày nhập (VD hàng đang trên đường về, chưa rõ ngày chính
      // xác) — luôn hiện, bất kể đang lọc tháng/năm nào, thay vì ẩn mất khỏi
      // danh sách mặc định (trước đây phải chủ động gõ tìm đúng tên mới thấy
      // lại, dễ tưởng nhầm là lưu không thành công).
      if(!p) return true;
      if(p.year !== Number(rawYearSelect.value)) return false;
      if(rawMonthSelect && rawMonthSelect.value && p.month !== Number(rawMonthSelect.value)) return false;
      return true;
    }
    function applyRawFilters(rows){
      // Có từ khóa tìm kiếm thì bỏ qua bộ lọc tháng/năm luôn — tìm đúng tên/mã
      // lô thì phải ra kết quả bất kể lô đó thuộc kỳ nào đang chọn. Lô thiếu
      // ngày nhập hàng (ngay_nhap null) đã tự luôn khớp mọi kỳ ở
      // matchesRawPeriod() rồi, không cần bỏ qua bộ lọc kỳ vì lý do đó nữa.
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
      const chungloaiKhac = document.getElementById('f-chungloai-khac').value.trim();
      const soluong = document.getElementById('f-soluong').value.trim();
      const ngay = document.getElementById('f-ngay').value;
      const ngayHen = document.getElementById('f-ngay-hen').value;
      const gioHen = document.getElementById('f-gio-hen').value;
      const trangthai = document.getElementById('f-trangthai').value;
      const ghichu = document.getElementById('f-ghichu').value.trim();

      if(!batch || !ncc){
        showErrorToast('Vui lòng nhập đủ Lô hàng và Đầu mối thu mua.');
        return;
      }

      const payload = {
        batch: batch,
        ncc: ncc,
        loai: loai,
        chung_loai: chungloai || null,
        chung_loai_ghi_chu: chungloai === 'Khác' ? (chungloaiKhac || null) : null,
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
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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
          showErrorToast('Không thể lưu hồ sơ đầu mối: ' + err.message);
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
    const sanPhamGroup = document.getElementById('qc-sanpham-group');
    const sanPhamSelect = document.getElementById('qc-sanpham');
    const sanPhamLockedNote = document.getElementById('qc-sanpham-locked');
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
    let allAssignments = [];   // qc_assignments: 1 dòng / (batch_code, san_pham) — "Ngày kiểm hàng" + tên QC nhập tay trong bảng
    let batchSummaries = {};
    let currentBatch = null;
    let currentSanPham = null; // sản phẩm của dòng đang mở khối nhập (bảng tách theo lô × sản phẩm)
    let editingQcId = null;
    // Khi mở khối nhập từ đúng 1 dòng ở bảng tổng hợp (nút "Kiểm chi tiết"),
    // form tự điền Ngành hàng + Sản phẩm rồi khóa lại (không cho đổi) để
    // tránh chọn nhầm. presetCategory !== null nghĩa là đang ở chế độ khóa
    // theo dòng; presetSanPham có thể null (dòng "chưa tách sản phẩm").
    let presetCategory = null;
    let presetSanPham = null;
    let sanPhamLocked = false;

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

    function buildSummaries(rawRows, poRows, qcRows, batchInfoRows, stockRows, productsRows){
      const map = {};
      function ensure(batchCode){
        if(!map[batchCode]){
          map[batchCode] = {
            batch: batchCode, nccSet: new Set(), categorySet: new Set(), category: null,
            isDua: false, totalQty: 0, totalQtyText: null,
            ngayNhap: null, hasFactory: false, finishedQty: null, exportedQty: null,
            hasSourceInfo: false, poEntries: [], saleType: null, orderStatus: null, note: '', periodDate: null,
            varietyMap: {}, duaVarieties: [], duaBoxes: 0, sanPhamByVariety: {}, exportedByVariety: {},
            khachHang: null, sanPhamDuKien: null, soLuongDuKien: null, products: [], ngayGiaoMongMuon: null, hasOrderInfo: false, batchInfoCreatedAt: null
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

      // Danh sách sản phẩm dự kiến theo dòng (batch_info_products) — thay
      // cho ô "Sản phẩm" gộp chung 1 dòng cũ, để đơn nhiều sản phẩm ghi rõ
      // từng sản phẩm + số lượng riêng thay vì gộp chung 1 chuỗi text.
      (productsRows || []).forEach(function(p){
        if(!p.batch) return;
        const b = ensure(p.batch);
        b.products.push({ sanPham: p.san_pham || '', soLuongDuKien: p.so_luong_du_kien || '' });
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

    // Danh sách sản phẩm thành phẩm PHÂN BIỆT của 1 lô (khai ở Xưởng Ba Phi,
    // gom trong b.sanPhamByVariety) — dùng để đổ options "Sản phẩm" trong
    // form QC và để quyết định có cần bắt chọn sản phẩm hay không.
    function batchProductList(b){
      if(!b || !b.sanPhamByVariety) return [];
      return Array.from(new Set(Object.values(b.sanPhamByVariety).filter(Boolean)));
    }

    // Mỗi dòng sản phẩm trong bảng tổng hợp (Dừa theo từng sản phẩm thành
    // phẩm, hoặc từng đơn NCC/ngành hàng khác) tra kết quả kiểm RIÊNG theo
    // đúng category (+ sanPham nếu là Dừa) của dòng đó — không gộp chung QC
    // của cả lô, vì mỗi sản phẩm trong lô có thể đạt/không đạt khác nhau.
    // sanPham bỏ qua (undefined) với các dòng không phải Dừa. Bản ghi cũ
    // chưa có san_pham (null) khớp với dòng chưa tách sản phẩm (sanPham null).
    function checksMatch(q, qcCategory, sanPham){
      if((q.category || 'Dừa') !== qcCategory) return false;
      if(sanPham !== undefined && (q.san_pham || null) !== (sanPham || null)) return false;
      return true;
    }

    // Kết quả kiểm "Thành phẩm" GẦN NHẤT khớp đúng category (+ sanPham nếu là
    // Dừa) của 1 dòng trong bảng tổng hợp — dùng để Đánh giá chất lượng sửa
    // trực tiếp được (select phản ánh đúng bản ghi sẽ bị update).
    function finishedCheck(batchCode, qcCategory, sanPham){
      return allQcRows.find(function(q){
        if(q.batch_code !== batchCode || q.check_type !== 'Thành phẩm') return false;
        return checksMatch(q, qcCategory, sanPham);
      }) || null;
    }

    const QUICK_RESULT_OPTIONS = ['Chờ xác nhận', 'Đạt', 'Không đạt 1 phần'];

    async function saveQuickResult(batchCode, qcCategory, sanPham, value){
      if(!value) return;
      try{
        const existing = finishedCheck(batchCode, qcCategory, sanPham);
        if(existing){
          const { error } = await sb.from('qc_checks').update({ result: value }).eq('id', existing.id);
          if(error) throw error;
        } else {
          const { error } = await sb.from('qc_checks').insert({
            batch_code: batchCode, category: qcCategory, san_pham: sanPham || null,
            check_type: 'Thành phẩm', result: value
          });
          if(error) throw error;
        }
        await loadAll();
      } catch(err){
        showErrorToast('Không thể lưu kết quả: ' + err.message);
      }
    }

    function buildQuickResultSelect(batchCode, qcCategory, sanPham){
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
      const current = finishedCheck(batchCode, qcCategory, sanPham);
      select.value = current && current.result ? current.result : '';
      applySelectColor(select, resultBadgeClass(select.value));
      select.addEventListener('change', function(){
        applySelectColor(select, resultBadgeClass(select.value));
        saveQuickResult(batchCode, qcCategory, sanPham, select.value);
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
        const multi = b.duaVarieties.length > 1;
        // Gộp các chủng loại nguyên liệu CÙNG ra 1 sản phẩm (đã khai ở Xưởng
        // Ba Phi) thành 1 dòng duy nhất, cộng dồn số lượng — chủng loại chỉ
        // là nguyên liệu đầu vào, khách hàng/đơn hàng quan tâm sản phẩm đầu
        // ra, không cần thấy tách theo từng chủng loại nếu ra cùng 1 sản
        // phẩm. Chủng loại CHƯA khai sản phẩm (hiện "—") thì giữ riêng từng
        // dòng theo đúng chủng loại — không tự đoán 2 dòng "—" là cùng 1 sản
        // phẩm khi Xưởng Ba Phi chưa xác nhận.
        const groups = [];
        const groupBySanPham = {};
        b.duaVarieties.forEach(function(v){
          const sanPham = b.sanPhamByVariety[v.name] || null;
          let group;
          if(sanPham && groupBySanPham[sanPham]){
            group = groupBySanPham[sanPham];
          } else {
            group = { sanPham: sanPham, varieties: [], exportedSum: 0, hasExported: false, rawSum: 0, hasRaw: false };
            groups.push(group);
            if(sanPham) groupBySanPham[sanPham] = group;
          }
          group.varieties.push(v);
          // Số lượng thực tế LUÔN theo thùng — lô chỉ 1 chủng loại lấy tổng
          // đã xuất của cả lô, nhiều chủng loại thì lấy đúng số đã xuất của
          // riêng chủng loại đó.
          const exportedForVariety = multi ? b.exportedByVariety[v.name] : b.exportedQty;
          if(exportedForVariety != null){
            group.hasExported = true;
            group.exportedSum += exportedForVariety;
          } else if(v.qty){
            // Chưa xuất kho thì vẫn phải thấy được lô này đang có bao nhiêu
            // hàng — lùi dần về số nhập thô đã cân ở Vùng nguyên liệu.
            group.hasRaw = true;
            group.rawSum += v.qty;
          }
        });
        groups.forEach(function(group){
          let qtyText = '—';
          let qtyNote = null;
          if(group.hasExported){
            qtyText = fmtBoxQty(group.exportedSum);
            qtyNote = 'đã xuất kho';
          } else if(group.hasRaw){
            qtyText = fmtQty(group.rawSum);
            qtyNote = 'nhập thô';
            // Tiến độ thu mua so với dự kiến — chỉ tính khi lô CHỈ 1 chủng
            // loại (dự kiến ghi cho cả lô, không tách theo từng dòng, nên lô
            // nhiều chủng loại không biết phần dự kiến này thuộc dòng nào) và
            // "Số lượng dự kiến" đúng dạng "<số> trái" (cùng đơn vị với số
            // nhập thô, so sánh khác đơn vị sẽ ra % vô nghĩa).
            if(!multi){
              const expectedTrai = parseLeadingTraiCount(b.soLuongDuKien);
              if(expectedTrai) qtyNote = 'nhập thô — ' + Math.round(group.rawSum / expectedTrai * 100) + '% so với dự kiến';
            }
          }
          // Kiểm QC ghi theo SẢN PHẨM thành phẩm (qc_checks.san_pham) — mỗi
          // dòng ở đây đã là 1 sản phẩm phân biệt nên khớp 1-1, không còn
          // dùng "chủng loại đầu tiên trong nhóm" như trước. Sản phẩm CHƯA
          // khai ở Xưởng Ba Phi (group.sanPham null) thì gắn kết quả cho
          // dòng "chưa tách sản phẩm" của lô.
          lines.push({
            ncc: 'Xưởng Ba Phi',
            category: group.sanPham || '—',
            qcCategory: 'Dừa',
            sanPham: group.sanPham || null,
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
      // Lô chưa có ngày đại diện (chưa nhập ngày nhập / chưa có batch_info)
      // — luôn hiện, đừng ẩn mất khỏi danh sách mặc định (giống matchesRawPeriod).
      if(!p) return true;
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
          // (category + sanPham), chọn lại là lưu ngay (update nếu đã có bản
          // ghi khớp, insert mới nếu chưa) (ép text-align:left như qtyTd để
          // tránh CSS td:last-child bắt nhầm ở dòng nối tiếp).
          // Kết quả kiểm và % đạt luôn thuộc về cùng 1 lần kiểm nên gộp chung
          // 1 cột (% hiện ngay dưới ô chọn) — tách 2 cột chỉ làm bảng rộng
          // thêm mà vẫn phải đọc ghép 2 ô mới đủ nghĩa.
          const statusTd = document.createElement('td');
          statusTd.style.textAlign = 'left';
          const statusRow = document.createElement('div');
          statusRow.style.cssText = 'display:flex;align-items:center;gap:4px;';
          const statusSelect = buildQuickResultSelect(b.batch, line.qcCategory, line.sanPham);
          statusSelect.className = 'table-inline-select';
          statusRow.appendChild(statusSelect);
          // Nút mở khối nhập đầy đủ (số lượng kiểm/đạt, người kiểm, ghi chú)
          // đã điền + khóa sẵn Ngành hàng / Sản phẩm của đúng dòng này —
          // không phải tự chọn lại, không lo chọn nhầm.
          const qcDetailBtn = document.createElement('button');
          qcDetailBtn.type = 'button';
          qcDetailBtn.className = 'row-edit-btn qc-detail-btn';
          qcDetailBtn.setAttribute('aria-label', 'Nhập kết quả kiểm chi tiết cho dòng này');
          qcDetailBtn.dataset.qccat = line.qcCategory || '';
          qcDetailBtn.dataset.sanpham = line.sanPham || '';
          qcDetailBtn.innerHTML = '<i class="ti ti-clipboard-plus"></i>';
          statusRow.appendChild(qcDetailBtn);
          statusTd.appendChild(statusRow);
          const matchedCheck = finishedCheck(b.batch, line.qcCategory, line.sanPham);
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
            // Hiện nút NGAY KHI CÓ THỂ (đã có nguồn hàng thật — mọi dòng
            // trong bảng này đều đạt, dòng chưa có nguồn hàng đã bị lọc bỏ
            // từ trước) — trước đây chặn tới tận "Đã đóng hàng" (hàng đã
            // lên container) mới cho hiện, quá trễ để kịp in tem dán lên
            // thùng. Modal vẫn mở bình thường dù chưa có dữ liệu đóng gói —
            // staff chuẩn bị trước tên sản phẩm/NCC/vùng nguyên liệu, bổ
            // sung quy cách sau, chỉ bật "Đang công khai" khi thật sự sẵn
            // sàng — nút hiện sớm không có nghĩa là khách xem được sớm.
            if(b.hasSourceInfo){
              const publicTraceBtn = document.createElement('button');
              publicTraceBtn.type = 'button';
              publicTraceBtn.className = 'row-edit-btn public-trace-open-btn';
              publicTraceBtn.setAttribute('aria-label', 'Truy xuất nguồn gốc / mã QR');
              publicTraceBtn.innerHTML = '<i class="ti ti-qrcode"></i>';
              actionsTd.appendChild(publicTraceBtn);
            }
            // Sửa Khách hàng/Sản phẩm/Ngày giao mong muốn — cùng quyền với
            // nút "Thêm đơn hàng" (chỉ Admin, xem applyRolePermissions).
            if(currentUser && currentUser.role === 'admin'){
              const orderEditBtn = document.createElement('button');
              orderEditBtn.type = 'button';
              orderEditBtn.className = 'row-edit-btn order-edit-btn';
              orderEditBtn.setAttribute('aria-label', 'Sửa thông tin đơn hàng');
              orderEditBtn.innerHTML = '<i class="ti ti-pencil"></i>';
              actionsTd.appendChild(orderEditBtn);
            }
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
        showErrorToast('Không thể lưu Hình thức: ' + err.message);
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
        showErrorToast('Không thể lưu Loại đơn Nội địa: ' + err.message);
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
      // Value giữ nguyên chuỗi cũ (khớp dữ liệu domestic_type đã lưu trong
      // Supabase) — chỉ đổi label hiển thị, đổi cả value sẽ làm các lô đã
      // chọn từ trước hiện về "Chưa phân loại" vì không còn khớp option nào.
      [['', '— Chưa phân loại —'], ['Bán cho broker (họ tự xuất khẩu)', 'Bán cho cty TM/Broker'], ['Tiêu thụ nội địa (Việt Nam)', 'Tiêu thụ nội địa']].forEach(function(o){
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
        showErrorToast('Không thể lưu Trạng thái đơn hàng: ' + err.message);
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
        showErrorToast('Không thể lưu Ghi chú: ' + err.message);
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
      function buildQcHistoryRow(d){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.id = d.id;
        tr.dataset.category = d.category || 'Dừa';
        // Bản ghi cũ chưa có san_pham → lùi về chung_loai để vẫn sửa được.
        tr.dataset.sanPham = d.san_pham || d.chung_loai || '';
        tr.dataset.type = d.check_type || '';
        tr.dataset.result = d.result || '';
        tr.dataset.inspector = d.inspector || '';
        tr.dataset.note = d.note || '';
        tr.dataset.soLuongKiem = d.so_luong_kiem != null ? d.so_luong_kiem : '';
        tr.dataset.soLuongDat = d.so_luong_dat != null ? d.so_luong_dat : '';

        const typeTd = document.createElement('td');
        typeTd.textContent = d.check_type || '—';
        tr.appendChild(typeTd);

        const sanPhamTd = document.createElement('td');
        sanPhamTd.className = 'muted';
        sanPhamTd.textContent = d.san_pham || d.chung_loai || '—';
        tr.appendChild(sanPhamTd);

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

        // Kết quả "Không đạt 1 phần" (hoặc tỷ lệ đạt <85%, cùng ngưỡng dùng
        // cho Hao hụt/Trái bị dạt ở Xưởng sản xuất) mà chưa ghi chú thì nhắc
        // màu cam — để giám đốc/quản lý biết dòng nào cần hỏi lại nguyên
        // nhân (do khâu nào, lô hàng cụ thể ra sao), giống hệt cách đang làm
        // ở bảng Xưởng Ba Phi.
        const noteTd = document.createElement('td');
        const rateForNote = checkPassRate(d);
        const badResult = d.result === 'Không đạt 1 phần' || (rateForNote && rateForNote.pct < 85);
        if(d.note){
          noteTd.textContent = d.note;
          noteTd.className = 'muted';
        } else if(badResult){
          noteTd.textContent = 'Chưa ghi chú';
          noteTd.className = 'warn-text';
        } else {
          noteTd.textContent = '—';
          noteTd.className = 'muted';
        }
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
        return tr;
      }

      // Mỗi dòng dựng riêng trong try/catch — 1 lượt kiểm lỗi khi dựng
      // (throw) trước đây sẽ làm forEach dừng luôn, các lượt kiểm SAU nó
      // lặng lẽ biến mất khỏi lịch sử của lô (đúng lỗi đã gặp ở thẻ mã QR
      // truy xuất — xem loadTraceProducts). Giờ lỗi 1 dòng không kéo mất
      // các dòng còn lại, và có dòng đỏ báo rõ ngay trong bảng.
      checks.forEach(function(d){
        try{
          historyTbody.appendChild(buildQcHistoryRow(d));
        } catch(rowErr){
          console.error('Không dựng được 1 dòng lịch sử QC:', rowErr);
          const errTr = document.createElement('tr');
          const errTd = document.createElement('td');
          errTd.colSpan = 7;
          errTd.style.cssText = 'color:var(--red);background:var(--red-bg);font-size:12px;padding:8px 12px;';
          errTd.textContent = 'Lỗi khi hiện 1 lượt kiểm — xem console (F12) để biết chi tiết.';
          errTr.appendChild(errTd);
          historyTbody.appendChild(errTr);
        }
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await loadAll();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
      }
    }

    const KNOWN_QC_CATEGORIES = ['Dừa', 'Chanh', 'Thanh long', 'Khác'];

    const sanPhamHint = document.getElementById('qc-sanpham-hint');

    // "Sản phẩm" chỉ áp dụng cho hàng Dừa và chỉ có nghĩa khi lô làm ra ≥ 2
    // sản phẩm khác nhau — còn lại ẩn hẳn field cho form gọn (kết quả tự
    // gắn cho sản phẩm duy nhất, hoặc cho dòng "chưa tách sản phẩm").
    // Khi mở từ đúng 1 dòng (sanPhamLocked), luôn hiện field nhưng khóa lại:
    // select disabled, thay phần hướng dẫn bằng dòng "Đang nhập cho: ...".
    function updateSanPhamVisibility(){
      if(!sanPhamGroup) return;
      const b = currentBatch && batchSummaries[currentBatch];
      const isDua = categorySelect.value === 'Dừa';
      const multiProduct = batchProductList(b).length > 1;
      // Khóa theo dòng thì Ngành hàng cũng cố định luôn.
      if(categorySelect) categorySelect.disabled = sanPhamLocked;
      if(sanPhamLocked){
        // Không phải Dừa thì không có khái niệm sản phẩm con — ẩn hẳn field
        // (Ngành hàng vẫn bị khóa theo dòng, chỉ là không có gì để chọn).
        sanPhamGroup.style.display = isDua ? '' : 'none';
        if(sanPhamSelect) sanPhamSelect.disabled = true;
        if(sanPhamHint) sanPhamHint.style.display = 'none';
        if(sanPhamLockedNote) sanPhamLockedNote.style.display = isDua ? '' : 'none';
        return;
      }
      if(sanPhamSelect) sanPhamSelect.disabled = false;
      if(sanPhamHint) sanPhamHint.style.display = '';
      if(sanPhamLockedNote) sanPhamLockedNote.style.display = 'none';
      sanPhamGroup.style.display = (isDua && multiProduct) ? '' : 'none';
    }
    // Options = danh sách sản phẩm thành phẩm phân biệt đã khai ở Xưởng Ba
    // Phi cho đúng lô này — QC chỉ chọn được sản phẩm có thật trong lô.
    function populateSanPhamOptions(batchCode, selected){
      if(!sanPhamSelect) return;
      const b = batchCode && batchSummaries[batchCode];
      const products = batchProductList(b);
      sanPhamSelect.innerHTML = '';
      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = products.length ? '— Chọn sản phẩm —' : '— Không tách theo sản phẩm —';
      sanPhamSelect.appendChild(blankOpt);
      products.forEach(function(name){
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sanPhamSelect.appendChild(opt);
      });
      sanPhamSelect.value = selected && products.indexOf(selected) !== -1 ? selected : '';
    }
    if(categorySelect){
      categorySelect.addEventListener('change', function(){
        if(sanPhamLocked) return;
        updateSanPhamVisibility();
        populateSanPhamOptions(currentBatch, '');
      });
    }

    function resetForm(){
      editingQcId = null;
      form.reset();
      const b = currentBatch && batchSummaries[currentBatch];
      const products = batchProductList(b);

      // Ngành hàng: ưu tiên preset (mở từ đúng 1 dòng), rồi tới category của
      // lô. b.category có thể là chuỗi ghép (VD "Dừa + Chanh") khi lô ghép
      // nhiều loại hàng — chỉ gán khi khớp đúng 1 lựa chọn có sẵn trong select.
      let cat = '';
      if(presetCategory && KNOWN_QC_CATEGORIES.indexOf(presetCategory) !== -1) cat = presetCategory;
      else if(b && b.category && KNOWN_QC_CATEGORIES.indexOf(b.category) !== -1) cat = b.category;
      if(cat) categorySelect.value = cat;

      // Khóa Sản phẩm khi: mở từ đúng 1 dòng (presetCategory), HOẶC lô Dừa chỉ
      // có đúng 1 sản phẩm (không có gì để chọn nhầm).
      const singleDuaProduct = categorySelect.value === 'Dừa' && products.length === 1;
      sanPhamLocked = presetCategory !== null || singleDuaProduct;
      let lockedProduct = null;
      if(presetCategory !== null) lockedProduct = presetSanPham || null;
      else if(singleDuaProduct) lockedProduct = products[0];

      populateSanPhamOptions(currentBatch, lockedProduct || '');
      if(sanPhamLocked && sanPhamSelect){
        // giữ được cả sản phẩm không còn trong danh sách lô (dữ liệu cũ)
        if(lockedProduct && !Array.prototype.some.call(sanPhamSelect.options, function(o){ return o.value === lockedProduct; })){
          const opt = document.createElement('option');
          opt.value = lockedProduct; opt.textContent = lockedProduct;
          sanPhamSelect.appendChild(opt);
        }
        sanPhamSelect.value = lockedProduct || '';
        if(sanPhamLockedNote){
          sanPhamLockedNote.textContent = 'Đang nhập kết quả cho: ' + (categorySelect.value || '—') + ' · ' + (lockedProduct || '(chưa tách sản phẩm)') + '  ';
          const unlock = document.createElement('a');
          unlock.href = '#';
          unlock.textContent = 'Đổi';
          unlock.addEventListener('click', function(e){
            e.preventDefault();
            presetCategory = null; presetSanPham = null; sanPhamLocked = false;
            populateSanPhamOptions(currentBatch, '');
            updateSanPhamVisibility();
          });
          sanPhamLockedNote.appendChild(unlock);
        }
      }
      updateSanPhamVisibility();

      // Điền sẵn "Người kiểm" từ phân công QC của đúng (lô, sản phẩm) đang mở
      // — chỉ khi đang nhập kết quả MỚI (không phải sửa lượt cũ) và ô còn trống.
      const inspectorEl = document.getElementById('qc-inspector');
      if(inspectorEl && !inspectorEl.value){
        const asg = assignmentFor(currentBatch, lockedProduct || currentSanPham || '');
        if(asg && asg.qc_inspector) inspectorEl.value = asg.qc_inspector;
      }

      submitBtn.textContent = 'Thêm kết quả';
    }

    // ---- Bảng "Chọn lô để kiểm" tách theo (lô × sản phẩm) ----
    // Trạng thái tổng: thứ tự ưu tiên Không đạt > Chờ xác nhận > Đạt, khớp
    // batchQcStatus ở Tổng quan (viết riêng vì khác closure).
    // Danh sách dòng của 1 lô: 1 dòng / sản phẩm khai ở Xưởng; lô chưa có
    // sản phẩm chi tiết → 1 dòng sản phẩm rỗng (''), cột Sản phẩm hiện "—".
    function pickProductRows(b){
      const products = batchProductList(b);
      if(products.length) return products;
      return [''];
    }
    // qc_checks của đúng 1 sản phẩm trong lô. Lô chỉ có 0–1 sản phẩm thì mọi
    // lượt kiểm của lô đều thuộc dòng đó (kể cả lượt cũ chưa gắn san_pham).
    function checksForProduct(batchCode, sanPham, onlyProductCount){
      return allQcRows.filter(function(q){
        if(q.batch_code !== batchCode) return false;
        if(onlyProductCount <= 1) return true;
        return (q.san_pham || '') === (sanPham || '');
      });
    }
    function pickProductStatus(batchCode, sanPham, onlyProductCount){
      const checks = checksForProduct(batchCode, sanPham, onlyProductCount);
      if(!checks.length) return 'Chưa kiểm';
      if(checks.some(function(q){ return q.result === 'Không đạt 1 phần'; })) return 'Không đạt 1 phần';
      if(checks.some(function(q){ return !q.result || q.result === 'Chờ xác nhận'; })) return 'Chờ xác nhận';
      return 'Đạt';
    }
    function pickProductPassRate(batchCode, sanPham, onlyProductCount){
      let kiem = 0, dat = 0;
      checksForProduct(batchCode, sanPham, onlyProductCount).forEach(function(q){
        const rate = checkPassRate(q);
        if(!rate) return;
        kiem += rate.kiem; dat += rate.dat;
      });
      return kiem ? Math.round(dat / kiem * 100) : null;
    }
    function assignmentFor(batchCode, sanPham){
      return allAssignments.find(function(a){
        return a.batch_code === batchCode && (a.san_pham || '') === (sanPham || '');
      }) || null;
    }
    async function upsertAssignment(batchCode, sanPham, patch){
      const key = batchCode + '::' + (sanPham || '');
      const existing = assignmentFor(batchCode, sanPham) || { batch_code: batchCode, san_pham: sanPham || '' };
      const row = Object.assign({}, existing, patch);
      // Cache cục bộ ngay (ô nhập đã hiện đúng giá trị rồi, không re-render).
      const idx = allAssignments.findIndex(function(a){ return a.batch_code + '::' + (a.san_pham || '') === key; });
      if(idx === -1) allAssignments.push(row); else allAssignments[idx] = row;
      populateQcNamesDatalist();
      try{
        const { error } = await sb.from('qc_assignments').upsert(
          { batch_code: batchCode, san_pham: sanPham || '', inspection_date: row.inspection_date || null, qc_inspector: row.qc_inspector || null },
          { onConflict: 'batch_code,san_pham' }
        );
        if(error) throw error;
      } catch(err){
        showErrorToast('Không lưu được phân công QC: ' + (err.message || err));
      }
    }
    function populateQcNamesDatalist(){
      const dl = document.getElementById('dl-qc-names');
      if(!dl) return;
      const names = new Set();
      allAssignments.forEach(function(a){ if(a.qc_inspector) names.add(a.qc_inspector.trim()); });
      allQcRows.forEach(function(q){ if(q.inspector) names.add(String(q.inspector).trim()); });
      dl.innerHTML = '';
      Array.from(names).filter(Boolean).sort(function(x, y){ return x.localeCompare(y, 'vi'); }).forEach(function(n){
        const o = document.createElement('option'); o.value = n; dl.appendChild(o);
      });
    }

    function matchesPickSearch(b){
      const q = (pickSearchInput && pickSearchInput.value || '').trim().toLowerCase();
      return !q || b.batch.toLowerCase().indexOf(q) !== -1;
    }
    function matchesPickPeriod(b){
      if(!pickYearSelect || !pickYearSelect.value) return true;
      const d = orderRecencyDate(b);
      const p = d ? periodParts(d) : null;
      // Lô chưa có ngày đại diện — luôn hiện, không thì lô đó không chọn
      // được để nhập QC (phải gõ tìm tên mới thấy).
      if(!p) return true;
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
    function findPickRow(batchCode, sanPham){
      return Array.from(pickTbody.querySelectorAll('tr[data-batch]')).find(function(tr){
        return tr.dataset.batch === batchCode && (tr.dataset.sanpham || '') === (sanPham || '');
      }) || null;
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
        td.colSpan = 6;
        td.style.cssText = 'text-align:center;color:var(--ink-soft);padding:20px;';
        td.textContent = 'Không có lô nào khớp.';
        tr.appendChild(td);
        pickTbody.appendChild(tr);
        return;
      }
      batches.forEach(function(b){
        const products = pickProductRows(b);
        const prodCount = products.filter(Boolean).length;
        products.forEach(function(sanPham, i){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.batch = b.batch;
          tr.dataset.sanpham = sanPham || '';

          const batchTd = document.createElement('td');
          batchTd.textContent = b.batch;
          if(i > 0){ batchTd.className = 'muted'; batchTd.style.opacity = '.45'; }
          tr.appendChild(batchTd);

          const spTd = document.createElement('td');
          spTd.textContent = sanPham || '—';
          if(!sanPham) spTd.className = 'muted';
          tr.appendChild(spTd);

          const asg = assignmentFor(b.batch, sanPham);

          const dateTd = document.createElement('td');
          const dateInput = document.createElement('input');
          dateInput.type = 'date';
          dateInput.className = 'qc-assign-date table-inline-input';
          dateInput.value = (asg && asg.inspection_date) ? String(asg.inspection_date).slice(0, 10) : '';
          dateInput.title = 'Ngày kiểm hàng — nhập tay';
          dateTd.appendChild(dateInput);
          tr.appendChild(dateTd);

          const qcTd = document.createElement('td');
          const qcInput = document.createElement('input');
          qcInput.type = 'text';
          qcInput.className = 'qc-assign-qc table-inline-input';
          qcInput.setAttribute('list', 'dl-qc-names');
          qcInput.placeholder = 'Tên QC';
          qcInput.value = (asg && asg.qc_inspector) || '';
          qcTd.appendChild(qcInput);
          tr.appendChild(qcTd);

          const status = pickProductStatus(b.batch, sanPham, prodCount);
          const statusTd = document.createElement('td');
          const badge = document.createElement('span');
          badge.className = 'badge ' + resultBadgeClass(status);
          badge.textContent = status;
          statusTd.appendChild(badge);
          tr.appendChild(statusTd);

          const rate = pickProductPassRate(b.batch, sanPham, prodCount);
          const rateTd = document.createElement('td');
          rateTd.className = 'muted';
          rateTd.textContent = rate != null ? rate + '%' : '—';
          tr.appendChild(rateTd);

          pickTbody.appendChild(tr);
        });
      });
      if(currentBatch && detailPanel.style.display !== 'none') insertDetailPanelAfterRow(currentBatch, currentSanPham);
    }

    function insertDetailPanelAfterRow(batchCode, sanPham){
      const oldExpando = pickTbody.querySelector('.qc-detail-row');
      if(oldExpando) oldExpando.remove();
      const row = findPickRow(batchCode, sanPham) || findPickRow(batchCode, '');
      if(!row) return;
      const expandoTr = document.createElement('tr');
      expandoTr.className = 'qc-detail-row';
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.cssText = 'padding:16px;background:var(--surface-2);';
      td.appendChild(detailPanel);
      expandoTr.appendChild(td);
      row.after(expandoTr);
    }

    // preset (tùy chọn): { category, sanPham } khi mở từ đúng 1 dòng ở bảng
    // tổng hợp — form sẽ khóa Ngành hàng + Sản phẩm theo dòng đó.
    function openBatchModal(batchCode, preset){
      currentBatch = batchCode;
      currentSanPham = (preset && preset.sanPham) || null;
      presetCategory = preset && preset.category ? preset.category : null;
      presetSanPham = preset && preset.sanPham ? preset.sanPham : null;
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
      currentSanPham = null;
      presetCategory = null;
      presetSanPham = null;
      resetForm();
    }

    // ---- Modal "Truy xuất nguồn gốc" — bật/tắt trang công khai (trace.html,
    // đọc qua view an toàn public.batch_trace_public, xem
    // supabase/2026-08-19_public_trace.sql) và sinh mã QR trỏ vào đó cho
    // từng lô. Vùng nguyên liệu NHẬP TAY (không tự lấy từ NCC/đầu mối thu
    // mua thật) để tránh lộ quan hệ kinh doanh — nhưng Quy cách đóng gói thì
    // hệ thống đã có sẵn (Quy cách đóng thùng khai ở Xưởng Ba Phi, xem
    // getBoxItemsForBatch), tự điền được, staff chỉ cần rà lại trước khi lưu.
    const PUBLIC_TRACE_BASE_URL = 'https://fadoagri-scms.github.io/trace.html';
    // Cổng tra cứu (tra-cuu.html) — dùng cho khách chỉ có máy quét mã vạch
    // RỜI (không phải app điện thoại): máy quét rời chỉ "gõ hộ" ký tự vào
    // ô đang có con trỏ, không tự mở trình duyệt được (giới hạn phần cứng,
    // không phải do thiếu code) — khách mở cổng này 1 lần, để mở suốt ca,
    // quét/gõ số vào ô là tự chuyển đúng trang truy xuất.
    const traceOverlay = document.getElementById('trace-overlay');
    const traceModalTitle = document.getElementById('trace-modal-title');
    const traceCloseBtn = document.getElementById('btn-close-trace');
    const traceCancelBtn = document.getElementById('btn-cancel-trace');
    const traceForm = document.getElementById('form-trace');
    const traceSubmitBtn = document.getElementById('btn-submit-trace');
    const traceBatchLabelInput = document.getElementById('trace-batch-label');
    const traceExtraLangSelect = document.getElementById('trace-extra-lang');
    const traceProductNameInput = document.getElementById('trace-product-name');
    const traceProductNameEnInput = document.getElementById('trace-product-name-en');
    const traceProductNameExtraInput = document.getElementById('trace-product-name-extra');
    const traceSupplierNameInput = document.getElementById('trace-supplier-name');
    const traceSupplierNameEnInput = document.getElementById('trace-supplier-name-en');
    const traceSupplierNameExtraInput = document.getElementById('trace-supplier-name-extra');
    const traceImporterNameInput = document.getElementById('trace-importer-name');
    const traceImporterNameEnInput = document.getElementById('trace-importer-name-en');
    const traceImporterNameExtraInput = document.getElementById('trace-importer-name-extra');
    const traceVarietyInput = document.getElementById('trace-variety');
    const traceVarietyEnInput = document.getElementById('trace-variety-en');
    const traceVarietyExtraInput = document.getElementById('trace-variety-extra');
    const traceRegionInput = document.getElementById('trace-region');
    const traceRegionEnInput = document.getElementById('trace-region-en');
    const traceRegionExtraInput = document.getElementById('trace-region-extra');
    const tracePackedDateInput = document.getElementById('trace-packed-date');
    const tracePackingTextInput = document.getElementById('trace-packing-text');
    const traceTermsGroup = document.getElementById('trace-terms-group');
    const traceTermsList = document.getElementById('trace-terms-list');
    const traceRefillBtn = document.getElementById('btn-refill-trace-packing');
    const tracePublicSection = document.getElementById('trace-public-section');
    const traceEnabledToggle = document.getElementById('trace-enabled-toggle');
    const traceEnabledLabel = document.getElementById('trace-enabled-label');
    const traceCodeWrap = document.getElementById('trace-code-wrap');
    const traceCodeInput = document.getElementById('trace-code-input');
    const traceRegenCodeBtn = document.getElementById('btn-regen-trace-code');
    const traceSaveCodeBtn = document.getElementById('btn-save-trace-code');
    const traceQrWrap = document.getElementById('trace-qr-wrap');
    const traceQrBox = document.getElementById('trace-qr-box');
    const tracePublicUrlInput = document.getElementById('trace-public-url');
    const traceQrEnabledToggle = document.getElementById('trace-qr-enabled-toggle');
    const traceQrVisibleArea = document.getElementById('trace-qr-visible-area');
    const traceQrExportedLabel = document.getElementById('trace-qr-exported-label');
    const traceExportQrBtn = document.getElementById('btn-export-trace-qr');
    const traceBarcodeEnabledToggle = document.getElementById('trace-barcode-enabled-toggle');
    const traceBarcodeVisibleArea = document.getElementById('trace-barcode-visible-area');
    const traceBarcodeExportedLabel = document.getElementById('trace-barcode-exported-label');
    const traceExportBarcodeBtn = document.getElementById('btn-export-trace-barcode');
    // Đã xuất (đã bấm nút "Xuất" — coi như in/dùng thật) — ảnh hưởng cảnh
    // báo khi đổi mã tra cứu sau này (xem btn-save-trace-code).
    let traceQrExported = false;
    let traceBarcodeExported = false;
    const traceCopyBtn = document.getElementById('btn-copy-trace-url');
    const traceProductsWrap = document.getElementById('trace-products-wrap');
    const traceProductList = document.getElementById('trace-product-list');

    let traceCurrentBatch = null;
    let traceCurrentCode = null;
    let traceTermTranslations = {};
    let traceTermTranslationsExtra = {};

    // Ẩn/hiện toàn bộ ô "ngôn ngữ đặc biệt" (Tên sản phẩm/Nhà máy/Đơn vị
    // nhập khẩu/Chủng loại/Vùng nguyên liệu) theo đúng lựa chọn ở dropdown —
    // chưa chọn ngôn ngữ nào thì ẩn hết, đỡ rối form cho các lô dùng
    // song ngữ Việt/Anh bình thường (đa số).
    function toggleTraceExtraFields(){
      const langCode = traceExtraLangSelect ? traceExtraLangSelect.value : '';
      const on = !!langCode;
      document.querySelectorAll('.trace-extra-input').forEach(function(el){
        el.style.display = on ? '' : 'none';
      });
      // Nhãn ngôn ngữ trên mỗi ô đổi theo đúng lựa chọn (VD "JA") — luôn
      // hiện, không như placeholder cũ (biến mất ngay khi có chữ).
      document.querySelectorAll('.trace-extra-tag').forEach(function(el){
        el.textContent = langCode.toUpperCase();
      });
      // Cột dịch theo từng tên (đóng gói) cũng cần vẽ lại — có/không cột
      // ngôn ngữ đặc biệt phụ thuộc đúng lựa chọn hiện tại.
      if(traceTermsGroup.style.display !== 'none'){
        renderTraceTerms(Array.from(traceTermsList.querySelectorAll('[data-term]')).map(function(el){ return el.dataset.term; }));
      }
    }
    if(traceExtraLangSelect) traceExtraLangSelect.addEventListener('change', toggleTraceExtraFields);

    // 1 ô EN nhỏ + 1 ô ngôn ngữ đặc biệt (nếu lô có chọn) / tên riêng (nguyên
    // liệu hoặc sản phẩm) xuất hiện trong "Đóng gói" — thay cho việc bắt gõ
    // nguyên đoạn dịch đúng cấu trúc "Nguyên liệu → Sản phẩm · Số lượng" (dễ
    // gõ sai dấu, xem phản hồi 2026-08-19). Danh sách tên lấy từ
    // uniqueTermsFromBoxes(items).
    function renderTraceTerms(terms){
      traceTermsList.textContent = '';
      if(!terms.length){ traceTermsGroup.style.display = 'none'; return; }
      traceTermsGroup.style.display = '';
      const extraLang = traceExtraLangSelect ? traceExtraLangSelect.value : '';
      terms.forEach(function(term){
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;';
        const label = document.createElement('div');
        label.style.cssText = 'font-size:12px;color:var(--ink-soft);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        label.textContent = term;
        row.appendChild(label);

        const wrapEn = document.createElement('div');
        wrapEn.className = 'trace-lang-field';
        wrapEn.style.cssText = 'flex:1;margin-top:0;';
        const tagEn = document.createElement('span'); tagEn.className = 'trace-lang-tag'; tagEn.textContent = 'EN';
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.term = term;
        input.value = traceTermTranslations[term] || '';
        wrapEn.appendChild(tagEn); wrapEn.appendChild(input);
        row.appendChild(wrapEn);

        if(extraLang){
          const wrapExtra = document.createElement('div');
          wrapExtra.className = 'trace-lang-field';
          wrapExtra.style.cssText = 'flex:1;margin-top:0;';
          const tagExtra = document.createElement('span'); tagExtra.className = 'trace-lang-tag'; tagExtra.textContent = extraLang.toUpperCase();
          const inputExtra = document.createElement('input');
          inputExtra.type = 'text';
          inputExtra.dataset.termExtra = term;
          inputExtra.value = traceTermTranslationsExtra[term] || '';
          wrapExtra.appendChild(tagExtra); wrapExtra.appendChild(inputExtra);
          row.appendChild(wrapExtra);
        }
        traceTermsList.appendChild(row);
      });
    }
    function readTraceTerms(){
      const result = {};
      Array.from(traceTermsList.querySelectorAll('input[data-term]')).forEach(function(inp){
        const v = inp.value.trim();
        if(v) result[inp.dataset.term] = v;
      });
      return result;
    }
    function readTraceTermsExtra(){
      const result = {};
      Array.from(traceTermsList.querySelectorAll('input[data-term-extra]')).forEach(function(inp){
        const v = inp.value.trim();
        if(v) result[inp.dataset.termExtra] = v;
      });
      return result;
    }

    // Số kiểm tra EAN-13 chuẩn (thuật toán GS1: trọng số xen kẽ 1-3 từ
    // trái, modulo 10) — tính từ 12 số đầu, KHÔNG được chọn tùy ý. Xem
    // genTraceCode() bên dưới.
    function eanCheckDigit(digits12){
      var sum = 0;
      for(var i = 0; i < 12; i++){
        var d = Number(digits12[i]);
        sum += (i % 2 === 0) ? d : d * 3;
      }
      return (10 - (sum % 10)) % 10;
    }

    // Mã bí mật nằm trong link/QR/mã vạch — LUÔN ngẫu nhiên, không liên quan
    // tên lô, để không ai dò/đoán ra link được (xem trace_batch_label bên
    // dưới cho phần "Mã lô" hiển thị công khai — tách riêng, không liên quan
    // mã này).
    // Định dạng: "893" (mã quốc gia Việt Nam, cố định) + 9 số ngẫu nhiên +
    // 1 số kiểm tra tính theo công thức EAN-13 chuẩn = 13 số, ĐÚNG DÁNG DẤP
    // 1 mã EAN-13 thật. LƯU Ý QUAN TRỌNG: đoạn 9 số sau "893" đáng lẽ phải
    // do GS1 Việt Nam cấp (mã doanh nghiệp + mã mặt hàng) — công ty CHƯA
    // đăng ký đầu số này, nên đoạn đó tạm random theo yêu cầu người dùng
    // (đã trao đổi rõ rủi ro: có thể trùng dải số 1 công ty khác đã đăng ký
    // thật, hệ thống GS1 quốc tế sẽ tra ra sai công ty nếu bị đối chiếu).
    // Khi có đầu số GS1 thật, thay ĐÚNG đoạn 9 số random này bằng đầu số +
    // mã mặt hàng thật, giữ nguyên "893" + cách tính số kiểm tra.
    // Đánh đổi entropy: 9 số ngẫu nhiên ~ 10^9 khả năng (ít hơn hẳn 12 số
    // ngẫu nhiên hoàn toàn ~10^12 trước đây) — vẫn đủ khó đoán mò cho mục
    // đích này (không phải dữ liệu tài chính, staff còn phải tự bật "Đang
    // công khai" cho từng lô).
    function genTraceCode(){
      var mid = '';
      if(typeof crypto !== 'undefined' && crypto.getRandomValues){
        var arr = new Uint32Array(9);
        crypto.getRandomValues(arr);
        for(var i = 0; i < 9; i++) mid += arr[i] % 10;
      } else {
        for(var i = 0; i < 9; i++) mid += Math.floor(Math.random() * 10);
      }
      var base12 = '893' + mid;
      return base12 + eanCheckDigit(base12);
    }

    // Gộp Sản phẩm+Quy cách trên mọi đợt sản xuất của 1 lô lại (1 lô có thể
    // có nhiều đợt/nhiều dòng box, nhiều loại hàng khác nhau) — cùng cách
    // tính với tab Xuất hàng ở Xưởng Ba Phi. Giữ luôn chung_loai (nguyên liệu
    // thô) của ĐÚNG dòng raw_batches sinh ra box đó — 1 lô nhập nhiều loại
    // nguyên liệu thì mỗi loại có thể ra 1 sản phẩm thành phẩm khác hẳn nhau
    // (VD Xiêm xanh → Dừa nón lá, Dừa trọc → Dừa trọc chóp), gộp phẳng mất
    // hết mối liên hệ này nên phải giữ theo từng raw_batches.
    async function getBoxItemsForBatch(batchCode){
      const { data, error } = await sb.from('raw_batches').select('batch, chung_loai, ncc, factory_batches(factory_batch_boxes(san_pham,quy_cach,so_luong_thung))').eq('batch', batchCode).is('deleted_at', null);
      if(error) throw error;
      const boxMap = {};
      (data || []).forEach(function(r){
        const fb = r.factory_batches && (Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches);
        if(!fb) return;
        (fb.factory_batch_boxes || []).forEach(function(box){
          const key = (r.chung_loai || '') + '::' + (box.san_pham || '') + '::' + (box.quy_cach == null ? '' : box.quy_cach);
          if(!boxMap[key]) boxMap[key] = { nguyenLieu: r.chung_loai || '', sanPham: box.san_pham || '', quyCach: box.quy_cach, soLuong: 0, nccs: [] };
          boxMap[key].soLuong += Number(box.so_luong_thung) || 0;
          if(r.ncc && boxMap[key].nccs.indexOf(r.ncc) === -1) boxMap[key].nccs.push(r.ncc);
        });
      });
      return Object.values(boxMap);
    }
    // "→" đánh dấu nguyên liệu→thành phẩm, " · " ngăn số lượng — trace.html
    // tách theo đúng 2 dấu này để gộp nhóm theo nguyên liệu (xem
    // renderPackingLines). Bỏ số quy cách (trái/thùng) khỏi trang công khai
    // — chi tiết kỹ thuật nội bộ, khách không cần. Số lượng để SỐ TRẦN,
    // không kèm chữ "thùng" — trace.html tự thêm đơn vị theo đúng ngôn ngữ
    // đang xem (thùng/boxes), gắn cứng vào đây thì không dịch được.
    function formatPackingTextFromBoxes(items){
      return items.map(function(it){
        const prefix = it.nguyenLieu ? (it.nguyenLieu + ' → ') : '';
        return prefix + (it.sanPham || '(chưa đặt tên)') + ' · ' + it.soLuong.toLocaleString('vi-VN');
      }).join('\n');
    }
    // Danh sách tên riêng (nguyên liệu + sản phẩm) xuất hiện trong lô — dùng
    // để hiện từng ô dịch nhỏ trong modal, thay vì bắt gõ lại nguyên cụm
    // "Nguyên liệu → Sản phẩm · Số lượng" bằng tiếng Anh (dễ gõ sai dấu).
    function uniqueTermsFromBoxes(items){
      const terms = [];
      const seen = new Set();
      items.forEach(function(it){
        [it.nguyenLieu, it.sanPham].forEach(function(t){
          if(t && !seen.has(t)){ seen.add(t); terms.push(t); }
        });
      });
      // Đơn vị "thùng" KHÔNG cần dịch riêng từng lô nữa — trace.html giờ tự
      // hiện "boxes"/"箱"/... theo 1 bảng cố định (UNIT_WORDS), không đọc từ
      // điển này nữa.
      return terms;
    }
    // Tên sản phẩm công khai lấy từ chính danh sách đóng thùng thật (không
    // dùng batch_info.san_pham — ô "Sản phẩm dự kiến" nhập lúc tạo đơn,
    // thường bỏ trống/không cập nhật khi lô có nhiều loại hàng) — sắp theo
    // sản lượng nhiều nhất trước.
    function productNameFromBoxes(items){
      const names = Array.from(new Set(
        items.slice().sort(function(a, b){ return b.soLuong - a.soLuong; })
          .map(function(it){ return it.sanPham; }).filter(Boolean)
      ));
      return names.join(', ');
    }
    async function getTraceVarietySuggestion(batchCode){
      const { data, error } = await sb.from('raw_batches').select('chung_loai').eq('batch', batchCode).is('deleted_at', null);
      if(error) throw error;
      const names = Array.from(new Set((data || []).map(function(r){ return r.chung_loai; }).filter(Boolean)));
      return names.join(', ');
    }
    // Địa chỉ đầu mối thu mua (raw_suppliers.address, khớp theo tên với
    // raw_batches.ncc — xem ghi chú ở modal "Sửa hồ sơ đầu mối") thường chi
    // tiết hơn mức cần công khai (VD "Ấp 3, Giồng Trôm, Bến Tre") — điền tạm
    // làm gợi ý, staff tự rút gọn về đúng vùng/tỉnh trước khi lưu.
    async function getTraceRegionSuggestion(batchCode){
      const { data: rows, error } = await sb.from('raw_batches').select('ncc').eq('batch', batchCode).is('deleted_at', null);
      if(error) throw error;
      const nccNames = Array.from(new Set((rows || []).map(function(r){ return r.ncc; }).filter(Boolean)));
      if(!nccNames.length) return '';
      const { data: suppliers, error: supErr } = await sb.from('raw_suppliers').select('name,address').in('name', nccNames);
      if(supErr) throw supErr;
      const addresses = Array.from(new Set((suppliers || []).map(function(s){ return s.address; }).filter(Boolean)));
      return addresses.join('; ');
    }
    // Gợi ý "Ngày đóng hàng": ưu tiên NGÀY SẢN XUẤT gần nhất ở Xưởng Ba Phi
    // (sát ngày đóng thùng thật). Hàng không qua Xưởng (Chanh/Thanh long/
    // Chuối... mua qua NCC ngoài) không có mốc này thì lùi về ngày hệ thống
    // tạo dòng Logistics đầu tiên (≈ lúc chuyển Trạng thái đơn sang "Đã đóng
    // hàng", xem saveOrderStatus). Admin vẫn sửa tay được sau khi điền.
    async function getTracePackedDateSuggestion(batchCode){
      const { data: rbRows, error: rbErr } = await sb
        .from('raw_batches')
        .select('factory_batches(production_date)')
        .eq('batch', batchCode)
        .is('deleted_at', null);
      if(rbErr) throw rbErr;
      let latestProd = '';
      (rbRows || []).forEach(function(r){
        // raw_batch_id có ràng buộc unique nên factory_batches trả về 1
        // object (hoặc null), không phải mảng — chuẩn hoá lại cho chắc.
        const fbs = Array.isArray(r.factory_batches)
          ? r.factory_batches
          : (r.factory_batches ? [r.factory_batches] : []);
        fbs.forEach(function(fb){
          const pd = fb && fb.production_date ? String(fb.production_date).slice(0, 10) : '';
          if(pd && pd > latestProd) latestProd = pd;
        });
      });
      if(latestProd) return latestProd;
      const { data, error } = await sb.from('shipments').select('created_at').eq('batch_code', batchCode).is('deleted_at', null).order('created_at', { ascending: true }).limit(1);
      if(error) throw error;
      return data && data.length ? String(data[0].created_at).slice(0, 10) : '';
    }
    // Dừa đi qua sản xuất nội bộ ở Xưởng Ba Phi (không qua NCC ngoài như
    // Chanh/Thanh long/Chuối) nên gợi ý thẳng "Ba Phi"; các loại hàng khác
    // lấy đúng tên NCC đã ghi nhận qua PO (đã có sẵn trong batchSummaries,
    // không cần gọi Supabase thêm).
    function getTraceSupplierSuggestion(batchCode){
      const b = batchSummaries[batchCode];
      if(!b) return '';
      if(b.isDua) return 'Ba Phi';
      return b.ncc || '';
    }
    // onlyFillEmpty=true (lúc tự mở modal) chỉ điền những ô ĐANG TRỐNG — không
    // ghi đè ô đã lưu/đã sửa tay trước đó. Bấm nút "Lấy từ hệ thống" thì
    // onlyFillEmpty=false, ghi đè hết vì đó là yêu cầu làm mới rõ ràng.
    // Trước đây gộp chung 1 điều kiện "cả 4 ô đều trống mới tự điền" nên lô
    // nào đã lưu sẵn 3/4 ô (từ lúc field Tên sản phẩm chưa tồn tại) sẽ không
    // bao giờ được tự điền ô Tên sản phẩm mới thêm — sửa lại để mỗi ô tự
    // kiểm tra độc lập.
    async function refillTraceFromSystem(silent, onlyFillEmpty){
      if(!traceCurrentBatch) return;
      if(traceRefillBtn) traceRefillBtn.disabled = true;
      try{
        const [items, varietySuggestion, regionSuggestion, packedDateSuggestion] = await Promise.all([
          getBoxItemsForBatch(traceCurrentBatch),
          getTraceVarietySuggestion(traceCurrentBatch),
          getTraceRegionSuggestion(traceCurrentBatch),
          getTracePackedDateSuggestion(traceCurrentBatch)
        ]);
        let gotAny = false;
        if(items.length){
          if(!onlyFillEmpty || !tracePackingTextInput.value.trim()){
            tracePackingTextInput.value = formatPackingTextFromBoxes(items);
            gotAny = true;
          }
          const productName = productNameFromBoxes(items);
          if(productName && (!onlyFillEmpty || !traceProductNameInput.value.trim())){
            traceProductNameInput.value = productName;
            gotAny = true;
          }
          // Luôn hiện lại danh sách tên cần dịch — không phụ thuộc
          // onlyFillEmpty vì đây chỉ là hiện ô nhập, không ghi đè gì.
          renderTraceTerms(uniqueTermsFromBoxes(items));
        }
        if(varietySuggestion && (!onlyFillEmpty || !traceVarietyInput.value.trim())){
          traceVarietyInput.value = varietySuggestion;
          gotAny = true;
        }
        if(regionSuggestion && (!onlyFillEmpty || !traceRegionInput.value.trim())){
          traceRegionInput.value = regionSuggestion;
          gotAny = true;
        }
        if(traceCurrentBatch.trim() && (!onlyFillEmpty || !traceBatchLabelInput.value.trim())){
          traceBatchLabelInput.value = traceCurrentBatch.trim().toUpperCase();
          gotAny = true;
        }
        const supplierSuggestion = getTraceSupplierSuggestion(traceCurrentBatch);
        if(supplierSuggestion && (!onlyFillEmpty || !traceSupplierNameInput.value.trim())){
          traceSupplierNameInput.value = supplierSuggestion;
          gotAny = true;
        }
        if(packedDateSuggestion && (!onlyFillEmpty || !tracePackedDateInput.value)){
          tracePackedDateInput.value = packedDateSuggestion;
          gotAny = true;
        }
        if(!gotAny && !silent) showErrorToast('Chưa có dữ liệu để tự điền cho lô này — nhập tay các ô bên trên.');
      } catch(err){
        if(!silent) showErrorToast('Không lấy được dữ liệu: ' + (err.message || err));
      } finally {
        if(traceRefillBtn) traceRefillBtn.disabled = false;
      }
    }
    if(traceRefillBtn) traceRefillBtn.addEventListener('click', function(){ refillTraceFromSystem(false, false); });

    // Ẩn/hiện đúng khối QR/mã vạch theo công tắc Bật/Tắt riêng từng loại —
    // mỗi lô chỉ cần dùng 1 loại tuỳ tình huống, không bắt phải xuất cả 2.
    function updateTraceVisibility(){
      if(traceQrVisibleArea) traceQrVisibleArea.style.display = traceQrEnabledToggle.checked ? '' : 'none';
      if(traceBarcodeVisibleArea) traceBarcodeVisibleArea.style.display = traceBarcodeEnabledToggle.checked ? '' : 'none';
    }
    function updateTraceExportedLabels(){
      if(traceQrExportedLabel) traceQrExportedLabel.textContent = traceQrExported ? 'Đã xuất' : '';
      if(traceBarcodeExportedLabel) traceBarcodeExportedLabel.textContent = traceBarcodeExported ? 'Đã xuất' : '';
    }

    function renderTraceQr(code){
      traceQrBox.textContent = '';
      const url = PUBLIC_TRACE_BASE_URL + '?t=' + encodeURIComponent(code);
      tracePublicUrlInput.value = url;
      if(typeof QRCode === 'undefined'){
        traceQrBox.textContent = 'Không tải được thư viện QR — kiểm tra kết nối mạng.';
      } else {
        new QRCode(traceQrBox, { text: url, width: 176, height: 176, correctLevel: QRCode.CorrectLevel.M });
      }
      // Mã vạch giờ chỉ mã hoá ĐÚNG DÃY SỐ (không nhúng nguyên link như
      // trước) — máy quét mã vạch rời chỉ giả lập bàn phím, không tự mở
      // trình duyệt được dù mã có chứa link hay không (giới hạn phần cứng),
      // nên nhúng link không còn ý nghĩa. Khách dùng máy quét rời sẽ quét/gõ
      // dãy số này vào Cổng tra cứu (tra-cuu.html) để ra đúng trang — QR bên
      // trên vẫn nhúng nguyên link như cũ, dành cho ai dùng app quét bằng
      // điện thoại (tự mở được).
      // displayValue:true — giờ NÊN in số ngay dưới vạch (khác trước đây cố
      // tình ẩn vì link chứa mã bí mật) — khách cần đọc được bằng mắt để gõ
      // tay vào Cổng tra cứu khi máy quét lỗi/không có sẵn.
      // margin:20 — "vùng trắng yên tĩnh" 2 bên mép đủ rộng để đầu đọc
      // nhận ra điểm bắt đầu/kết thúc mã; để quá hẹp (như 4 trước đây) là
      // nguyên nhân phổ biến nhất khiến CODE128 quét không ra.
      const barcodeSvg = document.getElementById('trace-barcode-svg');
      if(barcodeSvg){
        if(typeof JsBarcode === 'undefined'){
          barcodeSvg.parentElement.textContent = 'Không tải được thư viện mã vạch — kiểm tra kết nối mạng.';
        } else {
          try{
            // width 2 quét được ở độ phân giải gốc nhưng vạch quá mảnh —
            // test giải mã lại bằng ZXing cho thấy chỉ cần thu nhỏ ảnh PNG
            // xuất ra còn ~80-90% (như khi in tem nhỏ/máy in nhiệt hoặc
            // camera điện thoại chụp lệch nét) là bắt đầu quét trật. width 3
            // chịu được tới ~60% mới trật — chịu đựng tốt hơn hẳn.
            JsBarcode(barcodeSvg, code, { format: 'CODE128', width: 3, height: 90, displayValue: true, fontSize: 26, margin: 20 });
            // JsBarcode tự gán width/height CỐ ĐỊNH bằng px trên thẻ <svg>
            // (attribute, không phải CSS) — attribute này thắng CSS
            // width:100% trong 1 số trình duyệt, làm ảnh không kéo hết
            // khung. Gỡ width/height cố định, chỉ giữ viewBox (JsBarcode
            // cũng tự gán) để trình duyệt tự co giãn đúng theo khung chứa.
            barcodeSvg.removeAttribute('width');
            barcodeSvg.removeAttribute('height');
          } catch(err){
            barcodeSvg.parentElement.textContent = 'Không tạo được mã vạch: ' + err.message;
          }
        }
      }
    }

    // ---- Mã QR riêng theo từng sản phẩm trong lô (khác mã chung cả lô ở
    // trên) — 1 dòng/sản phẩm trong batch_trace_products, mã tra cứu riêng,
    // quét ra chỉ đúng 1 sản phẩm (xem batch_trace_product_public). NCC/Vùng/
    // QC/Vận chuyển vẫn dùng chung của cả lô vì qc_checks/shipments không
    // tách theo sản phẩm — chỉ Sản phẩm/Chủng loại/Số lượng tách riêng.
    function traceFileSafeName(s){
      return String(s || 'ma').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    }

    // Ô dịch có nhãn ngôn ngữ LUÔN HIỆN (không phải placeholder, biến mất
    // ngay khi gõ chữ) — dùng cho các ô EN/ngôn ngữ đặc biệt trong mục "Mã
    // riêng theo từng sản phẩm", tái dùng đúng class .trace-lang-field ở
    // modal chính để đồng bộ giao diện.
    function createTraceLangInput(tagText, value, isExtra){
      const wrap = document.createElement('div');
      wrap.className = 'trace-lang-field' + (isExtra ? ' trace-extra-input' : '');
      wrap.style.cssText = 'width:100%;' + (isExtra ? 'display:none;' : '');
      const tag = document.createElement('span');
      tag.className = 'trace-lang-tag' + (isExtra ? ' trace-extra-tag' : '');
      tag.textContent = tagText;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      wrap.appendChild(tag);
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    function renderTraceProductRow(batchCode, g, existing){
      const row = document.createElement('div');
      row.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:12px;';

      const head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:13px;font-weight:700;';
      nameEl.textContent = g.sanPham;
      head.appendChild(nameEl);

      const toggleLabel = document.createElement('label');
      toggleLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.style.width = 'auto';
      toggle.checked = !!(existing && existing.trace_enabled);
      const toggleText = document.createElement('span');
      toggleText.className = 'muted';
      toggleText.style.fontSize = '12px';
      toggleText.textContent = toggle.checked ? 'Đang công khai' : 'Tắt';
      toggleLabel.appendChild(toggle);
      toggleLabel.appendChild(toggleText);
      head.appendChild(toggleLabel);
      row.appendChild(head);

      const quyCachLabel = g.quyCachs.length ? g.quyCachs.slice().sort(function(a, b){ return a - b; }).map(function(q){ return q + ' trái/thùng'; }).join(', ') : '';

      const sub = document.createElement('div');
      sub.className = 'muted';
      sub.style.cssText = 'font-size:11px;margin-top:2px;';
      sub.textContent = (quyCachLabel ? quyCachLabel + ' · ' : '') + g.totalThung.toLocaleString('vi-VN') + ' thùng';
      row.appendChild(sub);

      // Ngôn ngữ đặc biệt (nếu lô này có chọn ở trên) — chỉ hiện thêm ô dịch
      // riêng (Tên sản phẩm/Chủng loại/Vùng nguyên liệu) khi dropdown chính
      // đang chọn 1 ngôn ngữ, giống hệt cách ô EN vẫn luôn hiện. Mỗi NHÓM
      // trường có 1 nhãn nhỏ cố định phía trên (VD "Chủng loại") — không chỉ
      // dựa vào placeholder (biến mất ngay khi gõ chữ, khiến không phân biệt
      // được ô nào đang là ô gì một khi đã điền xong).
      const extraLang = traceExtraLangSelect ? traceExtraLangSelect.value : '';
      function addMiniLabel(text){
        const lbl = document.createElement('div');
        lbl.textContent = text;
        lbl.style.cssText = 'font-size:10px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;margin-top:10px;';
        row.appendChild(lbl);
      }

      addMiniLabel('Chủng loại');
      const varietyVi = createTraceLangInput('VI', (existing && existing.variety != null) ? existing.variety : g.varieties.join(', '), false);
      varietyVi.wrap.style.marginTop = '2px';
      row.appendChild(varietyVi.wrap);
      const varietyInput = varietyVi.input;

      const varietyExtra = createTraceLangInput(extraLang.toUpperCase(), existing && existing.variety_extra, true);
      row.appendChild(varietyExtra.wrap);
      const varietyExtraInput = varietyExtra.input;

      // Vùng nguyên liệu gợi ý theo ĐÚNG đầu mối đã ra sản phẩm này (không
      // dùng chung địa chỉ gộp cả lô) — vẫn sửa tay được, giống ô Chủng loại,
      // vì địa chỉ đầu mối thường chi tiết hơn mức cần công khai.
      addMiniLabel('Vùng nguyên liệu');
      const regionVi = createTraceLangInput('VI', (existing && existing.region != null) ? existing.region : (g.regionSuggestion || ''), false);
      regionVi.wrap.style.marginTop = '2px';
      row.appendChild(regionVi.wrap);
      const regionInput = regionVi.input;

      const regionEn = createTraceLangInput('EN', existing && existing.region_en, false);
      regionEn.input.placeholder = 'VD: Ben Tre Province';
      row.appendChild(regionEn.wrap);
      const regionEnInput = regionEn.input;

      const regionExtra = createTraceLangInput(extraLang.toUpperCase(), existing && existing.region_extra, true);
      row.appendChild(regionExtra.wrap);
      const regionExtraInput = regionExtra.input;

      addMiniLabel('Tên sản phẩm (bản dịch, tùy chọn)');
      const en = createTraceLangInput('EN', existing && existing.san_pham_en, false);
      en.wrap.style.marginTop = '2px';
      row.appendChild(en.wrap);
      const enInput = en.input;

      const sanPhamExtra = createTraceLangInput(extraLang.toUpperCase(), existing && existing.san_pham_extra, true);
      row.appendChild(sanPhamExtra.wrap);
      const sanPhamExtraInput = sanPhamExtra.input;

      const bodyWrap = document.createElement('div');
      bodyWrap.style.cssText = 'display:none;margin-top:10px;text-align:center;';
      row.appendChild(bodyWrap);

      let code = existing ? existing.public_trace_code : null;

      function saveRow(extra){
        const payload = Object.assign({
          batch: batchCode,
          san_pham: g.sanPham,
          san_pham_en: enInput.value.trim() || null,
          san_pham_extra: extraLang ? (sanPhamExtraInput.value.trim() || null) : null,
          variety: varietyInput.value.trim() || null,
          variety_extra: extraLang ? (varietyExtraInput.value.trim() || null) : null,
          region: regionInput.value.trim() || null,
          region_en: regionEnInput.value.trim() || null,
          region_extra: extraLang ? (regionExtraInput.value.trim() || null) : null,
          quy_cach: quyCachLabel || null,
          total_thung: g.totalThung,
          trace_enabled: toggle.checked,
          public_trace_code: code,
          deleted_at: null
        }, extra || {});
        return sb.from('batch_trace_products').upsert(payload, { onConflict: 'batch,san_pham' });
      }

      // Tự vá lại "quy_cach"/"total_thung" cho các dòng ĐÃ bật công khai từ
      // trước khi 2 cột này được thêm (hoặc trước khi có thêm quy cách/lô
      // hàng mới) — 2 giá trị này luôn tính lại tươi (quyCachLabel/g.totalThung)
      // mỗi lần tải trang nên tự lưu đè lại an toàn, không cần staff phải tự
      // bấm sửa gì để trang công khai hiện đúng "Quy cách đóng gói".
      if(existing && existing.trace_enabled && (existing.quy_cach !== (quyCachLabel || null) || Number(existing.total_thung) !== g.totalThung)){
        // saveRow() trả về query builder của Supabase — có .then nhưng
        // KHÔNG có .catch() (không phải Promise thật) — gọi .catch() thẳng
        // trên nó ném TypeError ngay lập tức, làm cả thẻ sản phẩm này chưa
        // kịp appendChild đã bị văng ra ngoài. Bọc qua Promise.resolve() để
        // có 1 Promise thật rồi mới .catch() được an toàn.
        Promise.resolve(saveRow()).catch(function(err){ console.error('Không tự vá được quy cách:', err); });
      }

      function renderQr(){
        bodyWrap.textContent = '';
        if(!code) return;
        const url = PUBLIC_TRACE_BASE_URL + '?t=' + encodeURIComponent(code);
        const qrBox = document.createElement('div');
        qrBox.style.cssText = 'display:inline-block;padding:8px;background:#fff;border:1px solid var(--border);border-radius:8px;';
        bodyWrap.appendChild(qrBox);
        if(typeof QRCode === 'undefined'){
          qrBox.textContent = 'Không tải được thư viện QR.';
        } else {
          new QRCode(qrBox, { text: url, width: 132, height: 132, correctLevel: QRCode.CorrectLevel.M });
        }
        const dlBtn = document.createElement('button');
        dlBtn.type = 'button';
        dlBtn.className = 'btn-secondary';
        dlBtn.style.cssText = 'font-size:11px;padding:5px 10px;margin-top:8px;';
        dlBtn.innerHTML = '<i class="ti ti-download"></i> Tải QR';
        dlBtn.addEventListener('click', function(){
          const canvas = qrBox.querySelector('canvas');
          if(!canvas){ showErrorToast('Chưa có mã QR để tải.'); return; }
          downloadDataUrl(canvas.toDataURL('image/png'), 'qr-' + traceFileSafeName(batchCode) + '-' + traceFileSafeName(g.sanPham) + '.png');
        });
        bodyWrap.appendChild(dlBtn);
        const urlRow = document.createElement('div');
        urlRow.style.cssText = 'margin-top:6px;font-size:10.5px;color:var(--ink-mute);word-break:break-all;';
        urlRow.textContent = url;
        bodyWrap.appendChild(urlRow);
      }
      bodyWrap.style.display = toggle.checked ? '' : 'none';
      if(toggle.checked) renderQr();

      toggle.addEventListener('change', async function(){
        const turningOn = toggle.checked;
        toggle.disabled = true;
        try{
          if(turningOn && !code) code = genTraceCode();
          const { error } = await saveRow();
          if(error){
            if(/duplicate|unique/i.test(error.message || '')){
              toggle.checked = !turningOn;
              showErrorToast('Mã tra cứu bị trùng — thử lại.');
              return;
            }
            throw error;
          }
          toggleText.textContent = turningOn ? 'Đang công khai' : 'Tắt';
          bodyWrap.style.display = turningOn ? '' : 'none';
          if(turningOn) renderQr();
        } catch(err){
          toggle.checked = !turningOn;
          showErrorToast('Không thể lưu: ' + (err.message || err));
        } finally {
          toggle.disabled = false;
        }
      });

      enInput.addEventListener('change', async function(){
        try{
          const { error } = await saveRow();
          if(error) throw error;
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        }
      });

      varietyInput.addEventListener('change', async function(){
        try{
          const { error } = await saveRow();
          if(error) throw error;
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        }
      });

      regionInput.addEventListener('change', async function(){
        try{
          const { error } = await saveRow();
          if(error) throw error;
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        }
      });

      regionEnInput.addEventListener('change', async function(){
        try{
          const { error } = await saveRow();
          if(error) throw error;
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        }
      });

      [varietyExtraInput, regionExtraInput, sanPhamExtraInput].forEach(function(inputEl){
        inputEl.addEventListener('change', async function(){
          try{
            const { error } = await saveRow();
            if(error) throw error;
          } catch(err){
            showErrorToast('Không thể lưu: ' + (err.message || err));
          }
        });
      });

      traceProductList.appendChild(row);
    }

    async function loadTraceProducts(batchCode){
      if(!traceProductsWrap || !traceProductList) return;
      traceProductList.textContent = '';
      traceProductsWrap.style.display = 'none';
      try{
        const [items, existingRes] = await Promise.all([
          getBoxItemsForBatch(batchCode),
          sb.from('batch_trace_products').select('*').eq('batch', batchCode).is('deleted_at', null)
        ]);
        if(existingRes.error) throw existingRes.error;
        const existingByName = {};
        (existingRes.data || []).forEach(function(r){ existingByName[r.san_pham] = r; });

        const groups = {};
        items.forEach(function(it){
          if(!it.sanPham) return;
          if(!groups[it.sanPham]) groups[it.sanPham] = { sanPham: it.sanPham, totalThung: 0, varieties: [], quyCachs: [], nccs: [] };
          groups[it.sanPham].totalThung += it.soLuong;
          if(it.nguyenLieu && groups[it.sanPham].varieties.indexOf(it.nguyenLieu) === -1) groups[it.sanPham].varieties.push(it.nguyenLieu);
          if(it.quyCach != null && groups[it.sanPham].quyCachs.indexOf(it.quyCach) === -1) groups[it.sanPham].quyCachs.push(it.quyCach);
          (it.nccs || []).forEach(function(n){ if(groups[it.sanPham].nccs.indexOf(n) === -1) groups[it.sanPham].nccs.push(n); });
        });

        const names = Object.keys(groups);
        // Chỉ hiện khu vực này khi lô có TỪ 2 sản phẩm trở lên — 1 sản phẩm
        // thì mã chung ở trên đã đủ dùng, không cần thêm mã riêng làm rối.
        if(names.length < 2) return;

        // Vùng nguyên liệu gợi ý riêng cho TỪNG sản phẩm — theo đúng đầu mối
        // thật đã cung cấp nguyên liệu ra sản phẩm đó, không dùng chung địa
        // chỉ gộp cả lô (dễ ra 2-3 tỉnh dính vào 1 dòng nếu lô có nhiều NCC).
        const allNccNames = Array.from(new Set(Object.values(groups).reduce(function(acc, g){ return acc.concat(g.nccs); }, [])));
        const addressByNcc = {};
        if(allNccNames.length){
          const { data: suppliers } = await sb.from('raw_suppliers').select('name,address').in('name', allNccNames);
          (suppliers || []).forEach(function(s){ if(s.address) addressByNcc[s.name] = s.address; });
        }
        Object.values(groups).forEach(function(g){
          g.regionSuggestion = Array.from(new Set(g.nccs.map(function(n){ return addressByNcc[n]; }).filter(Boolean))).join('; ');
        });

        traceProductsWrap.style.display = '';
        // Mỗi thẻ sản phẩm dựng riêng trong try/catch của chính nó — trước
        // đây 1 sản phẩm lỗi khi dựng thẻ (throw) sẽ làm forEach dừng luôn,
        // các sản phẩm sau nó lặng lẽ KHÔNG hiện thẻ (không báo lỗi gì, chỉ
        // console.error 1 dòng chung chung ở catch ngoài) — nhìn như thiếu
        // mã QR mà không rõ vì sao. Giờ lỗi ở 1 sản phẩm không kéo sập các
        // sản phẩm còn lại, và có dòng đỏ báo rõ đang lỗi thẻ nào.
        names.sort(function(a, b){ return a.localeCompare(b, 'vi'); }).forEach(function(name){
          try{
            renderTraceProductRow(batchCode, groups[name], existingByName[name]);
          } catch(rowErr){
            console.error('Không dựng được thẻ mã QR cho sản phẩm "' + name + '":', rowErr);
            const errEl = document.createElement('div');
            errEl.style.cssText = 'border:1px solid var(--red);background:var(--red-bg);color:var(--red);border-radius:10px;padding:10px 12px;font-size:12px;';
            errEl.textContent = 'Lỗi khi hiện mã cho "' + name + '": ' + (rowErr.message || rowErr);
            traceProductList.appendChild(errEl);
          }
        });
      } catch(err){
        console.error('Không tải được mã QR theo sản phẩm:', err);
      }
    }

    async function openTraceModal(batchCode){
      traceCurrentBatch = batchCode;
      traceCurrentCode = null;
      traceModalTitle.textContent = 'Truy xuất nguồn gốc — ' + batchCode;
      traceForm.reset();
      traceTermTranslations = {};
      traceTermTranslationsExtra = {};
      toggleTraceExtraFields();
      traceTermsGroup.style.display = 'none';
      traceTermsList.textContent = '';
      tracePublicSection.style.display = 'none';
      traceCodeWrap.style.display = 'none';
      traceQrWrap.style.display = 'none';
      traceOverlay.classList.add('active');
      try{
        const { data, error } = await sb.from('batch_info').select('trace_batch_label,trace_product_name,trace_product_name_en,trace_product_name_extra,trace_supplier_name,trace_supplier_name_en,trace_supplier_name_extra,trace_importer_name,trace_importer_name_en,trace_importer_name_extra,trace_variety,trace_variety_en,trace_variety_extra,trace_region,trace_region_en,trace_region_extra,trace_packed_date,trace_packing_text,trace_packing_terms_en,trace_packing_terms_extra,trace_extra_lang,trace_enabled,public_trace_code,trace_qr_enabled,trace_barcode_enabled,trace_qr_exported,trace_barcode_exported').eq('batch', batchCode).maybeSingle();
        if(error) throw error;
        const bi = data || {};
        traceBatchLabelInput.value = bi.trace_batch_label || '';
        if(traceExtraLangSelect) traceExtraLangSelect.value = bi.trace_extra_lang || '';
        traceProductNameInput.value = bi.trace_product_name || '';
        traceProductNameEnInput.value = bi.trace_product_name_en || '';
        if(traceProductNameExtraInput) traceProductNameExtraInput.value = bi.trace_product_name_extra || '';
        traceSupplierNameInput.value = bi.trace_supplier_name || '';
        traceSupplierNameEnInput.value = bi.trace_supplier_name_en || '';
        if(traceSupplierNameExtraInput) traceSupplierNameExtraInput.value = bi.trace_supplier_name_extra || '';
        traceImporterNameInput.value = bi.trace_importer_name || '';
        traceImporterNameEnInput.value = bi.trace_importer_name_en || '';
        if(traceImporterNameExtraInput) traceImporterNameExtraInput.value = bi.trace_importer_name_extra || '';
        traceVarietyInput.value = bi.trace_variety || '';
        traceVarietyEnInput.value = bi.trace_variety_en || '';
        if(traceVarietyExtraInput) traceVarietyExtraInput.value = bi.trace_variety_extra || '';
        traceRegionInput.value = bi.trace_region || '';
        traceRegionEnInput.value = bi.trace_region_en || '';
        if(traceRegionExtraInput) traceRegionExtraInput.value = bi.trace_region_extra || '';
        tracePackedDateInput.value = bi.trace_packed_date || '';
        tracePackingTextInput.value = bi.trace_packing_text || '';
        traceTermTranslations = bi.trace_packing_terms_en || {};
        traceTermTranslationsExtra = bi.trace_packing_terms_extra || {};
        toggleTraceExtraFields();
        refillTraceFromSystem(true, true);
        traceCurrentCode = bi.public_trace_code || null;
        tracePublicSection.style.display = '';
        traceEnabledToggle.checked = !!bi.trace_enabled;
        traceEnabledLabel.textContent = bi.trace_enabled ? 'Đang công khai' : 'Tắt';
        // NULL (dữ liệu cũ trước khi có 2 công tắc riêng) coi như đang bật —
        // giữ đúng hành vi trước đây (QR/mã vạch luôn hiện).
        traceQrEnabledToggle.checked = bi.trace_qr_enabled !== false;
        traceBarcodeEnabledToggle.checked = bi.trace_barcode_enabled !== false;
        traceQrExported = !!bi.trace_qr_exported;
        traceBarcodeExported = !!bi.trace_barcode_exported;
        updateTraceExportedLabels();
        updateTraceVisibility();
        if(bi.trace_enabled && traceCurrentCode){
          traceCodeWrap.style.display = '';
          traceCodeInput.value = traceCurrentCode;
          traceQrWrap.style.display = '';
          renderTraceQr(traceCurrentCode);
        }
        loadTraceProducts(batchCode);
      } catch(err){
        showErrorToast('Không tải được dữ liệu: ' + (err.message || err));
      }
    }
    function closeTraceModal(){
      traceOverlay.classList.remove('active');
      traceForm.reset();
      traceCurrentBatch = null;
      traceCurrentCode = null;
    }
    if(traceCloseBtn) traceCloseBtn.addEventListener('click', closeTraceModal);
    if(traceCancelBtn) traceCancelBtn.addEventListener('click', closeTraceModal);
    if(traceOverlay) traceOverlay.addEventListener('click', function(e){ if(e.target === traceOverlay) closeTraceModal(); });

    if(traceForm){
      traceForm.addEventListener('submit', async function(e){
        e.preventDefault();
        if(!traceCurrentBatch) return;
        const originalLabel = traceSubmitBtn.textContent;
        traceSubmitBtn.disabled = true;
        traceSubmitBtn.textContent = 'Đang lưu...';
        try{
          const extraLangVal = traceExtraLangSelect ? traceExtraLangSelect.value : '';
          const { error } = await sb.from('batch_info').upsert({
            batch: traceCurrentBatch,
            trace_batch_label: traceBatchLabelInput.value.trim().toUpperCase() || null,
            trace_extra_lang: extraLangVal || null,
            trace_product_name: traceProductNameInput.value.trim() || null,
            trace_product_name_en: traceProductNameEnInput.value.trim() || null,
            trace_product_name_extra: extraLangVal ? (traceProductNameExtraInput.value.trim() || null) : null,
            trace_supplier_name: traceSupplierNameInput.value.trim() || null,
            trace_supplier_name_en: traceSupplierNameEnInput.value.trim() || null,
            trace_supplier_name_extra: extraLangVal ? (traceSupplierNameExtraInput.value.trim() || null) : null,
            trace_importer_name: traceImporterNameInput.value.trim() || null,
            trace_importer_name_en: traceImporterNameEnInput.value.trim() || null,
            trace_importer_name_extra: extraLangVal ? (traceImporterNameExtraInput.value.trim() || null) : null,
            trace_variety: traceVarietyInput.value.trim() || null,
            trace_variety_en: traceVarietyEnInput.value.trim() || null,
            trace_variety_extra: extraLangVal ? (traceVarietyExtraInput.value.trim() || null) : null,
            trace_region: traceRegionInput.value.trim() || null,
            trace_region_en: traceRegionEnInput.value.trim() || null,
            trace_region_extra: extraLangVal ? (traceRegionExtraInput.value.trim() || null) : null,
            trace_packed_date: tracePackedDateInput.value || null,
            trace_packing_text: tracePackingTextInput.value.trim() || null,
            trace_packing_terms_en: readTraceTerms(),
            trace_packing_terms_extra: extraLangVal ? readTraceTermsExtra() : {},
            // Dọn field cũ (đã bỏ dùng, thay bằng trace_packing_terms_en ở
            // trên) — tránh còn sót giá trị cũ làm trang công khai đọc nhầm.
            trace_packing_text_en: null
          }, { onConflict: 'batch' });
          if(error) throw error;
          closeTraceModal();
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        } finally {
          traceSubmitBtn.disabled = false;
          traceSubmitBtn.textContent = originalLabel;
        }
      });
    }

    if(traceEnabledToggle){
      traceEnabledToggle.addEventListener('change', async function(){
        if(!traceCurrentBatch) return;
        const turningOn = traceEnabledToggle.checked;
        traceEnabledToggle.disabled = true;
        try{
          if(turningOn && !traceCurrentCode) traceCurrentCode = genTraceCode();
          const { error } = await sb.from('batch_info').upsert({
            batch: traceCurrentBatch,
            trace_enabled: turningOn,
            public_trace_code: traceCurrentCode
          }, { onConflict: 'batch' });
          if(error){
            // Trùng mã (lô khác đã dùng cùng tên viết hoa, hiếm khi xảy ra
            // vì tên lô vốn đã là khoá duy nhất trong hệ thống) — báo rõ
            // thay vì để lỗi kỹ thuật khó hiểu.
            if(/duplicate|unique/i.test(error.message || '')){
              traceEnabledToggle.checked = !turningOn;
              showErrorToast('Mã "' + traceCurrentCode + '" đã được lô khác dùng — mở modal đó và đổi mã tra cứu trước.');
              return;
            }
            throw error;
          }
          traceEnabledLabel.textContent = turningOn ? 'Đang công khai' : 'Tắt';
          if(turningOn){
            traceCodeWrap.style.display = '';
            traceCodeInput.value = traceCurrentCode;
            traceQrWrap.style.display = '';
            renderTraceQr(traceCurrentCode);
            updateTraceVisibility();
          } else {
            traceCodeWrap.style.display = 'none';
            traceQrWrap.style.display = 'none';
          }
        } catch(err){
          traceEnabledToggle.checked = !turningOn;
          showErrorToast('Không thể lưu: ' + (err.message || err));
        } finally {
          traceEnabledToggle.disabled = false;
        }
      });
    }

    // Bật/Tắt riêng từng loại mã — mỗi lô chỉ cần dùng 1 loại tuỳ tình
    // huống thực tế (VD: QR cho khách lẻ, mã vạch cho kho/logistics nội
    // bộ), không bắt buộc phải xuất cả 2 cùng lúc.
    function bindTraceTypeToggle(toggleEl, column){
      if(!toggleEl) return;
      toggleEl.addEventListener('change', async function(){
        if(!traceCurrentBatch) return;
        const val = toggleEl.checked;
        toggleEl.disabled = true;
        try{
          const payload = { batch: traceCurrentBatch };
          payload[column] = val;
          const { error } = await sb.from('batch_info').upsert(payload, { onConflict: 'batch' });
          if(error) throw error;
          updateTraceVisibility();
        } catch(err){
          toggleEl.checked = !val;
          showErrorToast('Không thể lưu: ' + (err.message || err));
        } finally {
          toggleEl.disabled = false;
        }
      });
    }
    bindTraceTypeToggle(traceQrEnabledToggle, 'trace_qr_enabled');
    bindTraceTypeToggle(traceBarcodeEnabledToggle, 'trace_barcode_enabled');

    // Tên file an toàn từ tên lô — bỏ ký tự lạ, giữ lại chữ/số/gạch ngang để
    // không lỗi khi lưu trên các hệ điều hành khác nhau.
    function traceFileSafeBatch(){
      return (traceCurrentBatch || 'ma-truy-xuat').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
    }
    function downloadDataUrl(dataUrl, filename){
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // qrcodejs vẽ sẵn 1 <canvas> bên trong (kèm <img> ẩn dự phòng cho trình
    // duyệt không hỗ trợ canvas) — lấy thẳng canvas.toDataURL() là đủ, không
    // cần tự vẽ lại.
    function exportTraceQrImage(){
      const canvas = traceQrBox.querySelector('canvas');
      if(!canvas){ showErrorToast('Chưa có mã QR để xuất — bật "Mã QR" và đợi hiện ra trước.'); return; }
      downloadDataUrl(canvas.toDataURL('image/png'), 'qr-' + traceFileSafeBatch() + '.png');
    }
    // Mã vạch vẽ ra <svg> (vector) — chuyển qua canvas rồi mới xuất PNG,
    // dùng đúng kích thước GỐC (chưa bị CSS max-width thu nhỏ trên màn
    // hình) để ảnh tải về vẫn nét khi in.
    function exportTraceBarcodeImage(){
      const svg = document.getElementById('trace-barcode-svg');
      if(!svg || !svg.childElementCount){ showErrorToast('Chưa có mã vạch để xuất — bật "Mã vạch" và đợi hiện ra trước.'); return; }
      const width = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal.width : svg.width.baseVal.value;
      const height = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height ? svg.viewBox.baseVal.height : svg.height.baseVal.value;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = function(){
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(svgUrl);
        downloadDataUrl(canvas.toDataURL('image/png'), 'mavach-' + traceFileSafeBatch() + '.png');
      };
      img.onerror = function(){
        URL.revokeObjectURL(svgUrl);
        showErrorToast('Không tạo được ảnh mã vạch để tải về.');
      };
      img.src = svgUrl;
    }

    // Đánh dấu "đã xuất" — staff bấm khi đã thật sự in/dùng mã đó, KHÔNG tự
    // động chỉ vì mở modal xem thử. Trạng thái này chỉ dùng để cảnh báo khi
    // sau này đổi mã tra cứu (xem btn-save-trace-code). Bấm xong luôn kèm
    // tải ảnh PNG về để in ngay, không cần thao tác riêng.
    function bindTraceExportBtn(btnEl, column, setFlag, downloadImage){
      if(!btnEl) return;
      btnEl.addEventListener('click', async function(){
        if(!traceCurrentBatch) return;
        btnEl.disabled = true;
        try{
          const payload = { batch: traceCurrentBatch };
          payload[column] = true;
          const { error } = await sb.from('batch_info').upsert(payload, { onConflict: 'batch' });
          if(error) throw error;
          setFlag(true);
          updateTraceExportedLabels();
          if(downloadImage) downloadImage();
        } catch(err){
          showErrorToast('Không thể lưu: ' + (err.message || err));
        } finally {
          btnEl.disabled = false;
        }
      });
    }
    bindTraceExportBtn(traceExportQrBtn, 'trace_qr_exported', function(v){ traceQrExported = v; }, exportTraceQrImage);
    bindTraceExportBtn(traceExportBarcodeBtn, 'trace_barcode_exported', function(v){ traceBarcodeExported = v; }, exportTraceBarcodeImage);

    // Chỉ điền lại ô — vẫn phải bấm "Lưu mã" mới thật sự đổi, để staff kịp
    // xem qua mã mới trước khi link cũ ngừng hoạt động.
    if(traceRegenCodeBtn){
      traceRegenCodeBtn.addEventListener('click', async function(){
        const ok = await confirmDialog('Tạo mã ngẫu nhiên mới thay cho mã hiện tại? Vẫn phải bấm "Lưu mã" mới thật sự áp dụng.', { title: 'Tạo mã mới?', okLabel: 'Tạo mã mới', danger: false });
        if(!ok) return;
        traceCodeInput.value = genTraceCode();
      });
    }

    // Đổi mã tra cứu thủ công — chủ yếu để staff thay mã dễ đoán/lỡ lộ bằng
    // mã khác, không phải thao tác dùng thường xuyên.
    if(traceSaveCodeBtn){
      traceSaveCodeBtn.addEventListener('click', async function(){
        if(!traceCurrentBatch) return;
        const newCode = traceCodeInput.value.trim();
        if(!newCode){ showErrorToast('Mã tra cứu không được để trống.'); return; }
        // Mã thật sự đổi (không chỉ gõ lại y hệt) VÀ ít nhất 1 loại đã được
        // đánh dấu "đã xuất" (đã in/dùng thật) — cảnh báo rõ trước khi đổi,
        // vì tem cũ đã phát ra sẽ không còn quét ra đúng trang nữa, ảnh
        // hưởng tới các bên trong chuỗi cung ứng đã nhận hàng có tem đó.
        const codeActuallyChanges = newCode !== traceCurrentCode;
        if(codeActuallyChanges && (traceQrExported || traceBarcodeExported)){
          const exportedList = [traceQrExported ? 'QR' : null, traceBarcodeExported ? 'mã vạch' : null].filter(Boolean).join(' và ');
          const ok = await confirmDialog(
            'Mã ' + exportedList + ' của lô này đã được đánh dấu "Đã xuất" — có thể đã in/dán lên hàng thật. Đổi mã tra cứu bây giờ sẽ làm tem cũ KHÔNG CÒN quét ra đúng trang nữa, có thể ảnh hưởng tới các bên trong chuỗi cung ứng đã nhận hàng có tem đó. Vẫn muốn đổi?',
            { title: 'Cảnh báo: mã đã xuất', okLabel: 'Vẫn đổi mã', danger: true }
          );
          if(!ok) return;
        }
        traceSaveCodeBtn.disabled = true;
        try{
          const payload = {
            batch: traceCurrentBatch,
            public_trace_code: newCode
          };
          // Mã mới chưa từng được in/phát ra — trạng thái "đã xuất" của mã
          // cũ không còn áp dụng, reset lại cả 2 để phản ánh đúng thực tế.
          if(codeActuallyChanges){
            payload.trace_qr_exported = false;
            payload.trace_barcode_exported = false;
          }
          const { error } = await sb.from('batch_info').upsert(payload, { onConflict: 'batch' });
          if(error) throw error;
          traceCurrentCode = newCode;
          if(codeActuallyChanges){
            traceQrExported = false;
            traceBarcodeExported = false;
            updateTraceExportedLabels();
          }
          renderTraceQr(traceCurrentCode);
        } catch(err){
          // Vi phạm unique constraint nếu trùng mã lô khác — báo rõ thay vì
          // để lỗi kỹ thuật khó hiểu.
          const msg = /duplicate|unique/i.test(err.message || '') ? 'Mã này đã được lô khác dùng — chọn mã khác.' : (err.message || err);
          showErrorToast('Không thể lưu mã: ' + msg);
        } finally {
          traceSaveCodeBtn.disabled = false;
        }
      });
    }

    if(traceCopyBtn){
      traceCopyBtn.addEventListener('click', function(){
        tracePublicUrlInput.select();
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(tracePublicUrlInput.value).catch(function(){});
        } else {
          document.execCommand('copy');
        }
      });
    }

    summaryTbody.addEventListener('click', function(e){
      const traceBtn = e.target.closest('.trace-btn');
      if(traceBtn){
        const tr = traceBtn.closest('tr');
        if(tr && tr.dataset.batch) goToBatchTrace(tr.dataset.batch);
        return;
      }
      const publicTraceBtn = e.target.closest('.public-trace-open-btn');
      if(publicTraceBtn){
        const tr = publicTraceBtn.closest('tr');
        if(tr && tr.dataset.batch) openTraceModal(tr.dataset.batch);
        return;
      }
      const orderEditBtn = e.target.closest('.order-edit-btn');
      if(orderEditBtn){
        const tr = orderEditBtn.closest('tr');
        if(tr && tr.dataset.batch) openOrderModal(tr.dataset.batch);
        return;
      }
      // Nút "Kiểm chi tiết" trên từng dòng — mở khối nhập với Ngành hàng +
      // Sản phẩm điền + khóa sẵn theo đúng dòng đó (xử lý TRƯỚC .row-edit-btn
      // vì nút này cũng mang class đó).
      const qcDetailBtn = e.target.closest('.qc-detail-btn');
      if(qcDetailBtn){
        const tr = qcDetailBtn.closest('tr');
        if(tr && tr.dataset.batch){
          openBatchModal(tr.dataset.batch, {
            category: qcDetailBtn.dataset.qccat || null,
            sanPham: qcDetailBtn.dataset.sanpham || null
          });
        }
        return;
      }
      const btn = e.target.closest('.row-edit-btn');
      if(!btn) return;
      const tr = btn.closest('tr');
      if(tr && tr.dataset.batch) openBatchModal(tr.dataset.batch);
    });

    pickTbody.addEventListener('click', function(e){
      // Bấm vào ô nhập Ngày kiểm hàng / QC thì KHÔNG mở/đóng khối nhập.
      if(e.target.closest('.qc-assign-date, .qc-assign-qc')) return;
      const tr = e.target.closest('tr[data-batch]');
      if(!tr) return;
      const batchCode = tr.dataset.batch;
      const sanPham = tr.dataset.sanpham || null;
      if(currentBatch === batchCode && currentSanPham === sanPham && detailPanel.style.display !== 'none') closeBatchModal();
      // Dòng có tên sản phẩm luôn là hàng Dừa (batchProductList lấy từ Xưởng)
      // — khóa sẵn Ngành hàng + Sản phẩm theo đúng dòng. Dòng "—" không khóa.
      else openBatchModal(batchCode, sanPham ? { category: 'Dừa', sanPham: sanPham } : {});
    });

    // Nhập tay "Ngày kiểm hàng" / tên QC ngay trong bảng → lưu vào qc_assignments.
    pickTbody.addEventListener('change', function(e){
      const tr = e.target.closest('tr[data-batch]');
      if(!tr) return;
      const batchCode = tr.dataset.batch;
      const sanPham = tr.dataset.sanpham || '';
      if(e.target.classList.contains('qc-assign-date')){
        upsertAssignment(batchCode, sanPham, { inspection_date: e.target.value || null });
      } else if(e.target.classList.contains('qc-assign-qc')){
        upsertAssignment(batchCode, sanPham, { qc_inspector: e.target.value.trim() || null });
      }
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
        // Sửa 1 lượt kiểm đã có: mở khóa, cho chỉnh tự do; nạp đúng sản phẩm
        // của bản ghi (kể cả sản phẩm cũ không còn trong danh sách lô).
        presetCategory = null; presetSanPham = null; sanPhamLocked = false;
        categorySelect.value = tr.dataset.category || 'Dừa';
        const sp = tr.dataset.sanPham || '';
        populateSanPhamOptions(currentBatch, sp);
        if(sp && sanPhamSelect && !Array.prototype.some.call(sanPhamSelect.options, function(o){ return o.value === sp; })){
          const opt = document.createElement('option');
          opt.value = sp; opt.textContent = sp;
          sanPhamSelect.appendChild(opt);
          sanPhamSelect.value = sp;
        }
        updateSanPhamVisibility();
        // Bản ghi có sản phẩm cụ thể nhưng lô ≤ 1 sản phẩm (field bị ẩn) —
        // vẫn hiện ra để người sửa thấy đang gắn vào sản phẩm nào.
        if(sp && sanPhamGroup) sanPhamGroup.style.display = '';
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
      // Bảng "Chọn lô để kiểm" tách theo (lô × sản phẩm), nên 2 ô đếm này
      // cũng đếm theo (lô × sản phẩm) — 1 lô nhiều sản phẩm cùng chờ = nhiều mục.
      const pairKey = function(d){ return d.batch_code + '::' + (d.san_pham || ''); };
      if(statToday){
        statToday.textContent = String(new Set(
          allQcRows.filter(function(d){ return (d.created_at || '').slice(0, 10) === todayStr; }).map(pairKey)
        ).size);
      }
      if(statPending){
        statPending.textContent = String(new Set(
          allQcRows.filter(function(d){ return d.result === 'Chờ xác nhận'; }).map(pairKey)
        ).size);
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
        const [rawRes, poRes, qcRes, batchInfoRes, stockRes, productsRes, asgRes] = await Promise.all([
          sb.from('raw_batches').select('*, factory_batches(*, factory_batch_boxes(*), factory_batch_waste(*))').is('deleted_at', null),
          sb.from('purchase_orders').select('*').is('deleted_at', null),
          sb.from('qc_checks').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          sb.from('batch_info').select('*'),
          sb.from('factory_finished_stock').select('*').is('deleted_at', null),
          sb.from('batch_info_products').select('*'),
          sb.from('qc_assignments').select('*')
        ]);
        [rawRes, poRes, qcRes, stockRes].forEach(function(r){ if(r.error) throw r.error; });
        // batch_info/batch_info_products/qc_assignments có thể chưa tồn tại
        // nếu chưa chạy migration — bỏ qua lỗi đó thay vì làm hỏng bảng.
        const batchInfoRows = batchInfoRes.error ? [] : (batchInfoRes.data || []);
        const productsRows = productsRes.error ? [] : (productsRes.data || []);
        allAssignments = asgRes.error ? [] : (asgRes.data || []);

        allQcRows = qcRes.data || [];
        batchSummaries = buildSummaries(rawRes.data || [], poRes.data || [], allQcRows, batchInfoRows, stockRes.data || [], productsRows);
        sharedBatchSummaries = batchSummaries;
        // Đổ lại gợi ý tên lô cho các ô nhập ở Vùng nguyên liệu/Nhà cung cấp
        // ngay khi danh sách lô đổi — nguồn sự thật vẫn là bảng tổng hợp này.
        fillDatalist('dl-batch-names', knownBatchNames());
        notifyBatchSummaryChanged();
        populateOrderPeriodSelect();
        renderSummary();
        populatePickPeriodSelect();
        populateQcNamesDatalist();
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
      const sanPham = category === 'Dừa' ? (fieldVal('qc-sanpham') || null) : null;

      // Lô Dừa làm ra nhiều sản phẩm mà không chọn sản phẩm thì kết quả sẽ
      // không gắn được vào dòng nào ở bảng tổng hợp (mỗi dòng lọc theo đúng
      // sản phẩm) — chặn sớm để tránh nhập nhầm rồi không thấy kết quả đâu.
      const b = batchSummaries[currentBatch];
      const needsProduct = category === 'Dừa' && batchProductList(b).length > 1;
      if(needsProduct && !sanPham){
        showErrorToast('Lô này làm ra nhiều sản phẩm — vui lòng chọn sản phẩm cần ghi kết quả kiểm.');
        return;
      }

      const payload = {
        batch_code: currentBatch,
        category: category,
        san_pham: sanPham,
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
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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
    // Gán thật bên trong khối "if(orderOverlay && orderForm)" bên dưới —
    // khai báo sớm ở đây để summaryTbody (nút Sửa trên từng dòng, đăng ký
    // listener sớm hơn trong file) gọi được.
    let openOrderModal = function(){};

    // Danh sách "Sản phẩm & số lượng dự kiến" động trong modal — 1 đơn có
    // thể gồm nhiều sản phẩm, mỗi dòng ghi số lượng dự kiến riêng thay vì
    // gộp chung 1 ô text (cùng pattern +/- list với Xưởng sản xuất/Sơ chế).
    const ordProductsListEl = document.getElementById('ord-products-list');
    const ordAddProductBtn = document.getElementById('btn-ord-add-product');

    function createOrderProductRow(sanPham, soLuong){
      if(!ordProductsListEl) return;
      const row = document.createElement('div');
      row.className = 'ord-product-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
      const sanPhamInput = document.createElement('input');
      sanPhamInput.type = 'text';
      sanPhamInput.className = 'ord-product-name';
      sanPhamInput.placeholder = 'VD: Dừa xiêm xanh gọt vỏ';
      sanPhamInput.value = sanPham || '';
      sanPhamInput.style.flex = '1.4';
      const soLuongInput = document.createElement('input');
      soLuongInput.type = 'text';
      soLuongInput.className = 'ord-product-qty';
      soLuongInput.placeholder = 'VD: 10.000 trái';
      soLuongInput.value = soLuong || '';
      soLuongInput.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa sản phẩm');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); });
      row.appendChild(sanPhamInput);
      row.appendChild(soLuongInput);
      row.appendChild(removeBtn);
      ordProductsListEl.appendChild(row);
    }
    function resetOrderProductRows(){
      if(!ordProductsListEl) return;
      ordProductsListEl.textContent = '';
      createOrderProductRow('', '');
    }
    function readOrderProductRows(){
      if(!ordProductsListEl) return [];
      return Array.from(ordProductsListEl.querySelectorAll('.ord-product-row')).map(function(row){
        return {
          sanPham: (row.querySelector('.ord-product-name').value || '').trim(),
          soLuong: (row.querySelector('.ord-product-qty').value || '').trim()
        };
      }).filter(function(r){ return r.sanPham; });
    }
    if(ordAddProductBtn) ordAddProductBtn.addEventListener('click', function(){ createOrderProductRow(); });

    // editingOrderBatch = null → modal đang ở chế độ "Thêm đơn hàng" (tên
    // lô gõ tự do). Khác null → đang sửa đúng lô đó — khóa lại ô "Tên đơn /
    // lô hàng" vì đây là khóa nối dữ liệu với Vùng nguyên liệu/QC/Logistics,
    // đổi tên ở đây sẽ làm đơn "tách đôi" khỏi dữ liệu cũ chứ không phải đổi
    // tên đơn đang có.
    let editingOrderBatch = null;
    const orderModalTitle = document.getElementById('add-order-modal-title');
    const ordBatchInput = document.getElementById('ord-batch');

    if(orderOverlay && orderForm){
      const closeOrderModal = function(){
        orderOverlay.classList.remove('active');
        orderForm.reset();
        resetOrderProductRows();
        const group = document.getElementById('ord-loai-noi-dia-group');
        if(group) group.style.display = 'none';
        editingOrderBatch = null;
        if(ordBatchInput) ordBatchInput.disabled = false;
      };

      openOrderModal = function(batchToEdit){
        orderForm.reset();
        resetOrderProductRows();
        const group = document.getElementById('ord-loai-noi-dia-group');
        if(group) group.style.display = 'none';

        const b = batchToEdit ? batchSummaries[batchToEdit] : null;
        editingOrderBatch = b ? batchToEdit : null;

        if(orderModalTitle) orderModalTitle.textContent = editingOrderBatch ? 'Sửa đơn hàng' : 'Thêm đơn hàng';
        orderSubmitBtn.textContent = editingOrderBatch ? 'Lưu thay đổi' : 'Thêm đơn hàng';

        if(b){
          if(ordBatchInput){ ordBatchInput.value = b.batch; ordBatchInput.disabled = true; }
          document.getElementById('ord-khach-hang').value = b.khachHang || '';
          const hinhThucSelect = document.getElementById('ord-hinh-thuc');
          hinhThucSelect.value = b.saleType || '';
          if(group) group.style.display = b.saleType === 'Nội địa' ? '' : 'none';
          document.getElementById('ord-loai-noi-dia').value = b.domesticType || '';
          document.getElementById('ord-ngay-giao').value = b.ngayGiaoMongMuon || '';
          if(b.products && b.products.length){
            ordProductsListEl.textContent = '';
            b.products.forEach(function(p){ createOrderProductRow(p.sanPham, p.soLuongDuKien); });
          }
        } else if(ordBatchInput){
          ordBatchInput.disabled = false;
        }

        orderOverlay.classList.add('active');
      };

      if(orderOpenBtn){
        orderOpenBtn.addEventListener('click', function(){ openOrderModal(null); });
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
          showErrorToast('Vui lòng nhập Tên đơn / lô hàng.');
          return;
        }
        const hinhThuc = document.getElementById('ord-hinh-thuc').value || null;
        const products = readOrderProductRows();
        const payload = {
          batch: batch,
          khach_hang: document.getElementById('ord-khach-hang').value.trim() || null,
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
          // Đồng bộ danh sách sản phẩm bằng xóa hết rồi chèn lại đúng danh
          // sách hiện có trong form — cùng pattern với factory_batch_boxes ở
          // Xưởng Ba Phi (đơn giản hơn diff từng dòng đã đổi/thêm/xóa). Gõ
          // lại tên đơn đã có (upsert batch_info ở trên) sẽ thay hẳn danh
          // sách sản phẩm cũ bằng danh sách mới trong form.
          const { error: delErr } = await sb.from('batch_info_products').delete().eq('batch', batch);
          if(delErr) throw delErr;
          if(products.length){
            const { error: insErr } = await sb.from('batch_info_products').insert(products.map(function(p){
              return { batch: batch, san_pham: p.sanPham, so_luong_du_kien: p.soLuong || null };
            }));
            if(insErr) throw insErr;
          }
          await loadAll();
          closeOrderModal();
        } catch(err){
          showErrorToast('Không thể lưu đơn hàng: ' + err.message);
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
    const STAGES = ['Kho nội địa', 'Cảng đi', 'Trên biển', 'Thông quan', 'Cảng đến', 'Giao khách hàng', 'Khách đã nhận hàng'];
    const STAGE_ICONS = {
      'Kho nội địa': 'ti-building-warehouse',
      'Cảng đi': 'ti-anchor',
      'Trên biển': 'ti-ship',
      'Thông quan': 'ti-clipboard-check',
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
      // Lô chưa có ETD lẫn periodDate — luôn hiện, đừng ẩn khỏi danh sách.
      if(!p) return true;
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
    // Dùng chung với STAGES (timeline "lô nổi bật") — trước đây 2 danh sách
    // tách riêng và lệch nhau (STAGES thiếu "Thông quan"), khiến timeline vẽ
    // sai vị trí cho lô đang ở giai đoạn đó.
    const STAGE_OPTIONS = STAGES;
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
        showErrorToast('Vui lòng nhập Số container trước.');
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
      cellCount: 8,
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
        tr.dataset.ghiChu = d.ghi_chu || '';

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

        // Trễ hẹn giao = Ngày khách nhận hàng sau ETA; chưa nhận mà hôm nay
        // đã qua ETA (và chưa chuyển sang giai đoạn cuối) cũng tính trễ —
        // để phát hiện sớm, không phải đợi tới lúc khách nhận mới biết.
        // Ghi chú thiếu trong trường hợp trễ thì nhắc màu cam, cùng cách
        // đang làm ở Xưởng sản xuất/QC.
        const isLate = !!d.eta && (d.received_date ? d.received_date > d.eta : (d.stage !== 'Khách đã nhận hàng' && todayStr() > d.eta));
        tr.cells[7].textContent = '';
        tr.cells[7].className = 'muted';
        tr.cells[7].style.textAlign = 'left';
        if(d.ghi_chu){
          tr.cells[7].textContent = d.ghi_chu;
        } else if(isLate){
          tr.cells[7].textContent = 'Chưa ghi chú';
          tr.cells[7].className = 'warn-text';
        } else {
          tr.cells[7].textContent = '—';
        }
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
        document.getElementById('ship-ghichu').value = tr.dataset.ghiChu || '';
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
          is_featured: document.getElementById('ship-featured').checked,
          ghi_chu: fieldVal('ship-ghichu') || null
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
      // Lô chưa có periodDate — luôn hiện, đừng ẩn khỏi checklist chứng từ.
      if(!p) return true;
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
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshList();
          notifyFeedbacksChanged();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
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
      // Lô chưa có periodDate — luôn hiện, đừng ẩn khỏi danh sách feedback.
      if(!p) return true;
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
        showErrorToast('Vui lòng chọn Lô hàng.');
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
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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
    const FACTORY_COLS = 9;
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
    // Số lượng nhập (trái) của lượt đang mở trong modal — dùng cho khối "Cân
    // đối lô" và để chặn Lưu khi tổng khai vượt số nhập (Thất thoát âm).
    let editingInputQty = null;
    // Phần "Tồn NL chưa SX" của lượt đang mở đã bị chuyển/bán/dạt đi ở "Xử lý
    // hàng tồn & rớt" — chặn không cho hạ ô "Tồn NL chưa SX" xuống dưới mức này.
    let editingMovedTonNl = 0;
    let editingTonNlStored = null;   // ton_nl_qty đang lưu của lượt đang mở
    // raw_batches (kèm factory_batches lồng) của lần render gần nhất, tra theo
    // id — nút Sửa ở bảng chỉ mang data-raw-id, lấy dữ liệu điền form từ đây
    // thay vì nhét hết vào dataset của <tr>.
    let factoryDataByRawId = {};

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

    // Bảng "Tiến độ sản xuất theo lô" giờ gọn: MỖI LÔ = 1 dòng tổng hợp
    // (batch-summary-row) + 1 dòng chi tiết ẩn (batch-detail-row, 1 ô rộng
    // suốt) bung ra khi bấm — không còn 17 cột / chẻ dòng theo từng quy cách
    // như trước. Số liệu mỗi lô cân theo:
    //   Nhập = Thành phẩm + Dạt/bỏ + Rớt chuẩn + Tồn NL chưa SX + Thất thoát
    // 4 nhóm đầu khai tay ở "Cập nhật sản xuất", Thất thoát + Hao hụt% tự tính.

    // Rớt/chưa đạt chuẩn của 1 lượt nhập: ưu tiên số nhập tay
    // (factory_batches.rot_chuan_qty). Lô cũ chưa mở lại form để tách (null)
    // → rơi về công thức cũ Nhập − Thành phẩm − Dạt bỏ, số liệu y như trước.
    function lotRotChuan(r, fb){
      if(fb && fb.rot_chuan_qty != null){
        // "Xử lý lại" đã chuyển phần ĐẠT sang Thành phẩm (finished_qty) nhưng
        // rot_chuan_qty là số khai tay cố định — trừ phần đã rework để cân
        // đối lô không báo "Khai vượt" (đếm đúp phần đạt ở cả 2 nhóm).
        const reworked = reworkPassByRawId[r && r.id] || 0;
        return Math.max(0, Number(fb.rot_chuan_qty) - reworked);
      }
      // Lô đã dùng form "Cập nhật sản xuất" bản mới (có khai "Tồn NL chưa SX")
      // mà để TRỐNG ô "Rớt / chưa đạt chuẩn" = thật sự 0 — không suy ra từ
      // (Nhập − Thành phẩm) nữa, vì phần chênh đó là Tồn NL + Thất thoát, tính
      // gộp vào Rớt chuẩn sẽ làm cân đối "Khai vượt".
      if(fb && fb.ton_nl_qty != null) return 0;
      // Lô cũ (chưa bao giờ mở form mới — cả rot_chuan_qty lẫn ton_nl_qty đều
      // null): giữ công thức cũ để số liệu y như trước.
      if(!fb || fb.finished_qty == null) return 0;
      const gross = computeCulledQty(parseQty(r.soluong), Number(fb.finished_qty));
      if(gross == null || gross < 0) return 0;
      return Math.max(0, gross - sumWasteRows(fb));
    }
    // "Tồn NL chưa SX" CÒN LẠI của 1 lượt = số khai tay (factory_batches
    // .ton_nl_qty) trừ phần đã xử lý ở "Xử lý hàng tồn & rớt" (bán thô / dạt
    // bỏ / chuyển sang lô khác). Phần chuyển đi đã thành 1 lượt nhập nguyên
    // liệu ở lô đích nên không được tính lại là Tồn NL ở lô nguồn.
    function lotTonNl(r, fb){
      if(!fb || fb.ton_nl_qty == null) return 0;
      const moved = processedTonNlByRawId[r && r.id] || 0;
      return Math.max(0, Number(fb.ton_nl_qty) - moved);
    }
    // Số trái Tồn NL đã thực chuyển/bán/dạt đi (tổng qty_trai các lượt xử lý)
    // — KHÔNG cắt theo ton_nl_qty đã khai. Nếu chuyển đi NHIỀU HƠN mức khai
    // (dữ liệu lệch) thì phần dôi phải chảy vào Thất thoát để lô báo "Khai
    // vượt", không được giấu đi. Khi dữ liệu khớp thì lotTonNl + lotTonNlMoved
    // = ton_nl_qty đúng như cũ.
    function lotTonNlMoved(r, fb){
      if(!fb || fb.ton_nl_qty == null) return 0;
      return Math.max(0, processedTonNlByRawId[r && r.id] || 0);
    }
    // Lượt nguyên liệu do "Đưa sang lô khác sản xuất" tự tạo (nhận biết qua
    // NCC đặt lúc chuyển). Khi CHƯA khai SX thì chưa nhập vào cân đối lô đích
    // (không thổi phồng Thất thoát/"Khai vượt") — xem computeLotNumbers.
    function isInternalTransferRaw(r){
      return !!(r && typeof r.ncc === 'string' && r.ncc.indexOf('Chuyển nội bộ từ ') === 0);
    }
    // Gộp số liệu cả lô (nhiều lượt nhập). missing/lossPct chỉ có nghĩa khi
    // đã có ít nhất 1 lượt khai Thành phẩm.
    function computeLotNumbers(items){
      let input = 0, finished = null, waste = 0, rotChuan = 0, tonNl = 0, tonNlMoved = 0, resolved = 0;
      let anyProduced = false, allProduced = true, pendingTransfer = 0;
      items.forEach(function(r){
        const fb = getFb(r);
        // Lượt "chuyển nội bộ" chưa khai SX: nguyên liệu vừa chuyển sang, chưa
        // đưa vào chế biến ở lô này — chưa tính vào cân đối (Nhập/Thất thoát),
        // vẫn hiện dòng "Chưa SX" riêng ở chi tiết để nhắc khai.
        if(isInternalTransferRaw(r) && (!fb || fb.finished_qty == null)){
          pendingTransfer += parseQty(r.soluong) || 0;
          allProduced = false;   // vẫn còn lượt phải khai SX → lô "Đang SX"
          return;
        }
        input += parseQty(r.soluong) || 0;
        waste += sumWasteRows(fb);
        rotChuan += lotRotChuan(r, fb);
        tonNl += lotTonNl(r, fb);
        tonNlMoved += lotTonNlMoved(r, fb);
        resolved += resolvedDatByRawId[r.id] || 0;
        if(fb && fb.finished_qty != null){ anyProduced = true; finished = (finished || 0) + Number(fb.finished_qty); }
        else allProduced = false;
      });
      // Trừ cả Tồn NL còn lại và phần đã chuyển đi. Khớp dữ liệu thì tổng 2
      // phần = ton_nl_qty; nếu chuyển đi nhiều hơn mức khai thì phần dôi làm
      // missing âm → lô báo "Khai vượt" (đúng, vì Thành phẩm + đã chuyển đang
      // lớn hơn Số lượng nhập).
      const missing = finished != null ? (input - finished - waste - rotChuan - tonNl - tonNlMoved) : null;
      const lossQty = missing != null ? (waste + Math.max(0, missing)) : null;
      const lossPct = (lossQty != null && input > 0) ? (lossQty / input) * 100 : null;
      return {
        input: input, finished: finished, waste: waste, rotChuan: rotChuan,
        tonNl: tonNl, tonNlMoved: tonNlMoved, pendingTransfer: pendingTransfer,
        resolved: resolved, missing: missing, lossPct: lossPct,
        balanced: missing == null ? null : missing >= 0,
        status: !anyProduced ? 'chua' : (allProduced ? 'xong' : 'dang')
      };
    }
    function viNum(n){ return Number(n || 0).toLocaleString('vi-VN'); }

    function buildFactorySummaryRow(items){
      const n = computeLotNumbers(items);
      const batch = items[0].batch || '';
      const tr = document.createElement('tr');
      tr.className = 'hoverable batch-summary-row';
      tr.dataset.batch = batch;

      // 1 · Lô hàng + chevron + badge trạng thái
      const batchTd = document.createElement('td');
      const chevron = document.createElement('i');
      chevron.className = 'ti ti-chevron-right batch-chevron';
      batchTd.appendChild(chevron);
      batchTd.appendChild(document.createTextNode(' ' + batch + ' '));
      const badge = document.createElement('span');
      badge.className = 'badge ' + (n.status === 'xong' ? 'green' : (n.status === 'dang' ? 'blue' : 'amber'));
      badge.textContent = n.status === 'xong' ? 'Xong' : (n.status === 'dang' ? 'Đang SX' : 'Chưa SX');
      batchTd.appendChild(badge);
      tr.appendChild(batchTd);

      // 2 · NCC
      const nccSet = Array.from(new Set(items.map(function(r){ return r.ncc; }).filter(Boolean)));
      const nccTd = document.createElement('td');
      nccTd.textContent = nccSet.length <= 1 ? (nccSet[0] || '—') : (nccSet.length + ' đầu mối');
      tr.appendChild(nccTd);

      // 3 · Nhập
      const inputTd = document.createElement('td');
      if(n.input > 0){
        inputTd.textContent = viNum(n.input) + ' trái' + (items.length > 1 ? ' · ' + items.length + ' lượt' : '');
      } else { inputTd.textContent = '—'; inputTd.className = 'muted'; }
      if(n.pendingTransfer > 0){
        const s = document.createElement('div');
        s.className = 'muted';
        s.style.cssText = 'font-size:10.5px;margin-top:2px;';
        s.textContent = '+ ' + viNum(n.pendingTransfer) + ' trái chuyển nội bộ, chờ khai SX';
        inputTd.appendChild(s);
      }
      tr.appendChild(inputTd);

      // 4 · Thành phẩm + %
      const finTd = document.createElement('td');
      if(n.finished == null){ finTd.textContent = '—'; finTd.className = 'muted'; }
      else {
        const pct = n.input > 0 ? Math.round(n.finished / n.input * 100) : null;
        finTd.textContent = viNum(n.finished) + (pct != null ? ' · ' + pct + '%' : '');
      }
      tr.appendChild(finTd);

      // 5 · Đóng thùng
      let totalBoxes = null, packedTrai = 0;
      items.forEach(function(r){
        const fb = getFb(r);
        const b = sumBoxRows(fb);
        if(b != null) totalBoxes = (totalBoxes || 0) + b;
        (fb && fb.factory_batch_boxes || []).forEach(function(box){
          if(!isBuBox(box) && box.quy_cach != null && box.so_luong_thung != null){
            packedTrai += Number(box.quy_cach) * Number(box.so_luong_thung);
          }
        });
      });
      const packTd = document.createElement('td');
      if(totalBoxes == null){ packTd.textContent = '—'; packTd.className = 'muted'; }
      else {
        packTd.textContent = viNum(totalBoxes) + ' thùng';
        const unpacked = n.finished != null ? Math.max(0, n.finished - packedTrai) : 0;
        if(unpacked > 0){
          const s = document.createElement('div');
          s.className = 'warn-text';
          s.style.cssText = 'font-size:10.5px;margin-top:2px;';
          s.textContent = 'thiếu ' + viNum(unpacked) + ' trái';
          packTd.appendChild(s);
        }
      }
      tr.appendChild(packTd);

      // 6 · Hao hụt % = (Dạt bỏ + Thất thoát) ÷ Nhập
      const lossTd = document.createElement('td');
      if(n.missing != null && n.missing < 0){
        lossTd.textContent = 'Khai vượt';
        lossTd.style.color = 'var(--red)';
        lossTd.style.fontWeight = '700';
        lossTd.title = 'Tổng Thành phẩm + Dạt bỏ + Rớt chuẩn + Tồn NL vượt Số lượng nhập ' + viNum(Math.abs(n.missing)) + ' trái.';
      } else if(n.lossPct == null){
        lossTd.textContent = '—'; lossTd.className = 'muted';
      } else {
        lossTd.textContent = n.lossPct.toFixed(0) + '%';
        if(n.lossPct > 15) lossTd.className = 'warn-text';
        lossTd.title = 'Dạt bỏ ' + viNum(n.waste) + ' + Thất thoát ' + viNum(Math.max(0, n.missing)) + ' trái';
      }
      tr.appendChild(lossTd);

      // 7 · Cân đối
      const balTd = document.createElement('td');
      if(n.balanced == null){ balTd.textContent = '—'; balTd.className = 'muted'; }
      else if(n.balanced){
        const ok = document.createElement('i');
        ok.className = 'ti ti-check icon-ok';
        balTd.appendChild(ok);
        balTd.title = 'Số liệu khớp — Thất thoát ' + viNum(Math.max(0, n.missing)) + ' trái.';
      } else {
        const warn = document.createElement('i');
        warn.className = 'ti ti-alert-triangle icon-warn';
        balTd.appendChild(warn);
        balTd.title = 'Khai vượt số nhập ' + viNum(Math.abs(n.missing)) + ' trái — kiểm lại.';
      }
      tr.appendChild(balTd);

      // 8 · Ngày SX
      const prodDates = items.map(function(r){ const fb = getFb(r); return fb && fb.production_date; }).filter(Boolean).sort();
      const dateTd = document.createElement('td');
      if(prodDates.length){
        dateTd.className = 'muted';
        dateTd.textContent = prodDates[0] === prodDates[prodDates.length - 1]
          ? fmtDate(prodDates[0])
          : fmtDate(prodDates[0]) + ' – ' + fmtDate(prodDates[prodDates.length - 1]);
      } else { dateTd.className = 'warn-text'; dateTd.textContent = 'Chưa SX'; }
      tr.appendChild(dateTd);

      // 9 · Thao tác — 1 lượt: nút Sửa thẳng; nhiều lượt: bung panel sửa từng lượt
      const actTd = document.createElement('td');
      if(items.length === 1){
        actTd.className = 'row-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.dataset.rawId = items[0].id;
        editBtn.setAttribute('aria-label', 'Chỉnh sửa');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        actTd.appendChild(editBtn);
      } else {
        actTd.className = 'row-actions muted';
        actTd.style.fontSize = '11.5px';
        actTd.textContent = items.length + ' lượt';
      }
      tr.appendChild(actTd);

      return tr;
    }

    function buildFactoryDetailRow(items, startVisible){
      const tr = document.createElement('tr');
      tr.className = 'batch-detail-row';
      tr.style.display = startVisible ? '' : 'none';
      const td = document.createElement('td');
      td.colSpan = FACTORY_COLS;

      items.forEach(function(r){
        const fb = getFb(r);
        const inQ = parseQty(r.soluong);
        const lot = document.createElement('div');
        lot.className = 'fac-detail-lot';

        const head = document.createElement('div');
        head.className = 'fac-detail-head';
        head.appendChild(document.createTextNode(
          (r.ncc || 'NCC —') +
          ' · nhập ' + (inQ != null ? viNum(inQ) + ' trái' : '—') +
          (r.ngay_nhap ? ' · ngày nhập ' + fmtDate(r.ngay_nhap) : '') +
          (r.chung_loai ? ' · ' + r.chung_loai : '')
        ));
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'row-edit-btn';
        editBtn.dataset.rawId = r.id;
        editBtn.setAttribute('aria-label', 'Chỉnh sửa lượt này');
        editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
        head.appendChild(editBtn);
        lot.appendChild(head);

        if(!fb || fb.finished_qty == null){
          const p = document.createElement('div');
          p.className = 'warn-text';
          p.style.fontSize = '12px';
          p.textContent = isInternalTransferRaw(r)
            ? 'Hàng chuyển nội bộ — chưa khai SX. Chưa tính vào cân đối lô; bấm bút chì để khai Thành phẩm khi đã chế biến.'
            : 'Chưa cập nhật sản xuất cho lượt này — bấm nút bút chì để nhập.';
          lot.appendChild(p);
        } else {
          const waste = sumWasteRows(fb);
          const rot = lotRotChuan(r, fb);
          const ton = lotTonNl(r, fb);
          const tonMoved = lotTonNlMoved(r, fb);
          const resolved = resolvedDatByRawId[r.id] || 0;
          const missing = (inQ || 0) - Number(fb.finished_qty) - waste - rot - ton - tonMoved;
          const wasteRows = fb.factory_batch_waste || [];
          const wasteDetail = wasteRows.length
            ? ' (' + wasteRows.map(function(w){ return (w.ly_do || '?') + ' ' + viNum(w.so_luong); }).join(', ') + ')'
            : '';

          const bd = document.createElement('div');
          bd.className = 'fac-breakdown';
          function labelSpan(html){ const s = document.createElement('span'); s.innerHTML = html; return s; }
          bd.appendChild(labelSpan('Thành phẩm <b>' + viNum(fb.finished_qty) + '</b>'));
          const datSpan = labelSpan('Dạt bỏ <b>' + viNum(waste) + '</b>');
          if(wasteDetail) datSpan.appendChild(document.createTextNode(wasteDetail));
          bd.appendChild(datSpan);
          bd.appendChild(labelSpan('Rớt chuẩn <b>' + viNum(rot) + '</b>' + (resolved > 0 ? ' (đã xử lý ' + viNum(resolved) + ')' : '')));
          bd.appendChild(labelSpan('Tồn NL <b>' + viNum(ton) + '</b>' + (tonMoved > 0 ? ' (đã chuyển/xử lý ' + viNum(tonMoved) + ')' : '')));
          const missSpan = labelSpan('Thất thoát <b>' + viNum(missing) + '</b>');
          if(missing < 0){ missSpan.style.color = 'var(--red)'; missSpan.style.fontWeight = '700'; }
          bd.appendChild(missSpan);
          lot.appendChild(bd);

          const metaParts = [];
          if(fb.start_time || fb.expected_finish){
            metaParts.push('Giờ ' + (fb.start_time || '—') + ' – ' + (fb.expected_finish || '—') +
              (fb.duration_hours != null ? ' · ' + fb.duration_hours + ' giờ' : ''));
          }
          if(fb.ghi_chu) metaParts.push('Ghi chú: ' + fb.ghi_chu);
          if(metaParts.length){
            const m = document.createElement('div');
            m.className = 'muted';
            m.style.fontSize = '12px';
            m.textContent = metaParts.join('  ·  ');
            lot.appendChild(m);
          }

          const boxes = fb.factory_batch_boxes || [];
          if(boxes.length){
            const mt = document.createElement('table');
            mt.className = 'fac-mini-table';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Sản phẩm</th><th>Quy cách</th><th>Số thùng</th><th>Ghi chú</th></tr>';
            mt.appendChild(thead);
            const tb = document.createElement('tbody');
            boxes.forEach(function(b){
              const row = document.createElement('tr');
              const bu = isBuBox(b);
              const c1 = document.createElement('td');
              if(bu){ const tag = document.createElement('span'); tag.className = 'bu-tag'; tag.textContent = '↳ Hàng bù '; c1.appendChild(tag); }
              c1.appendChild(document.createTextNode(b.san_pham || '—'));
              const c2 = document.createElement('td');
              c2.textContent = b.quy_cach != null ? (b.quy_cach + ' trái/thùng') : '—';
              const c3 = document.createElement('td');
              c3.textContent = b.so_luong_thung != null ? (viNum(b.so_luong_thung) + ' thùng') : '—';
              const c4 = document.createElement('td');
              c4.textContent = b.ghi_chu || '—';
              row.appendChild(c1); row.appendChild(c2); row.appendChild(c3); row.appendChild(c4);
              tb.appendChild(row);
            });
            mt.appendChild(tb);
            lot.appendChild(mt);
          }
        }
        td.appendChild(lot);
      });

      tr.appendChild(td);
      return tr;
    }

    // Nhận diện 1 dòng Quy cách là "hàng bù" (thùng tạo ra từ "Xử lý hàng
    // tồn & rớt" gán bù qua lô này — xem resolveTargetChungLoai) qua đúng
    // tiền tố ghi_chu đã đặt lúc insert, không phải hàng đóng gói thật của
    // đợt giao đang mượn tạm factory_batch_id để lưu.
    function isBuBox(box){
      return !!(box && typeof box.ghi_chu === 'string' && box.ghi_chu.indexOf('Bù từ xử lý hàng dạt') === 0);
    }

    function renderFactoryRows(rawRows){
      // Nhớ các lô đang mở rộng trước khi xoá bảng vẽ lại — không thì mỗi lần
      // lưu/sửa 1 lô, bảng thu gọn hết về mặc định.
      const expandedBatches = new Set(
        Array.from(factoryTbody.querySelectorAll('.batch-summary-row.expanded')).map(function(el){ return el.dataset.batch; })
      );
      factoryTbody.textContent = '';
      factoryDataByRawId = {};
      rawRows.forEach(function(r){ factoryDataByRawId[String(r.id)] = r; });
      if(!rawRows.length){ showFactoryMessage('Chưa có lô nguyên liệu nào.'); return; }

      // Gom theo lô hàng, giữ thứ tự xuất hiện đầu tiên (rawRows đã sắp theo
      // ngày nhập mới→cũ). Lô "Chưa SX" (chưa lượt nào khai Thành phẩm) đẩy
      // lên đầu vì đó là việc cần làm.
      const groups = [];
      const groupIndex = {};
      rawRows.forEach(function(r){
        const key = r.batch || '';
        if(!(key in groupIndex)){ groupIndex[key] = groups.length; groups.push([]); }
        groups[groupIndex[key]].push(r);
      });
      groups.sort(function(a, b){
        const rank = function(items){ return computeLotNumbers(items).status === 'chua' ? 0 : 1; };
        return rank(a) - rank(b);
      });

      groups.forEach(function(items){
        try{
          const isExpanded = expandedBatches.has(items[0].batch || '');
          const summary = buildFactorySummaryRow(items);
          if(isExpanded) summary.classList.add('expanded');
          factoryTbody.appendChild(summary);
          factoryTbody.appendChild(buildFactoryDetailRow(items, isExpanded));
        } catch(groupErr){
          console.error('Không dựng được lô "' + (items[0] && items[0].batch) + '":', groupErr);
          const errTr = document.createElement('tr');
          const errTd = document.createElement('td');
          errTd.colSpan = FACTORY_COLS;
          errTd.style.cssText = 'color:var(--red);background:var(--red-bg);font-size:12px;padding:8px 12px;';
          errTd.textContent = 'Lỗi khi hiện lô "' + ((items[0] && items[0].batch) || '') + '" — xem console (F12) để biết chi tiết.';
          errTr.appendChild(errTd);
          factoryTbody.appendChild(errTr);
        }
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
          // Hao hụt = (Dạt bỏ + Thất thoát) ÷ Số lượng nhập — khớp đúng định
          // nghĩa "Hao hụt %" ở bảng bên dưới. Rớt chuẩn + Tồn NL không tính
          // (hàng còn giá trị). Thất thoát = Nhập − Thành phẩm − Dạt bỏ − Rớt
          // chuẩn − Tồn NL (âm thì coi như 0 ở đây, bảng sẽ báo "Khai vượt").
          const avgLoss = lossRows.reduce(function(sum, x){
            const input = parseQty(x.r.soluong);
            const waste = sumWasteRows(x.fb);
            const missing = input - Number(x.fb.finished_qty) - waste - lotRotChuan(x.r, x.fb) - lotTonNl(x.r, x.fb) - lotTonNlMoved(x.r, x.fb);
            return sum + ((waste + Math.max(0, missing)) / input) * 100;
          }, 0) / lossRows.length;
          statLoss.textContent = avgLoss.toFixed(0) + '%';
        } else {
          statLoss.textContent = '—';
          statLoss.title = '';
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
        // KHÔNG lọc theo tháng/năm ngay ở query (.gte/.lt trên ngay_nhap) —
        // NULL không bao giờ khớp so sánh gte/lt trong SQL, nên đợt nhập nào
        // thiếu Ngày nhập hàng sẽ bị PostgREST âm thầm loại khỏi kết quả bất
        // kể chọn kỳ nào, làm "Số lượng"/"Số lượng thùng" ở đây thấp hơn hẳn
        // Vùng nguyên liệu (đã sửa lỗi này ở đó bằng lọc phía client — xem
        // matchesRawPeriod) cho cùng 1 lô. Tải hết rồi lọc phía client, luôn
        // giữ lại đợt thiếu ngày nhập bất kể đang chọn kỳ nào, đồng nhất với
        // Vùng nguyên liệu.
        const [{ data: allData, error }, procRes] = await Promise.all([
          sb.from('raw_batches').select('*, factory_batches(*, factory_batch_boxes(*), factory_batch_waste(*))').is('deleted_at', null).order('ngay_nhap', { ascending: false }),
          sb.from('factory_culled_processing').select('raw_batch_id, qty_trai, source_type').is('deleted_at', null)
        ]);
        if(error) throw error;
        if(procRes.error) throw procRes.error;
        const data = (allData || []).filter(function(r){
          if(!factoryYearSelect || !factoryYearSelect.value) return true;
          const p = periodParts(r.ngay_nhap);
          if(!p) return true;
          if(p.year !== Number(factoryYearSelect.value)) return false;
          if(factoryMonthSelect && factoryMonthSelect.value && p.month !== Number(factoryMonthSelect.value)) return false;
          return true;
        });
        resolvedDatByRawId = {};
        processedTonNlByRawId = {};
        (procRes.data || []).forEach(function(p){
          if(p.raw_batch_id == null) return;
          if(p.source_type === 'ton_nl'){
            // Tồn NL đã bán thô / dạt bỏ / chuyển sang lô khác → trừ khỏi cột
            // "Tồn NL" của lô nguồn (xem lotTonNl / lotTonNlMoved).
            processedTonNlByRawId[p.raw_batch_id] = (processedTonNlByRawId[p.raw_batch_id] || 0) + Number(p.qty_trai || 0);
            return;
          }
          if(p.source_type && p.source_type !== 'dat') return;   // 'ton_du' không gắn raw_batch_id
          resolvedDatByRawId[p.raw_batch_id] = (resolvedDatByRawId[p.raw_batch_id] || 0) + Number(p.qty_trai || 0);
        });
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
        knownSanPhamNames = Object.keys(sanPhamNames).sort(function(a, b){ return a.localeCompare(b, 'vi'); });
        fillDatalist('dl-san-pham', knownSanPhamNames);
      } catch(err){
        console.error('Không tải được dữ liệu Xưởng Ba Phi:', err);
        showFactoryMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    // Danh sách Quy cách động trong modal — mỗi dòng là 1 tổ hợp (Quy cách,
    // Số lượng thùng), thêm/xóa tùy ý vì chỉ biết được sau khi đóng gói.
    const boxesListEl = document.getElementById('fac-boxes-list');
    const addBoxRowBtn = document.getElementById('btn-add-box-row');
    const NEW_SAN_PHAM_VALUE = '__new__';
    // Danh sách tên Sản phẩm đã từng khai báo — dùng để dựng dropdown chọn
    // ở createBoxRow, cập nhật lại mỗi lần refreshFactoryRows() chạy xong.
    let knownSanPhamNames = [];
    // Số trái "dạt" của mỗi raw_batch ĐÃ được xử lý (bán chợ hoặc gán bù
    // qua lô khác — xem "Xử lý hàng tồn & rớt" ở tab Tồn kho), tính theo
    // raw_batch_id — dùng để trừ khỏi Hao hụt/Trái dạt hiển thị ở đây, vì
    // phần đã xử lý không còn là hao hụt thật (đã dùng có ích), không nên
    // tính chung với phần thật sự mất đi.
    let resolvedDatByRawId = {};
    let reworkPassByRawId = {};   // {raw_batch_id: Σ rework_pass} — trừ khỏi Rớt chuẩn trong cân đối lô
    // {raw_batch_id: Σ qty_trai} phần "Tồn NL chưa SX" đã xử lý ở "Xử lý hàng
    // tồn & rớt" (bán thô / dạt bỏ / chuyển sang lô khác). Trừ khỏi cột "Tồn
    // NL" của lô nguồn để không đếm đúp — phần chuyển đi đã thành 1 lượt nhập
    // nguyên liệu ở lô đích.
    let processedTonNlByRawId = {};

    // Sản phẩm giờ khai báo riêng cho TỪNG dòng Quy cách (không còn 1 ô
    // Sản phẩm dùng chung cho cả đợt) — 1 đợt có thể vừa ra sản phẩm chính
    // vừa ra vài thùng sản phẩm khác (VD: mẫu cho khách khác) mà không bị
    // gắn nhầm tên sản phẩm cho toàn bộ số thùng.
    function createBoxRow(sanPham, quyCach, soLuongThung, ghiChu){
      if(!boxesListEl) return;
      const row = document.createElement('div');
      row.className = 'box-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
      // Sản phẩm giờ CHỌN từ danh sách đã khai báo trước (không gõ tay tự
      // do nữa) — đây từng là ô duy nhất trong app còn cho gõ tự do, chỉ
      // cần lệch 1 chữ (thừa dấu cách, thiếu/thừa từ...) là Xưởng Ba Phi và
      // Tồn kho coi như 2 sản phẩm khác nhau, tồn kho tính sai mà không ai
      // biết. Vẫn thêm được tên hoàn toàn mới qua lựa chọn "+ Thêm sản phẩm
      // mới" — chỉ gõ tự do đúng 1 lần lúc đó, các lần sau chọn lại đúng
      // tên đã có.
      const sanPhamWrap = document.createElement('div');
      sanPhamWrap.style.cssText = 'flex:1.2;display:flex;flex-direction:column;gap:4px;';
      const sanPhamSelect = document.createElement('select');
      sanPhamSelect.className = 'box-row-sanpham-select';
      const blankOpt = document.createElement('option');
      blankOpt.value = '';
      blankOpt.textContent = '— Chọn sản phẩm —';
      sanPhamSelect.appendChild(blankOpt);
      knownSanPhamNames.forEach(function(name){
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sanPhamSelect.appendChild(opt);
      });
      const newOpt = document.createElement('option');
      newOpt.value = NEW_SAN_PHAM_VALUE;
      newOpt.textContent = '+ Thêm sản phẩm mới…';
      sanPhamSelect.appendChild(newOpt);

      const sanPhamNewInput = document.createElement('input');
      sanPhamNewInput.type = 'text';
      sanPhamNewInput.className = 'box-row-sanpham-new';
      sanPhamNewInput.placeholder = 'Gõ tên sản phẩm mới';
      sanPhamNewInput.style.display = 'none';

      function syncSanPhamNewVisibility(){
        sanPhamNewInput.style.display = sanPhamSelect.value === NEW_SAN_PHAM_VALUE ? '' : 'none';
      }
      sanPhamSelect.addEventListener('change', function(){
        if(sanPhamSelect.value !== NEW_SAN_PHAM_VALUE) sanPhamNewInput.value = '';
        syncSanPhamNewVisibility();
      });

      // Dòng mới thêm (không truyền sẵn giá trị) mặc định lấy theo dòng
      // ngay trước — đa số các dòng trong 1 đợt vẫn cùng 1 sản phẩm, tiện
      // hơn phải chọn lại, nhưng vẫn sửa được nếu dòng đó là sản phẩm khác.
      const isNewRow = sanPham == null;
      if(isNewRow){
        const existingRows = boxesListEl.querySelectorAll('.box-row');
        if(existingRows.length){
          const lastSelect = existingRows[existingRows.length - 1].querySelector('.box-row-sanpham-select');
          const lastNewInput = existingRows[existingRows.length - 1].querySelector('.box-row-sanpham-new');
          sanPham = lastSelect && lastSelect.value === NEW_SAN_PHAM_VALUE ? lastNewInput.value : (lastSelect ? lastSelect.value : '');
        }
      }
      // Tên đã có trong danh sách thì chọn đúng option đó; tên lạ (VD dữ
      // liệu cũ gõ tay trước khi đổi sang dropdown) thì rơi về "+ Thêm sản
      // phẩm mới" kèm sẵn giá trị cũ, không làm mất/đổi tên đang lưu.
      if(sanPham && knownSanPhamNames.indexOf(sanPham) !== -1){
        sanPhamSelect.value = sanPham;
      } else if(sanPham){
        sanPhamSelect.value = NEW_SAN_PHAM_VALUE;
        sanPhamNewInput.value = sanPham;
      }
      syncSanPhamNewVisibility();

      sanPhamWrap.appendChild(sanPhamSelect);
      sanPhamWrap.appendChild(sanPhamNewInput);

      const quyCachInput = document.createElement('input');
      quyCachInput.type = 'text';
      quyCachInput.className = 'box-row-quycach';
      quyCachInput.placeholder = 'Quy cách (trái/thùng)';
      quyCachInput.value = quyCach != null ? quyCach : '';
      quyCachInput.style.flex = '0.9';
      const soLuongInput = document.createElement('input');
      soLuongInput.type = 'text';
      soLuongInput.className = 'box-row-soluong';
      soLuongInput.placeholder = 'Số lượng thùng';
      soLuongInput.value = soLuongThung != null ? soLuongThung : '';
      soLuongInput.style.flex = '0.9';
      // Ghi chú tự do cho riêng dòng này — VD đánh dấu "hàng dư chưa phân
      // đơn" hoặc lý do tách dòng, không ảnh hưởng cách hệ thống ghép dữ
      // liệu Sản xuất ↔ Tồn kho (chỉ Sản phẩm+Quy cách mới quyết định điều
      // đó). "Hạn dùng" không còn nhập tay ở đây — tự tra theo Sản phẩm từ
      // bảng "Hạn sử dụng" ở tab Tồn kho ngay khi lưu, không cần ô riêng.
      const ghiChuInput = document.createElement('input');
      ghiChuInput.type = 'text';
      ghiChuInput.className = 'box-row-ghichu';
      ghiChuInput.placeholder = 'Ghi chú (không bắt buộc)';
      ghiChuInput.value = ghiChu || '';
      ghiChuInput.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa dòng quy cách');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); });
      row.appendChild(sanPhamWrap);
      row.appendChild(quyCachInput);
      row.appendChild(soLuongInput);
      row.appendChild(ghiChuInput);
      row.appendChild(removeBtn);
      boxesListEl.appendChild(row);
    }

    function resetBoxRows(boxes){
      if(!boxesListEl) return;
      boxesListEl.textContent = '';
      if(boxes && boxes.length){
        boxes.forEach(function(b){ createBoxRow(b.san_pham, b.quy_cach, b.so_luong_thung, b.ghi_chu); });
      } else {
        createBoxRow('');
      }
    }

    function readBoxRows(){
      if(!boxesListEl) return [];
      return Array.from(boxesListEl.querySelectorAll('.box-row')).map(function(row){
        const select = row.querySelector('.box-row-sanpham-select');
        const newInput = row.querySelector('.box-row-sanpham-new');
        const sanPham = ((select && select.value === NEW_SAN_PHAM_VALUE ? (newInput && newInput.value) : (select && select.value)) || '').trim();
        // Hạn dùng luôn tra tươi theo đúng Sản phẩm đang chọn lúc lưu —
        // nguồn duy nhất là bảng "Hạn sử dụng" ở tab Tồn kho, không còn giữ
        // giá trị cũ đã lưu trước đây theo ô nhập tay (đã bỏ).
        const lookedRate = sharedShelfLifeMap[normalizeSanPham(sanPham)];
        return {
          sanPham: sanPham,
          quyCach: parseQty(row.querySelector('.box-row-quycach').value),
          soLuongThung: parseQty(row.querySelector('.box-row-soluong').value),
          ghiChu: (row.querySelector('.box-row-ghichu').value || '').trim(),
          hanSuDungNgay: lookedRate != null ? lookedRate : null
        };
      }).filter(function(r){ return r.quyCach && r.soLuongThung; });
    }

    if(addBoxRowBtn) addBoxRowBtn.addEventListener('click', function(){ createBoxRow(); });

    // Danh sách "Dạt bỏ" động — mỗi dòng 1 lý do hư hỏng vật lý (bể gáo, nứt
    // đầu...) kèm số lượng riêng, để sau này thống kê được đợt nào hư nhiều
    // vì lý do gì (khác với "Rớt/chưa đạt chuẩn" — không nhập tay, tự tính
    // Nhập − Thành phẩm − Dạt bỏ, vì phần đó còn cứu được nên xử lý ở tab
    // Tồn kho, không quyết định ngay lúc này).
    // Gợi ý nhanh (không bắt buộc) — gõ tự do, không phải chọn từ danh sách
    // cố định, vì lý do hư hỏng thực tế đa dạng hơn 2-3 mục soạn sẵn.
    const WASTE_REASON_SUGGESTIONS = ['Bể gáo', 'Nứt đầu'];
    const wasteListEl = document.getElementById('fac-waste-list');
    const addWasteRowBtn = document.getElementById('btn-add-waste-row');

    function createWasteRow(lyDo, soLuong){
      if(!wasteListEl) return;
      const row = document.createElement('div');
      row.className = 'waste-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';

      const lyDoInput = document.createElement('input');
      lyDoInput.type = 'text';
      lyDoInput.className = 'waste-row-lydo';
      lyDoInput.placeholder = 'Lý do (VD: Bể gáo, Nứt đầu...)';
      lyDoInput.value = lyDo || '';
      lyDoInput.setAttribute('list', 'dl-waste-reason');
      lyDoInput.style.flex = '1.3';

      const soLuongInput = document.createElement('input');
      soLuongInput.type = 'text';
      soLuongInput.className = 'waste-row-soluong';
      soLuongInput.placeholder = 'Số lượng (trái)';
      soLuongInput.value = soLuong != null ? soLuong : '';
      soLuongInput.style.flex = '0.8';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa dòng dạt bỏ');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); updateBalancePanel(); });

      row.appendChild(lyDoInput);
      row.appendChild(soLuongInput);
      row.appendChild(removeBtn);
      wasteListEl.appendChild(row);
    }
    function resetWasteRows(rows){
      if(!wasteListEl) return;
      wasteListEl.textContent = '';
      if(rows && rows.length){
        rows.forEach(function(r){ createWasteRow(r.ly_do, r.so_luong); });
      }
      // Không tự tạo sẵn 1 dòng trống như Quy cách — đa số đợt sản xuất
      // không có hàng dạt bỏ, để trống mặc định đỡ phải xóa tay mỗi lần.
    }
    function readWasteRows(){
      if(!wasteListEl) return [];
      return Array.from(wasteListEl.querySelectorAll('.waste-row')).map(function(row){
        return {
          lyDo: (row.querySelector('.waste-row-lydo').value || '').trim(),
          soLuong: parseQty(row.querySelector('.waste-row-soluong').value)
        };
      }).filter(function(r){ return r.soLuong && r.lyDo; });
    }
    function sumWasteRows(fb){
      if(!fb || !fb.factory_batch_waste || !fb.factory_batch_waste.length) return 0;
      return fb.factory_batch_waste.reduce(function(sum, r){ return sum + (Number(r.so_luong) || 0); }, 0);
    }
    if(addWasteRowBtn) addWasteRowBtn.addEventListener('click', function(){ createWasteRow(); });

    // ---- Khối "Cân đối lô" trong modal: Nhập − Thành phẩm − Dạt bỏ − Rớt
    // chuẩn − Tồn NL = Thất thoát (tự tính). Cập nhật realtime khi đang gõ và
    // chặn nút Lưu khi Thất thoát âm (khai vượt số nhập).
    const balancePanel = document.getElementById('fac-balance-panel');
    function setSubmitBlocked(blocked){
      if(!factorySubmitBtn) return;
      factorySubmitBtn.disabled = !!blocked;
      factorySubmitBtn.title = blocked ? 'Tổng số khai đang vượt Số lượng nhập — sửa lại để Lưu.' : '';
    }
    function balanceLine(label, value, cls){
      const d = document.createElement('div');
      d.className = 'fb-row' + (cls ? ' ' + cls : '');
      const a = document.createElement('span'); a.textContent = label;
      const b = document.createElement('span'); b.textContent = value;
      d.appendChild(a); d.appendChild(b);
      return d;
    }
    function updateBalancePanel(){
      if(!balancePanel) return;
      balancePanel.textContent = '';
      const input = editingInputQty;
      if(input == null || input <= 0){
        const d = document.createElement('div');
        d.className = 'fb-hint';
        d.textContent = 'Chưa rõ Số lượng nhập của lô này (khai ở tab Vùng nguyên liệu) — chưa tính được cân đối.';
        balancePanel.appendChild(d);
        setSubmitBlocked(false);
        return;
      }
      const finished = parseQty(fieldVal('fac-finished-qty')) || 0;
      const rot = parseQty(fieldVal('fac-rot-chuan')) || 0;
      const ton = parseQty(fieldVal('fac-ton-nl')) || 0;
      const waste = readWasteRows().reduce(function(s, w){ return s + (w.soLuong || 0); }, 0);
      const missing = input - finished - waste - rot - ton;
      const fmt = function(v){ return Number(v || 0).toLocaleString('vi-VN'); };
      // "Tồn NL chưa SX" gõ trong ô là TỔNG đã khai; phần đã chuyển/bán/dạt đi
      // ở "Xử lý hàng tồn & rớt" nằm trong đó — tách ra để thấy rõ, không trừ
      // lại vào Thất thoát (đã là 1 lượt nhập ở lô đích).
      const moved = editingMovedTonNl || 0;
      const tonRemaining = ton - moved;
      balancePanel.appendChild(balanceLine('Nhập', fmt(input)));
      balancePanel.appendChild(balanceLine('− Thành phẩm', fmt(finished), 'fb-sub'));
      balancePanel.appendChild(balanceLine('− Dạt/bỏ', fmt(waste), 'fb-sub'));
      balancePanel.appendChild(balanceLine('− Rớt/chưa đạt chuẩn', fmt(rot), 'fb-sub'));
      if(moved > 0){
        balancePanel.appendChild(balanceLine('− Tồn NL chưa SX (còn lại)', fmt(tonRemaining), 'fb-sub'));
        balancePanel.appendChild(balanceLine('− Đã chuyển/xử lý Tồn NL', fmt(moved), 'fb-sub'));
      } else {
        balancePanel.appendChild(balanceLine('− Tồn NL chưa SX', fmt(ton), 'fb-sub'));
      }
      const sep = document.createElement('div'); sep.className = 'fb-sep'; balancePanel.appendChild(sep);
      if(moved > 0 && ton < moved){
        balancePanel.appendChild(balanceLine('= Tồn NL khai thiếu', fmt(moved - ton) + ' trái', 'fb-total fb-bad'));
        const w = document.createElement('div');
        w.className = 'fb-loss fb-bad';
        w.textContent = 'Đã chuyển/xử lý ' + fmt(moved) + ' trái Tồn NL sang chỗ khác — ô "Tồn nguyên liệu chưa SX" không được nhỏ hơn ' + fmt(moved) + '.';
        balancePanel.appendChild(w);
        setSubmitBlocked(true);
      } else if(missing < 0){
        balancePanel.appendChild(balanceLine('= Khai vượt số nhập', fmt(Math.abs(missing)) + ' trái', 'fb-total fb-bad'));
        const warn = document.createElement('div');
        warn.className = 'fb-loss fb-bad';
        warn.textContent = 'Tổng Thành phẩm + Dạt bỏ + Rớt chuẩn + Tồn NL đang lớn hơn Số lượng nhập — kiểm lại số trước khi Lưu.';
        balancePanel.appendChild(warn);
        setSubmitBlocked(true);
      } else {
        balancePanel.appendChild(balanceLine('= Thất thoát (tự tính)', fmt(missing), 'fb-total'));
        const lossQty = waste + missing;
        const lossPct = input > 0 ? (lossQty / input) * 100 : 0;
        const loss = document.createElement('div');
        loss.className = 'fb-loss';
        loss.textContent = 'Hao hụt: ' + fmt(lossQty) + ' / ' + fmt(input) + ' = ' + lossPct.toFixed(1).replace('.', ',') + '%';
        balancePanel.appendChild(loss);
        setSubmitBlocked(false);
      }
    }
    ['fac-finished-qty', 'fac-rot-chuan', 'fac-ton-nl'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.addEventListener('input', updateBalancePanel);
    });
    if(wasteListEl) wasteListEl.addEventListener('input', updateBalancePanel);

    function openModal(){ factoryOverlay.classList.add('active'); }
    function closeModal(){
      factoryOverlay.classList.remove('active');
      factoryForm.reset();
      resetBoxRows(); resetWasteRows();
      editingRawBatchId = null; editingBatchLabel = ''; editingInputQty = null;
      editingMovedTonNl = 0; editingTonNlStored = null;
      if(balancePanel) balancePanel.textContent = '';
      setSubmitBlocked(false);
    }

    // Nút Sửa chỉ mang data-raw-id — lấy dữ liệu điền form từ factoryDataByRawId
    // (raw_batches + factory_batches lồng của lần render gần nhất).
    function openEditModal(rawId){
      const r = factoryDataByRawId[String(rawId)];
      if(!r){
        showErrorToast('Không tìm thấy lượt nhập này — tải lại trang rồi thử lại.');
        return;
      }
      const fb = getFb(r);
      editingRawBatchId = r.id;
      editingBatchLabel = r.batch || '';
      editingInputQty = parseQty(r.soluong);
      // Phần Tồn NL của lượt này đã chuyển/bán/dạt đi ở "Xử lý hàng tồn & rớt"
      // — không cho HẠ ô "Tồn NL chưa SX" xuống dưới mức này (sẽ desync).
      editingMovedTonNl = processedTonNlByRawId[r.id] || 0;
      editingTonNlStored = (fb && fb.ton_nl_qty != null) ? Number(fb.ton_nl_qty) : null;
      if(factoryModalBatchInfo){
        factoryModalBatchInfo.textContent = 'Lô hàng: ' + (r.batch || '—') + ' · NCC: ' + (r.ncc || '—') +
          ' · Số lượng nhập: ' + (editingInputQty != null ? editingInputQty.toLocaleString('vi-VN') + ' trái' : '—');
      }
      document.getElementById('fac-production-date').value = (fb && fb.production_date) || '';
      document.getElementById('fac-finished-qty').value = (fb && fb.finished_qty != null) ? fb.finished_qty : '';
      document.getElementById('fac-rot-chuan').value = (fb && fb.rot_chuan_qty != null) ? fb.rot_chuan_qty : '';
      document.getElementById('fac-ton-nl').value = (fb && fb.ton_nl_qty != null) ? fb.ton_nl_qty : '';
      document.getElementById('fac-ghichu').value = (fb && fb.ghi_chu) || '';
      resetBoxRows((fb && fb.factory_batch_boxes) || []);
      resetWasteRows((fb && fb.factory_batch_waste) || []);
      document.getElementById('fac-start').value = (fb && fb.start_time) || '';
      document.getElementById('fac-finish').value = (fb && fb.expected_finish) || '';
      factoryModalTitle.textContent = 'Cập nhật sản xuất';
      updateBalancePanel();
      openModal();
    }

    if(closeFactoryBtn) closeFactoryBtn.addEventListener('click', closeModal);
    if(cancelFactoryBtn) cancelFactoryBtn.addEventListener('click', closeModal);
    factoryOverlay.addEventListener('click', function(e){ if(e.target === factoryOverlay) closeModal(); });
    factoryTbody.addEventListener('click', function(e){
      const btn = e.target.closest('.row-edit-btn');
      if(btn){
        if(btn.dataset.rawId) openEditModal(btn.dataset.rawId);
        return;
      }
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

    factoryForm.addEventListener('submit', async function(e){
      e.preventDefault();
      if(!editingRawBatchId){
        showErrorToast('Không xác định được đang cập nhật sản xuất cho lô nào — đóng cửa sổ này rồi bấm lại nút sửa ở đúng dòng lô hàng.');
        return;
      }
      const startVal = fieldVal('fac-start') || null;
      const finishVal = fieldVal('fac-finish') || null;
      const boxRows = readBoxRows();
      const wasteRows = readWasteRows();
      const finishedVal = parseQty(fieldVal('fac-finished-qty'));
      const rotVal = parseQty(fieldVal('fac-rot-chuan'));
      const tonVal = parseQty(fieldVal('fac-ton-nl'));
      // Không cho HẠ "Tồn NL chưa SX" xuống dưới phần đã chuyển/bán/dạt đi ở
      // "Xử lý hàng tồn & rớt" — nếu không, số đã chuyển thành lượt ở lô đích
      // sẽ mồ côi, cân đối 2 lô lệch nhau. Chỉ chặn khi người dùng đang GIẢM
      // xuống dưới mức đã chuyển; dữ liệu cũ vốn đã lệch (chuyển > khai) thì
      // vẫn cho lưu để còn sửa Thành phẩm/… từ chính form này.
      const tonNlWasAlreadyShort = editingTonNlStored != null && editingTonNlStored < editingMovedTonNl;
      if((editingMovedTonNl || 0) > 0 && (tonVal || 0) < editingMovedTonNl &&
         (tonVal || 0) < (editingTonNlStored == null ? Infinity : editingTonNlStored) &&
         !tonNlWasAlreadyShort){
        showErrorToast('Đã chuyển/xử lý ' + editingMovedTonNl.toLocaleString('vi-VN') +
          ' trái Tồn NL sang chỗ khác. Ô "Tồn nguyên liệu chưa SX" không được nhỏ hơn ' +
          editingMovedTonNl.toLocaleString('vi-VN') + ' trái. Muốn giảm thì xoá bớt lượt xử lý ở "Xử lý hàng tồn & rớt" trước.');
        return;
      }
      // Chặn lưu khi tổng khai vượt Số lượng nhập (Thất thoát âm) — cùng điều
      // kiện khối "Cân đối lô" đang cảnh báo.
      if(editingInputQty != null && editingInputQty > 0){
        const wasteTotal = wasteRows.reduce(function(s, w){ return s + (w.soLuong || 0); }, 0);
        const missing = editingInputQty - (finishedVal || 0) - wasteTotal - (rotVal || 0) - (tonVal || 0);
        if(missing < 0){
          showErrorToast('Tổng Thành phẩm + Dạt bỏ + Rớt chuẩn + Tồn NL (' + (editingInputQty - missing).toLocaleString('vi-VN') +
            ' trái) đang vượt Số lượng nhập (' + editingInputQty.toLocaleString('vi-VN') + ' trái). Sửa lại rồi Lưu.');
          return;
        }
      }
      // factory_batches.san_pham không còn ô nhập riêng — vẫn giữ lại 1 giá
      // trị đại diện cho cả đợt (dòng Quy cách đầu tiên) để QC và các chỗ
      // hiển thị cũ (chưa tách theo dòng) vẫn có tên sản phẩm để đọc.
      const payload = {
        raw_batch_id: editingRawBatchId,
        production_date: fieldVal('fac-production-date') || null,
        finished_qty: finishedVal,
        rot_chuan_qty: rotVal,
        ton_nl_qty: tonVal,
        ghi_chu: fieldVal('fac-ghichu') || null,
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
              return { factory_batch_id: factoryBatchId, quy_cach: r.quyCach, so_luong_thung: r.soLuongThung, san_pham: r.sanPham || '', han_su_dung_ngay: r.hanSuDungNgay, ghi_chu: r.ghiChu || null };
            }));
            if(insErr) throw insErr;
          }
          // Đồng bộ danh sách Dạt bỏ — cùng pattern xóa hết rồi chèn lại như
          // Quy cách ở trên.
          const { error: delWasteErr } = await sb.from('factory_batch_waste').delete().eq('factory_batch_id', factoryBatchId);
          if(delWasteErr) throw delWasteErr;
          if(wasteRows.length){
            const { error: insWasteErr } = await sb.from('factory_batch_waste').insert(wasteRows.map(function(r){
              return { factory_batch_id: factoryBatchId, ly_do: r.lyDo, so_luong: r.soLuong };
            }));
            if(insWasteErr) throw insWasteErr;
          }
        }
        await refreshFactoryRows();
        closeModal();
        notifyFactoryProductionChanged();
      } catch(err){
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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
        // Xuất 1 dòng tổng hợp / lô (batch-summary-row) — bỏ dòng chi tiết
        // (batch-detail-row) vì đó là 1 ô rộng suốt, ra Excel không có nghĩa.
        exportTableToExcel(factoryTbody.closest('table'), 'san-xuat-hao-hut-' + todayStr() + '.xlsx', 'Sản xuất', { skipSelector: '.batch-detail-row' });
      });
    }

    showFactoryMessage('Đang tải dữ liệu...');
    loadFactoryYears().then(refreshFactoryRows);

    // Vùng nguyên liệu vừa được thêm/sửa → đồng bộ lại NCC/số lượng/ngày nhập
    // ngay, không đợi người dùng bấm gì hay tải lại trang (kể cả năm mới nếu
    // đợt nhập đầu tiên của 1 năm chưa từng có trong dropdown).
    onRawBatchesChanged(function(){ loadFactoryYears().then(refreshFactoryRows); });
    // "Xử lý hàng tồn & rớt" (gán bù hàng dạt qua lô khác) tạo thêm 1 dòng
    // Quy cách mới trong Sản xuất của lô ĐÍCH (xem targetBoxId trong
    // factory_culled_processing) nhưng chỉ báo qua notifyFactoryProductionChanged()
    // — trước đây bảng này chỉ nghe onRawBatchesChanged nên KHÔNG tự cập
    // nhật, làm "Tổng số lượng thùng" hiện sai (thiếu số vừa gán bù) cho
    // tới khi tự tải lại trang. Nghe thêm kênh này để luôn đúng ngay.
    onFactoryProductionChanged(function(){ loadFactoryYears().then(refreshFactoryRows); });
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
    const INVENTORY_COLS = 10;
    const STOCK_COLS = 6;
    const URGENT_DAYS = 5;
    const WARNING_DAYS = 15;
    const UNSPECIFIED_VARIETY = 'Chưa phân loại';

    if(!inventoryOverlay || !inventoryForm || !inventoryTbody || !sb) return;

    let editingBatch = null;
    let editingVariety = null;
    let editingQuyCach = null;
    let editingSanPham = null;
    let editingProduced = null;   // số thùng ĐÃ đóng gói của dòng đang sửa — để cảnh báo khi nhập "đã xuất" vượt quá

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
    // Trái đã xác nhận Dạt bỏ (hư hỏng vật lý, khai báo ngay lúc "Cập nhật
    // sản xuất") không còn thuộc pool "Rớt/chưa đạt chuẩn" cần xử lý ở đây
    // nữa — đã biết chắc là bỏ, không có gì để quyết định thêm.
    function sumWasteRows(fb){
      if(!fb || !fb.factory_batch_waste || !fb.factory_batch_waste.length) return 0;
      return fb.factory_batch_waste.reduce(function(sum, r){ return sum + (Number(r.so_luong) || 0); }, 0);
    }
    // Dòng Quy cách "hàng bù" (tạo ra từ chính luồng gán bù ở dưới, mượn tạm
    // factory_batch_id của lô đích) không tính vào phần "đã đóng thùng" của
    // CHÍNH lô đó — nó không đến từ thành phẩm thật của lô này.
    function isBuBox(box){
      return !!(box && typeof box.ghi_chu === 'string' && box.ghi_chu.indexOf('Bù từ xử lý hàng dạt') === 0);
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
    // TỒN (remainingTrai > 0). Dòng ĐÃ biết Còn lại (có khai báo Hạn dùng ở
    // "Hạn sử dụng theo sản phẩm") luôn lên trước, sắp theo Còn lại tăng dần
    // (sắp hết hạn nhất lên đầu, kể cả đã quá hạn/số âm — càng cần thấy
    // ngay). Dòng CHƯA biết Còn lại xếp sau, không trộn lẫn vì không so sánh
    // được "chưa rõ" với 1 con số cụ thể — trong nhóm đó, sắp theo Ngày sản
    // xuất mới nhất lên trước (dễ rà hơn xếp theo tên lô).
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
        if(da != null && db != null) return da - db;
        if(da != null) return -1;
        if(db != null) return 1;
        const pa = a.entry.productionDate, pb = b.entry.productionDate;
        if(pa && pb && pa !== pb) return pa < pb ? 1 : -1;
        if(pa && !pb) return -1;
        if(!pa && pb) return 1;
        return a.batch.localeCompare(b.batch, 'vi');
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

        const remainingDaysTd = document.createElement('td');
        if(entry.remainingDays == null){
          remainingDaysTd.textContent = '—';
          remainingDaysTd.className = 'muted';
          remainingDaysTd.title = 'Chưa rõ Ngày sản xuất hoặc Hạn sử dụng của dòng này — khai báo ở "Hạn sử dụng theo sản phẩm" để xếp theo FEFO.';
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

            const ghiChuTd = document.createElement('td');
            ghiChuTd.className = 'muted';
            ghiChuTd.textContent = entry.ghiChu || '—';
            tr.appendChild(ghiChuTd);

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

    function quyCachKeyOf(quyCach){ return quyCach == null ? '' : String(quyCach); }

    async function refreshInventoryRows(){
      try{
        const [rawRes, stockRes] = await Promise.all([
          sb.from('raw_batches').select('batch, chung_loai, factory_batches(finished_qty, san_pham, production_date, factory_batch_boxes(quy_cach, so_luong_thung, san_pham, han_su_dung_ngay, ghi_chu))').is('deleted_at', null),
          sb.from('factory_finished_stock').select('*').is('deleted_at', null)
        ]);
        if(rawRes.error) throw rawRes.error;
        if(stockRes.error) throw stockRes.error;

        // Gom theo (lô hàng, SẢN PHẨM, QUY CÁCH) — KHÔNG tách theo chủng loại
        // nguyên liệu nữa. Cùng 1 sản phẩm+quy cách ra từ nhiều chủng loại
        // (VD Dừa kim cương 9/thùng từ cả Xiêm đỏ lẫn Mã lai chu) là CÙNG 1
        // dòng đóng gói / xuất kho — chia theo chủng loại làm "đã xuất" gắn
        // được vào 1 chủng loại, các dòng khác tính tồn kho ra âm sâu.
        function normalizeSanPham(sanPham){
          return (sanPham || '').normalize('NFC').trim().replace(/\s+/g, ' ');
        }
        function boxKeyOf(sanPham, quyCach){ return normalizeSanPham(sanPham) + '::' + quyCachKeyOf(quyCach); }

        // boxByBatch[batch][key] = { sanPham, quyCach, produced, ghiChu,
        //   earliestProd, hanCandidates:[{prod,han}] }
        const boxByBatch = {};
        function ensureBoxIn(batch, sanPham, quyCach){
          if(!boxByBatch[batch]) boxByBatch[batch] = {};
          const m = boxByBatch[batch];
          const key = boxKeyOf(sanPham, quyCach);
          if(!m[key]) m[key] = { sanPham: sanPham || '', quyCach: quyCach, produced: 0, ghiChu: null, earliestProd: null, hanCandidates: [] };
          return m[key];
        }
        (rawRes.data || []).forEach(function(r){
          const fb = getFb(r);
          if(!fb || fb.finished_qty == null) return;
          (fb.factory_batch_boxes || []).forEach(function(box){
            const sanPham = box.san_pham || fb.san_pham || '';
            const entry = ensureBoxIn(r.batch, sanPham, box.quy_cach);
            entry.produced += (Number(box.so_luong_thung) || 0);
            if(box.ghi_chu) entry.ghiChu = box.ghi_chu;
            if(fb.production_date && (!entry.earliestProd || fb.production_date < entry.earliestProd)) entry.earliestProd = fb.production_date;
            // Nhiều chủng loại/đợt SX gộp lại → mỗi đợt có thể có (ngày SX, hạn
            // dùng) khác nhau; giữ hết để chọn mốc SỚM NHẤT (FEFO) khi hiển thị.
            if(box.han_su_dung_ngay != null) entry.hanCandidates.push({ prod: fb.production_date || null, han: Number(box.han_su_dung_ngay) });
          });
        });

        // "Đã xuất" gộp theo (batch, sản phẩm, quy cách) — cộng dồn mọi dòng
        // factory_finished_stock cùng khoá đó (kể cả các chủng loại khác nhau).
        const exportByBatchKey = {};
        (stockRes.data || []).forEach(function(s){
          if(!s.batch) return;
          const sanPham = s.san_pham || '';
          const key = boxKeyOf(sanPham, s.quy_cach);
          if(!exportByBatchKey[s.batch]) exportByBatchKey[s.batch] = {};
          const m = exportByBatchKey[s.batch];
          if(!m[key]) m[key] = { exported: 0, exportDate: null, stockId: null };
          if(s.exported_qty != null) m[key].exported += Number(s.exported_qty);
          if(s.export_date && (!m[key].exportDate || s.export_date > m[key].exportDate)) m[key].exportDate = s.export_date;
          if(m[key].stockId == null) m[key].stockId = s.id;
          // Có bản ghi xuất nhưng Xưởng không còn đợt SX khớp — vẫn phải hiện.
          ensureBoxIn(s.batch, sanPham, s.quy_cach);
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

        // 1 lô = 1 "line" duy nhất (không còn tách theo chủng loại), gồm các
        // dòng con theo từng tổ hợp (Sản phẩm, Quy cách).
        const byBatch = {};
        Object.keys(boxByBatch).forEach(function(batch){
          const m = boxByBatch[batch];
          const keys = Object.keys(m);
          const quyCachEntries = (keys.length ? keys : [boxKeyOf('', null)]).map(function(key){
            const box = m[key] || { sanPham: '', quyCach: null, produced: 0, ghiChu: null, earliestProd: null, hanCandidates: [] };
            const exp = (exportByBatchKey[batch] || {})[key];
            const exportedQty = exp && exp.exported != null ? exp.exported : null;
            const remainingTrai = box.quyCach != null ? box.quyCach * (box.produced - (exportedQty || 0)) : null;

            // FEFO: trong các cặp (ngày SX, hạn dùng) đã gộp, lấy cặp cho ra
            // SỐ NGÀY CÒN LẠI NHỎ NHẤT (sắp hết hạn nhất) làm mốc hiển thị.
            let remainingDays = null, dispHan = null, dispProd = null;
            (box.hanCandidates || []).forEach(function(c){
              const rd = computeRemainingDays(c.prod, c.han);
              if(rd != null && (remainingDays == null || rd < remainingDays)){ remainingDays = rd; dispHan = c.han; dispProd = c.prod; }
            });
            return {
              sanPham: box.sanPham,
              quyCach: box.quyCach,
              producedThung: box.produced,
              exportedQty: exportedQty,
              exportDate: exp ? exp.exportDate : null,
              stockId: exp ? exp.stockId : null,
              remainingTrai: remainingTrai,
              hanSuDungNgay: dispHan,
              ghiChu: box.ghiChu,
              productionDate: dispProd || box.earliestProd || null,
              remainingDays: remainingDays
            };
          });
          byBatch[batch] = [{ batch: batch, variety: '', quyCachEntries: quyCachEntries }];
        });

        const groups = Object.keys(byBatch).map(function(batch){
          const lines = byBatch[batch];
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
        }).sort(function(a, b){
          // Xuất gần đây nhất lên trên, xuất lâu rồi xuống dưới theo đúng
          // Ngày xuất hàng — lô chưa xuất gì (chưa có ngày) không so sánh
          // được nên luôn xếp xuống cuối, không trộn lẫn với lô đã có ngày
          // thật.
          if(!a.exportDate && !b.exportDate) return a.batch.localeCompare(b.batch, 'vi');
          if(!a.exportDate) return 1;
          if(!b.exportDate) return -1;
          return a.exportDate > b.exportDate ? -1 : (a.exportDate < b.exportDate ? 1 : a.batch.localeCompare(b.batch, 'vi'));
        });

        // Chỉ lấy dòng còn tồn thật (remainingTrai > 0) và đã đủ dữ liệu để
        // tính hạn (có Ngày sản xuất + Hạn sử dụng) — dòng chưa quy đổi được
        // (remainingTrai null) hoặc chưa khai báo hạn thì bỏ qua, không đoán.
        sharedExpiringStock = [];
        groups.forEach(function(group){
          group.lines.forEach(function(line){
            line.quyCachEntries.forEach(function(entry){
              if(entry.remainingTrai > 0 && entry.remainingDays != null && entry.productionDate && entry.hanSuDungNgay != null){
                sharedExpiringStock.push({
                  batch: group.batch,
                  sanPham: entry.sanPham,
                  remainingDays: entry.remainingDays,
                  expiryDate: addDays(entry.productionDate, entry.hanSuDungNgay)
                });
              }
            });
          });
        });
        notifyExpiringStockChanged();

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
    function closeModal(){ inventoryOverlay.classList.remove('active'); inventoryForm.reset(); editingBatch = null; editingVariety = null; editingQuyCach = null; editingSanPham = null; editingProduced = null; }

    function openEditModal(tr){
      // Dòng "chưa rõ Quy cách" VÀ chưa từng có bản ghi xuất nào thì không
      // có gì để gắn bản ghi mới vào — phải khai báo Quy cách ở Xưởng sản
      // xuất trước, tránh tạo bản ghi xuất mơ hồ không biết thuộc quy cách
      // nào. Bản ghi cũ (trước khi có Quy cách theo dõi riêng) vẫn sửa/xóa
      // được bình thường để dọn dữ liệu.
      if(!tr.dataset.quyCach && !tr.dataset.stockId){
        showErrorToast('Chủng loại này chưa có Quy cách nào ở Xưởng sản xuất — cần khai báo Quy cách trước khi ghi nhận xuất hàng.');
        return;
      }
      editingBatch = tr.dataset.batch;
      editingVariety = tr.dataset.variety || UNSPECIFIED_VARIETY;
      editingQuyCach = tr.dataset.quyCach || null;
      editingSanPham = tr.dataset.sanPham || '';
      editingProduced = tr.dataset.produced ? Number(tr.dataset.produced) : null;
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshInventoryRows();
          notifyFactoryProductionChanged();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
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
        chung_loai: 'Gộp',   // không còn tách theo chủng loại (xem migration 2026-09-09)
        quy_cach: editingQuyCach != null ? Number(editingQuyCach) : null,
        san_pham: editingSanPham || '',
        export_date: fieldVal('inv-export-date') || null,
        exported_qty: parseQty(fieldVal('inv-exported-qty')),
        deleted_at: null
      };

      // Chặn nhầm: "đã xuất" không thể lớn hơn "đã đóng gói" cho cùng 1 dòng
      // — nếu vượt (thường do gõ nhầm) thì hỏi lại, không tự chặn cứng.
      if(payload.exported_qty != null && editingProduced != null && payload.exported_qty > editingProduced){
        const ok = await confirmDialog(
          'Số đã xuất (' + fmtBoxQty(payload.exported_qty) + ') lớn hơn số đã đóng gói (' + fmtBoxQty(editingProduced) + ') của dòng này — thường là nhập nhầm, sẽ làm tồn kho âm. Vẫn lưu?',
          { title: 'Kiểm tra lại số liệu', okLabel: 'Vẫn lưu', danger: false }
        );
        if(!ok) return;
      }

      const originalLabel = inventorySubmitBtn.textContent;
      inventorySubmitBtn.disabled = true;
      inventorySubmitBtn.textContent = 'Đang lưu...';
      try{
        const { error } = await sb.from('factory_finished_stock').upsert(payload, { onConflict: 'batch,quy_cach,san_pham' });
        if(error) throw error;
        await refreshInventoryRows();
        closeModal();
        // Đánh giá chất lượng đọc trực tiếp factory_finished_stock (Số lượng
        // thực tế = đã xuất kho) — thiếu dòng này thì sửa Tồn kho không báo
        // cho QC (và các module khác đang lắng nghe) biết để tự tải lại.
        notifyFactoryProductionChanged();
      } catch(err){
        showErrorToast('Không thể lưu vào Supabase: ' + err.message);
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

    // ---- Xưởng Ba Phi: Xử lý hàng tồn & rớt ----
    // Gộp chung 2 nguồn vào 1 luồng xử lý duy nhất:
    //   'dat'    Hàng dạt, CHƯA đóng gói = Số lượng nhập − Thành phẩm
    //            (computeCulledQty), tự tính theo từng lượt nhập, không lưu
    //            cột riêng — tránh lệch với số liệu gốc.
    //   'ton_du' Thành phẩm ĐÃ đóng gói nhưng còn dư, chưa xuất hết — CHÍNH
    //            LÀ số ở cột "Tồn kho (trái)" của tab Xuất hàng, tính lại y
    //            hệt công thức đó (quy_cach × (đã đóng gói − đã xuất)).
    // Xử lý (Bán chợ / Sản xuất qua đơn khác) ghi vào factory_culled_processing.
    // Với 'ton_du', cả 2 hướng xử lý đều cộng thẳng số thùng vào "Đã xuất"
    // của CHÍNH lô gốc (hàng rời kho, dù rời qua đường bán chợ hay gán bù cho
    // lô khác) — dùng field exported_qty có sẵn, không cần ledger riêng cho
    // "Còn lại" của 'ton_du' vì nó luôn tính lại trực tiếp từ đó. Với 'dat',
    // không có exported_qty để dùng nên "Còn lại" phải trừ dần qua ledger
    // factory_culled_processing. "Sản xuất qua đơn khác" luôn cộng thêm số
    // thùng vào "Đã xuất" của lô đích, dùng khi lô đích xuất nhiều hơn số tự
    // sản xuất được nhờ bù thêm hàng tồn/rớt từ lô khác.
    (function(){
      const culledTbody = document.getElementById('culled-tbody');
      const culledHistoryTbody = document.getElementById('culled-history-tbody');
      const culledOverlay = document.getElementById('add-culled-overlay');
      const culledForm = document.getElementById('form-add-culled');
      const culledModalBatchInfo = document.getElementById('culled-modal-batch-info');
      const culledSubmitBtn = document.getElementById('btn-submit-add-culled');
      const culledTypeSelect = document.getElementById('culled-type');
      const culledMarketGroup = document.getElementById('culled-qty-market-group');
      const culledQtyInput = document.getElementById('culled-qty-trai');
      const culledReassignFields = document.getElementById('culled-reassign-fields');
      const closeCulledBtn = document.getElementById('btn-close-add-culled');
      const cancelCulledBtn = document.getElementById('btn-cancel-add-culled');
      const CULLED_COLS = 7;
      const CULLED_HISTORY_COLS = 7;
      const CULLED_TYPE_LABELS = { market: 'Bán chợ', reassign: 'Sản xuất qua đơn khác', rework: 'Xử lý lại', discard: 'Dạt bỏ' };

      if(!culledOverlay || !culledForm || !culledTbody || !sb) return;

      let editingCulledRow = null;
      // Bản ghi factory_culled_processing đang được SỬA (khác editingCulledRow —
      // đó là dòng tồn/rớt chọn để TẠO lượt mới). Khi != null, submit đi nhánh
      // sửa: chỉ đụng qty_trai/ngày/ghi chú + đồng bộ side-effect theo delta.
      let editingCulledProc = null;

      function quyCachKeyOf(quyCach){ return quyCach == null ? '' : String(quyCach); }

      function showCulledMessage(text, color){
        culledTbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = CULLED_COLS;
        td.style.textAlign = 'center';
        td.style.color = color || 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = text;
        tr.appendChild(td);
        culledTbody.appendChild(tr);
      }

      function showCulledHistoryMessage(text, color){
        if(!culledHistoryTbody) return;
        culledHistoryTbody.textContent = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = CULLED_HISTORY_COLS;
        td.style.textAlign = 'center';
        td.style.color = color || 'var(--ink-soft)';
        td.style.padding = '20px';
        td.textContent = text;
        tr.appendChild(td);
        culledHistoryTbody.appendChild(tr);
      }

      function toggleCulledFields(){
        const v = culledTypeSelect ? culledTypeSelect.value : 'market';
        const isReassign = v === 'reassign';
        const isRework = v === 'rework';
        const isTonNl = !!(editingCulledRow && editingCulledRow.sourceType === 'ton_nl');
        // Tồn NL luôn cần "Số lượng (trái)"; reassign chỉ thêm "Mã lô hàng đích".
        if(culledMarketGroup) culledMarketGroup.style.display = (isReassign && !isTonNl) ? 'none' : '';
        if(culledReassignFields) culledReassignFields.style.display = isReassign ? '' : 'none';
        const reworkFields = document.getElementById('culled-rework-fields');
        if(reworkFields) reworkFields.style.display = isRework ? '' : 'none';
        const qtyLabel = document.getElementById('culled-qty-trai-label');
        if(qtyLabel) qtyLabel.textContent = isRework ? 'Số trái đưa vào xử lý lại' : (isTonNl ? 'Số trái nguyên liệu' : 'Số lượng (trái)');
        // Tồn NL reassign: chỉ chuyển nguyên liệu thô — ẩn Sản phẩm/Quy cách/Số thùng.
        ['culled-target-sanpham', 'culled-target-quycach', 'culled-target-thung'].forEach(function(id){
          const grp = (document.getElementById(id) || {}).closest ? document.getElementById(id).closest('.form-group') : null;
          if(grp) grp.style.display = isTonNl ? 'none' : '';
        });
      }
      if(culledTypeSelect) culledTypeSelect.addEventListener('change', toggleCulledFields);

      function openModal(){ culledOverlay.classList.add('active'); }
      function closeModal(){
        culledOverlay.classList.remove('active'); culledForm.reset(); culledTypeSelect.value = 'market';
        if(culledQtyInput) culledQtyInput.disabled = false;
        const _tg = document.getElementById('culled-type-group');
        if(_tg) _tg.style.display = '';
        toggleCulledFields();
        editingCulledRow = null; editingCulledProc = null;
      }
      if(closeCulledBtn) closeCulledBtn.addEventListener('click', closeModal);
      if(cancelCulledBtn) cancelCulledBtn.addEventListener('click', closeModal);
      culledOverlay.addEventListener('click', function(e){ if(e.target === culledOverlay) closeModal(); });

      const culledTypeGroup = document.getElementById('culled-type-group');
      const culledModalTitle = document.getElementById('add-culled-modal-title');
      const culledTargetBatchGroup = document.getElementById('culled-target-batch-group');
      const culledReassignHelp = document.getElementById('culled-reassign-help');

      function openProcessModal(row){
        editingCulledRow = row;
        const isBoxing = row.sourceType === 'chua_dong_thung';
        if(culledModalBatchInfo){
          const typeLabel = SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType;
          const sanPhamLabel = row.sanPham ? (' · Sản phẩm: ' + row.sanPham + (row.quyCach != null ? ' (' + row.quyCach + ' trái/thùng)' : '')) : '';
          culledModalBatchInfo.textContent = 'Lô hàng: ' + row.batch + (row.chungLoai ? ' · Chủng loại: ' + row.chungLoai : '') +
            ' · Loại: ' + typeLabel + sanPhamLabel + ' · Còn lại chưa xử lý: ' + fmtQty(row.remaining);
        }
        document.getElementById('culled-date').value = todayStr();
        if(culledQtyInput) culledQtyInput.value = '';
        var _rp = document.getElementById('culled-rework-pass'); if(_rp) _rp.value = '';
        // "Xử lý lại" chỉ áp cho nguồn "Hàng dạt" (chưa đóng gói) — nguồn đã
        // đóng gói (Tồn kho dư) là hàng đạt sẵn, không cần xử lý lại.
        var _rwOpt = document.getElementById('culled-type-rework-opt');
        if(_rwOpt) _rwOpt.hidden = (row.sourceType !== 'dat');
        document.getElementById('culled-target-batch').value = '';
        document.getElementById('culled-target-sanpham').value = row.sanPham || '';
        document.getElementById('culled-target-quycach').value = row.quyCach != null ? row.quyCach : '';
        document.getElementById('culled-target-thung').value = '';
        document.getElementById('culled-note').value = '';

        if(isBoxing){
          // "Chưa đóng thùng" không phải chọn Bán chợ/Gán bù/Dạt bỏ — chỉ
          // cần khai nốt Quy cách/Số lượng thùng cho đúng lô này (thêm 1
          // dòng Quy cách mới vào Sản xuất), không có "lô đích" nào khác.
          if(culledModalTitle) culledModalTitle.textContent = 'Bổ sung đóng thùng';
          if(culledTypeGroup) culledTypeGroup.style.display = 'none';
          if(culledQtyInput && culledQtyInput.closest('.form-group')) culledQtyInput.closest('.form-group').style.display = 'none';
          if(culledReassignFields) culledReassignFields.style.display = '';
          if(culledTargetBatchGroup) culledTargetBatchGroup.style.display = 'none';
          if(culledReassignHelp) culledReassignHelp.textContent = 'Thêm 1 dòng Quy cách mới cho đúng lô "' + row.batch + '" — sẽ hiện lại ở tab Sản xuất, tự trừ khỏi "chưa đóng thùng".';
        } else {
          const isTonNl = row.sourceType === 'ton_nl';
          if(culledModalTitle) culledModalTitle.textContent = isTonNl ? 'Xử lý tồn nguyên liệu' : (row.sourceType === 'ton_du' ? 'Xử lý tồn kho dư' : 'Xử lý hàng dạt');
          if(culledTypeGroup) culledTypeGroup.style.display = '';
          if(culledTargetBatchGroup) culledTargetBatchGroup.style.display = '';
          if(culledReassignHelp){
            culledReassignHelp.textContent = isTonNl
              ? 'Số trái nguyên liệu này sẽ được cộng vào "Số lượng nhập" của lô đích (thêm 1 lượt nhập mới) — lô đích tự chế biến, khai thành phẩm/hao hụt như thường.'
              : 'Phải khớp đúng Lô hàng + Sản phẩm + Quy cách đã có ở tab "Xuất hàng" — hệ thống tự cộng số thùng này vào "Đã xuất" của đúng dòng đó.';
          }
          culledTypeSelect.value = 'market';
          toggleCulledFields();
        }
        openModal();
      }

      // Số lượng của lượt xử lý chỉ sửa an toàn khi side-effect đơn giản: bán
      // chợ / dạt bỏ (chỉ trừ ledger, hoặc 1 dòng "Đã xuất"), hoặc chuyển Tồn NL
      // sang lô khác SX (đồng bộ thẳng số trái sang lượt nhập ở lô đích). "Xử lý
      // lại" và "gán bù" từ hàng dạt/tồn dư đụng finished_qty / dòng Quy cách —
      // sửa số ở đó dễ lệch, bắt xoá-tạo-lại.
      function procQtyEditable(p){
        return (p.xu_ly_type === 'market' || p.xu_ly_type === 'discard')
          || (p.xu_ly_type === 'reassign' && p.source_type === 'ton_nl');
      }

      function openEditProcModal(p){
        editingCulledRow = null;
        editingCulledProc = p;
        const qtyEditable = procQtyEditable(p);
        const typeLabel = CULLED_TYPE_LABELS[p.xu_ly_type] || p.xu_ly_type;
        const srcLabel = p.source_type === 'ton_du'
          ? ((p.source_batch || '—') + ' [Tồn kho dư]')
          : ((p.source_batch || ('Lô #' + p.raw_batch_id)) + (p.source_type === 'ton_nl' ? ' [Tồn NL]' : ' [Hàng dạt]'));
        if(culledModalTitle) culledModalTitle.textContent = 'Sửa lượt xử lý';
        if(culledModalBatchInfo){
          culledModalBatchInfo.textContent = 'Nguồn: ' + srcLabel + ' · Loại xử lý: ' + typeLabel
            + (p.target_batch ? ' · Lô đích: ' + p.target_batch : '')
            + (qtyEditable ? '' : ' · Chỉ sửa được Ngày và Ghi chú — muốn đổi số lượng thì xoá lượt này rồi tạo lại.');
        }
        // Chỉ chừa lại Ngày / Số lượng / Ghi chú.
        const _tg = document.getElementById('culled-type-group');
        if(_tg) _tg.style.display = 'none';
        if(culledReassignFields) culledReassignFields.style.display = 'none';
        const reworkFields = document.getElementById('culled-rework-fields');
        if(reworkFields) reworkFields.style.display = 'none';
        if(culledMarketGroup) culledMarketGroup.style.display = '';
        const qtyLabel = document.getElementById('culled-qty-trai-label');
        if(qtyLabel) qtyLabel.textContent = 'Số lượng (trái)';
        if(culledQtyInput){
          culledQtyInput.value = p.qty_trai != null ? p.qty_trai : '';
          culledQtyInput.disabled = !qtyEditable;
        }
        document.getElementById('culled-date').value = p.processed_date || todayStr();
        document.getElementById('culled-note').value = p.note || '';
        openModal();
      }

      const SOURCE_TYPE_LABELS = { ton_du: 'Tồn kho dư', dat: 'Hàng dạt', chua_dong_thung: 'Chưa đóng thùng', ton_nl: 'Tồn NL chưa SX' };

      function buildCulledDetailRow(row, collapse, startVisible){
        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        if(collapse){ tr.classList.add('batch-detail-row'); tr.style.display = startVisible ? '' : 'none'; }

        const batchTd = document.createElement('td');
        if(!collapse) batchTd.textContent = row.batch;
        tr.appendChild(batchTd);

        const chungLoaiTd = document.createElement('td');
        chungLoaiTd.className = 'muted';
        chungLoaiTd.textContent = row.chungLoai || '—';
        tr.appendChild(chungLoaiTd);

        const typeTd = document.createElement('td');
        typeTd.textContent = SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType;
        tr.appendChild(typeTd);

        const sanPhamTd = document.createElement('td');
        sanPhamTd.className = 'muted';
        sanPhamTd.textContent = row.sanPham || '—';
        tr.appendChild(sanPhamTd);

        const quyCachTd = document.createElement('td');
        quyCachTd.className = 'muted';
        quyCachTd.textContent = row.quyCach != null ? (row.quyCach + ' trái/thùng') : '—';
        tr.appendChild(quyCachTd);

        const remainingTd = document.createElement('td');
        remainingTd.textContent = fmtQty(row.remaining);
        remainingTd.className = 'warn-text';
        tr.appendChild(remainingTd);

        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        const processBtn = document.createElement('button');
        processBtn.type = 'button';
        processBtn.className = 'btn-secondary';
        processBtn.style.padding = '4px 10px';
        processBtn.style.fontSize = '12px';
        processBtn.textContent = 'Xử lý';
        processBtn.addEventListener('click', function(){ openProcessModal(row); });
        actionsTd.appendChild(processBtn);
        tr.appendChild(actionsTd);

        return tr;
      }

      function buildCulledSummaryRow(batch, batchRows, isExpanded){
        const tr = document.createElement('tr');
        tr.className = 'hoverable batch-summary-row';
        tr.dataset.batch = batch;
        if(isExpanded) tr.classList.add('expanded');

        const batchTd = document.createElement('td');
        const chevron = document.createElement('i');
        chevron.className = 'ti ti-chevron-right batch-chevron';
        batchTd.appendChild(chevron);
        batchTd.appendChild(document.createTextNode(' ' + batch));
        tr.appendChild(batchTd);

        const chungLoaiSet = Array.from(new Set(batchRows.map(function(r){ return r.chungLoai; }).filter(Boolean)));
        const chungLoaiTd = document.createElement('td');
        chungLoaiTd.textContent = chungLoaiSet.join(', ') || '—';
        tr.appendChild(chungLoaiTd);

        const typeTd = document.createElement('td');
        typeTd.className = 'muted';
        typeTd.textContent = batchRows.length + ' nguồn';
        tr.appendChild(typeTd);

        tr.appendChild(document.createElement('td')); // Sản phẩm — xem chi tiết
        tr.appendChild(document.createElement('td')); // Quy cách — xem chi tiết

        const totalRemaining = batchRows.reduce(function(sum, r){ return sum + r.remaining; }, 0);
        const remainingTd = document.createElement('td');
        remainingTd.textContent = fmtQty(totalRemaining);
        remainingTd.className = 'warn-text';
        tr.appendChild(remainingTd);

        tr.appendChild(document.createElement('td')); // Thao tác — xử lý theo từng dòng chi tiết

        return tr;
      }

      // Trạng thái phân trang — nhóm theo Lô hàng để bảng gọn lại (trước đây
      // liệt kê phẳng từng nguồn, 1 lô nhiều lượt/nhiều sản phẩm chiếm nhiều
      // dòng rời rạc, vừa mất diện tích vừa khó thấy lô nào đang là vấn đề
      // lớn nhất). Trang lưu trong bộ nhớ, không lưu server.
      let allCulledRows = [];
      const culledExpandedBatches = new Set();
      let culledPageSize = 10;
      let culledCurrentPage = 1;
      const culledPageSizeSelect = document.getElementById('culled-page-size');
      const culledPagePrevBtn = document.getElementById('culled-page-prev');
      const culledPageNextBtn = document.getElementById('culled-page-next');
      const culledPageIndicator = document.getElementById('culled-page-indicator');

      function renderCulledPage(){
        culledTbody.textContent = '';
        if(!allCulledRows.length){
          showCulledMessage('Không có hàng tồn hoặc hàng rớt nào cần xử lý.');
          if(culledPageIndicator) culledPageIndicator.textContent = 'Trang 1/1';
          if(culledPagePrevBtn) culledPagePrevBtn.disabled = true;
          if(culledPageNextBtn) culledPageNextBtn.disabled = true;
          return;
        }

        const groups = {};
        const order = [];
        allCulledRows.forEach(function(row){
          if(!(row.batch in groups)){ groups[row.batch] = []; order.push(row.batch); }
          groups[row.batch].push(row);
        });
        // Lô có tổng "Còn lại chưa xử lý" cao nhất lên trước — đúng thứ tự
        // ưu tiên cần xử lý gấp, không phải theo tên lô.
        order.sort(function(a, b){
          const sumA = groups[a].reduce(function(s, r){ return s + r.remaining; }, 0);
          const sumB = groups[b].reduce(function(s, r){ return s + r.remaining; }, 0);
          return sumB - sumA;
        });

        const totalPages = Math.max(1, Math.ceil(order.length / culledPageSize));
        if(culledCurrentPage > totalPages) culledCurrentPage = totalPages;
        if(culledCurrentPage < 1) culledCurrentPage = 1;
        const pageBatches = order.slice((culledCurrentPage - 1) * culledPageSize, culledCurrentPage * culledPageSize);

        pageBatches.forEach(function(batch){
          const batchRows = groups[batch];
          const collapse = batchRows.length > 1;
          const isExpanded = collapse && culledExpandedBatches.has(batch);
          if(collapse){
            culledTbody.appendChild(buildCulledSummaryRow(batch, batchRows, isExpanded));
            batchRows.forEach(function(row){ culledTbody.appendChild(buildCulledDetailRow(row, true, isExpanded)); });
          } else {
            culledTbody.appendChild(buildCulledDetailRow(batchRows[0], false, true));
          }
        });

        if(culledPageIndicator) culledPageIndicator.textContent = 'Trang ' + culledCurrentPage + '/' + totalPages;
        if(culledPagePrevBtn) culledPagePrevBtn.disabled = culledCurrentPage <= 1;
        if(culledPageNextBtn) culledPageNextBtn.disabled = culledCurrentPage >= totalPages;
      }

      culledTbody.addEventListener('click', function(e){
        const summaryEl = e.target.closest('.batch-summary-row');
        if(!summaryEl) return;
        const batch = summaryEl.dataset.batch;
        if(culledExpandedBatches.has(batch)) culledExpandedBatches.delete(batch);
        else culledExpandedBatches.add(batch);
        renderCulledPage();
      });

      if(culledPageSizeSelect){
        culledPageSizeSelect.value = String(culledPageSize);
        culledPageSizeSelect.addEventListener('change', function(){
          culledPageSize = Number(culledPageSizeSelect.value) || 10;
          culledCurrentPage = 1;
          renderCulledPage();
        });
      }
      if(culledPagePrevBtn){
        culledPagePrevBtn.addEventListener('click', function(){ culledCurrentPage -= 1; renderCulledPage(); });
      }
      if(culledPageNextBtn){
        culledPageNextBtn.addEventListener('click', function(){ culledCurrentPage += 1; renderCulledPage(); });
      }

      function renderCulledHistoryRows(procRows, rawRows){
        if(!culledHistoryTbody) return;
        culledHistoryTbody.textContent = '';
        if(!procRows.length){ showCulledHistoryMessage('Chưa có lịch sử xử lý.'); return; }
        const rawById = {};
        rawRows.forEach(function(r){ rawById[r.id] = r; });
        const sorted = procRows.slice().sort(function(a, b){
          const da = a.processed_date || '', db = b.processed_date || '';
          if(da !== db) return db.localeCompare(da);
          return (b.id || 0) - (a.id || 0);
        });
        sorted.forEach(function(p){
          const tr = document.createElement('tr');
          tr.className = 'hoverable';
          tr.dataset.proc = JSON.stringify(p);

          const sourceTd = document.createElement('td');
          if(p.source_type === 'ton_du'){
            sourceTd.textContent = p.source_batch + (p.source_chung_loai ? ' (' + p.source_chung_loai + ')' : '') +
              ' — ' + (p.source_san_pham || '—') + (p.source_quy_cach != null ? ', ' + p.source_quy_cach + ' trái/thùng' : '') + ' [Tồn kho dư]';
          } else {
            const raw = rawById[p.raw_batch_id];
            const nm = raw ? (raw.batch + (raw.chung_loai ? ' (' + raw.chung_loai + ')' : ''))
                           : (p.source_batch || ('Lô #' + p.raw_batch_id));
            sourceTd.textContent = nm + (p.source_type === 'ton_nl' ? ' [Tồn NL]' : ' [Hàng dạt]');
          }
          tr.appendChild(sourceTd);

          const typeTd = document.createElement('td');
          typeTd.textContent = CULLED_TYPE_LABELS[p.xu_ly_type] || p.xu_ly_type;
          tr.appendChild(typeTd);

          const dateTd = document.createElement('td');
          dateTd.className = 'muted';
          dateTd.textContent = p.processed_date ? fmtDate(p.processed_date) : '—';
          tr.appendChild(dateTd);

          const qtyTd = document.createElement('td');
          qtyTd.textContent = fmtQty(p.qty_trai);
          tr.appendChild(qtyTd);

          const targetTd = document.createElement('td');
          targetTd.className = 'muted';
          targetTd.textContent = (p.xu_ly_type === 'reassign' && p.source_type === 'ton_nl')
            ? (p.target_batch + ' (nguyên liệu → SX)')
            : (p.xu_ly_type === 'reassign'
              ? (p.target_batch + ' — ' + (p.target_san_pham || '—') + ' (' + (p.target_quy_cach != null ? p.target_quy_cach + ' trái/thùng' : '—') + ', ' + fmtBoxQty(p.target_so_luong_thung) + ')')
              : (p.xu_ly_type === 'rework' ? ('Đạt ' + fmtQty(p.rework_pass) + ' → Thành phẩm') : '—'));
          tr.appendChild(targetTd);

          const noteTd = document.createElement('td');
          noteTd.className = 'muted';
          noteTd.textContent = p.note || '—';
          tr.appendChild(noteTd);

          const actionsTd = document.createElement('td');
          actionsTd.className = 'row-actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'row-edit-btn';
          editBtn.setAttribute('aria-label', 'Sửa');
          editBtn.innerHTML = '<i class="ti ti-pencil"></i>';
          actionsTd.appendChild(editBtn);
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'row-delete-btn';
          delBtn.setAttribute('aria-label', 'Xóa');
          delBtn.innerHTML = '<i class="ti ti-trash"></i>';
          actionsTd.appendChild(delBtn);
          tr.appendChild(actionsTd);

          culledHistoryTbody.appendChild(tr);
        });
      }

      // Cộng dồn addThung (âm để trừ ngược khi hoàn tác) vào "Đã xuất" của
      // đúng 1 dòng (batch, quy_cach, san_pham) trong factory_finished_stock
      // — KHÔNG còn tách theo chủng loại (xem 2026-09-09_finished_stock_merge_variety.sql).
      async function bumpExportedFor(batch, sanPham, quyCach, addThung, dateVal){
        const { data: existing, error: existErr } = await sb.from('factory_finished_stock')
          .select('exported_qty, export_date').eq('batch', batch)
          .eq('quy_cach', quyCach).eq('san_pham', sanPham).is('deleted_at', null).maybeSingle();
        if(existErr) throw existErr;
        const newExported = Math.max(0, (existing && existing.exported_qty != null ? Number(existing.exported_qty) : 0) + addThung);
        const newExportDate = (existing && existing.export_date && (!dateVal || existing.export_date > dateVal)) ? existing.export_date : dateVal;
        const { error: upsertErr } = await sb.from('factory_finished_stock').upsert({
          batch: batch, chung_loai: 'Gộp', quy_cach: quyCach, san_pham: sanPham,
          exported_qty: newExported, export_date: newExportDate, deleted_at: null
        }, { onConflict: 'batch,quy_cach,san_pham' });
        if(upsertErr) throw upsertErr;
      }
      function bumpSourceExported(row, addThung, dateVal){
        return bumpExportedFor(row.batch, normalizeSanPham(row.sanPham), row.quyCach, addThung, dateVal);
      }

      async function refreshCulledRows(){
        try{
          const [rawRes, stockRes, procRes] = await Promise.all([
            sb.from('raw_batches').select('id, batch, chung_loai, soluong, factory_batches(*, factory_batch_boxes(quy_cach, so_luong_thung, san_pham, ghi_chu), factory_batch_waste(so_luong))').is('deleted_at', null),
            sb.from('factory_finished_stock').select('batch, chung_loai, san_pham, quy_cach, exported_qty').is('deleted_at', null),
            sb.from('factory_culled_processing').select('*').is('deleted_at', null)
          ]);
          if(rawRes.error) throw rawRes.error;
          if(stockRes.error) throw stockRes.error;
          if(procRes.error) throw procRes.error;

          const processedDatByRaw = {};
          const reworkPassByRaw = {};
          const processedTonNlByRaw = {};
          (procRes.data || []).forEach(function(p){
            if(p.source_type === 'ton_nl'){
              processedTonNlByRaw[p.raw_batch_id] = (processedTonNlByRaw[p.raw_batch_id] || 0) + Number(p.qty_trai || 0);
              return;
            }
            if(p.source_type !== 'dat') return;
            processedDatByRaw[p.raw_batch_id] = (processedDatByRaw[p.raw_batch_id] || 0) + Number(p.qty_trai || 0);
            if(p.xu_ly_type === 'rework') reworkPassByRaw[p.raw_batch_id] = (reworkPassByRaw[p.raw_batch_id] || 0) + Number(p.rework_pass || 0);
          });

          // "Đã xuất" gộp theo (batch, sản phẩm, quy cách) — bỏ chủng loại.
          const exportedByKey = {};
          (stockRes.data || []).forEach(function(s){
            const key = [s.batch, normalizeSanPham(s.san_pham), quyCachKeyOf(s.quy_cach)].join('::');
            exportedByKey[key] = (exportedByKey[key] || 0) + Number(s.exported_qty || 0);
          });

          const rows = [];
          // "Tồn kho dư" gom theo (batch, sản phẩm, quy cách) trên TOÀN LÔ
          // (cộng số thùng đóng gói của mọi chủng loại), rồi so với "đã xuất"
          // đã gộp — không tính riêng từng chủng loại để khỏi trừ đúp "đã xuất".
          const producedByBatchKey = {};
          (rawRes.data || []).forEach(function(r){
            const fb = getFb(r);
            if(!fb) return;

            // Nguồn 1: Rớt / chưa đạt chuẩn (chưa đóng gói) — giờ lấy đúng số
            // nhập tay ở "Cập nhật sản xuất" (fb.rot_chuan_qty). Lô cũ chưa
            // tách (null) → rơi về công thức cũ Nhập − Thành phẩm − Dạt bỏ.
            if(fb.finished_qty != null){
              let total, processed;
              if(fb.rot_chuan_qty != null){
                total = Math.max(0, Number(fb.rot_chuan_qty));
                processed = processedDatByRaw[r.id] || 0;
              } else if(fb.ton_nl_qty != null){
                // Lô đã dùng form mới mà để trống "Rớt / chưa đạt chuẩn" = 0
                // (khớp lotRotChuan) — phần chênh là Tồn NL + Thất thoát, không
                // phải "hàng dạt cần xử lý".
                total = 0;
                processed = 0;
              } else {
                // Lô cũ: công thức cũ total = (Nhập − Thành phẩm) − Dạt bỏ.
                // "Xử lý lại" đã cộng phần ĐẠT vào Thành phẩm nên total tự
                // giảm — chỉ trừ thêm phần KHÔNG đạt của rework (qty_trai − pass).
                const grossTotal = computeCulledQty(parseQty(r.soluong), Number(fb.finished_qty));
                total = grossTotal == null ? null : grossTotal - sumWasteRows(fb);
                processed = (processedDatByRaw[r.id] || 0) - (reworkPassByRaw[r.id] || 0);
              }
              if(total != null && total > 0){
                const remaining = total - processed;
                if(remaining > 0){
                  rows.push({ sourceType: 'dat', rawId: r.id, batch: r.batch, chungLoai: r.chung_loai || '', sanPham: null, quyCach: null, remaining: remaining });
                }
              }
            }

            // Nguồn 3: Chưa đóng thùng — Thành phẩm và Quy cách×Số lượng
            // thùng là 2 ô nhập tay độc lập, không có gì ép chúng khớp nhau
            // (VD: 100 trái thành phẩm, đóng 11 thùng × 9 = 99, dư 1 trái) —
            // cùng công thức với ghi chú "chưa đóng thùng" ở tab Sản xuất.
            if(fb.finished_qty != null){
              let packedTrai = 0;
              (fb.factory_batch_boxes || []).forEach(function(box){
                if(!isBuBox(box) && box.quy_cach != null && box.so_luong_thung != null){
                  packedTrai += Number(box.quy_cach) * Number(box.so_luong_thung);
                }
              });
              const unpacked = Number(fb.finished_qty) - packedTrai;
              if(unpacked > 0){
                rows.push({ sourceType: 'chua_dong_thung', rawId: r.id, factoryBatchId: fb.id, batch: r.batch, chungLoai: r.chung_loai || '', sanPham: null, quyCach: null, remaining: unpacked });
              }
            }

            // Nguồn 4: Tồn NL chưa SX — dừa thô khai ở "Cập nhật sản xuất"
            // (fb.ton_nl_qty) chưa đưa vào chế biến. Xử lý: bán thô / dạt bỏ /
            // đưa sang lô khác sản xuất.
            if(fb.ton_nl_qty != null && Number(fb.ton_nl_qty) > 0){
              const remaining = Number(fb.ton_nl_qty) - (processedTonNlByRaw[r.id] || 0);
              if(remaining > 0){
                rows.push({ sourceType: 'ton_nl', rawId: r.id, factoryBatchId: fb.id, batch: r.batch, chungLoai: r.chung_loai || '', sanPham: null, quyCach: null, remaining: remaining });
              }
            }

            // Nguồn 2: gom số thùng đóng gói theo (batch, sản phẩm, quy cách)
            // — tính "tồn kho dư" sau vòng lặp, trên toàn lô.
            (fb.factory_batch_boxes || []).forEach(function(box){
              if(box.quy_cach == null) return;
              const sp = box.san_pham || '';
              const key = [r.batch, normalizeSanPham(sp), quyCachKeyOf(box.quy_cach)].join('::');
              if(!producedByBatchKey[key]) producedByBatchKey[key] = { batch: r.batch, sanPham: sp, quyCach: box.quy_cach, produced: 0 };
              producedByBatchKey[key].produced += (Number(box.so_luong_thung) || 0);
            });
          });

          // Nguồn 2: Tồn kho dư — đã đóng gói nhưng chưa xuất hết (toàn lô).
          Object.keys(producedByBatchKey).forEach(function(key){
            const g = producedByBatchKey[key];
            const exported = exportedByKey[key] || 0;
            const remainingTrai = g.quyCach * (g.produced - exported);
            if(remainingTrai > 0){
              rows.push({ sourceType: 'ton_du', batch: g.batch, chungLoai: '', sanPham: g.sanPham, quyCach: g.quyCach, remaining: remainingTrai });
            }
          });

          rows.sort(function(a, b){ return b.remaining - a.remaining; });

          allCulledRows = rows;
          renderCulledPage();
          renderCulledHistoryRows(procRes.data || [], rawRes.data || []);
        } catch(err){
          console.error('Không tải được dữ liệu hàng tồn & rớt:', err);
          showCulledMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
        }
      }

      // Dò đúng Chủng loại của lô đích khớp Sản phẩm+Quy cách đã đóng gói —
      // factory_finished_stock bắt buộc biết Chủng loại (khoá duy nhất
      // batch,chung_loai,quy_cach,san_pham), không được đoán bừa khi 1 lô có
      // nhiều chủng loại. Chỉ chấp nhận khi khớp DUY NHẤT 1 chủng loại.
      // Trả về cả factory_batch_id của lô đích — cần để tạo dòng Quy cách
      // mới (nguồn Hàng dạt) hoặc chỉ để xác nhận đã từng đóng gói (nguồn
      // Tồn dư) trong hàm gọi bên dưới.
      async function resolveTargetChungLoai(targetBatch, normSanPham, quyCach){
        const { data, error } = await sb.from('raw_batches')
          .select('chung_loai, factory_batches(id, factory_batch_boxes(san_pham, quy_cach))')
          .eq('batch', targetBatch).is('deleted_at', null);
        if(error) throw error;
        const matched = new Map();
        (data || []).forEach(function(r){
          const fb = getFb(r);
          (fb && fb.factory_batch_boxes || []).forEach(function(box){
            if(normalizeSanPham(box.san_pham) === normSanPham && Number(box.quy_cach) === Number(quyCach)){
              matched.set(r.chung_loai || '', fb.id);
            }
          });
        });
        return Array.from(matched.entries()).map(function(entry){ return { chungLoai: entry[0], factoryBatchId: entry[1] }; });
      }

      if(culledHistoryTbody){
        culledHistoryTbody.addEventListener('click', async function(e){
          const editBtn = e.target.closest('.row-edit-btn');
          const delBtn = e.target.closest('.row-delete-btn');
          if(!editBtn && !delBtn) return;
          const tr = (editBtn || delBtn).closest('tr');
          let p; try{ p = JSON.parse(tr.dataset.proc || '{}'); } catch(err){ p = {}; }
          if(!p.id) return;
          if(editBtn){ openEditProcModal(p); return; }
          const willRevertSource = p.source_type === 'ton_du';
          // Gán bù từ nguồn "Tồn dư" thì lùi lại bằng cách trừ khỏi "Đã
          // xuất" của lô đích; từ nguồn "Hàng dạt" thì lùi lại bằng cách
          // xóa hẳn dòng Quy cách đã tạo trong Sản xuất (target_box_id) —
          // bản ghi cũ trước khi có cột này (target_box_id null) vẫn lùi
          // theo kiểu cũ (trừ "Đã xuất") vì đó là cách nó ĐÃ được cộng vào.
          const willRevertTargetExport = p.xu_ly_type === 'reassign' && (p.source_type === 'ton_du' || !p.target_box_id);
          const willRevertTargetBox = p.xu_ly_type === 'reassign' && p.source_type === 'dat' && p.target_box_id;
          const willRevertRework = p.xu_ly_type === 'rework' && Number(p.rework_pass || 0) > 0;
          const willRevertTonNlRaw = p.source_type === 'ton_nl' && p.xu_ly_type === 'reassign' && p.target_raw_batch_id;
          const warnParts = [];
          if(willRevertTonNlRaw) warnParts.push('xoá lượt nhập nguyên liệu đã tạo ở lô "' + p.target_batch + '"');
          if(willRevertSource) warnParts.push('trừ lại ' + fmtBoxQty(p.so_luong_thung) + ' khỏi "Đã xuất" của lô gốc "' + p.source_batch + '"');
          if(willRevertTargetExport) warnParts.push('trừ lại ' + fmtBoxQty(p.target_so_luong_thung) + ' khỏi "Đã xuất" của lô "' + p.target_batch + '"');
          if(willRevertTargetBox) warnParts.push('xóa lại ' + fmtBoxQty(p.target_so_luong_thung) + ' khỏi "Thùng đóng gói" của lô "' + p.target_batch + '"');
          if(willRevertRework) warnParts.push('trừ lại ' + fmtQty(p.rework_pass) + ' khỏi Thành phẩm của lô');
          const label = 'lịch sử xử lý ngày ' + (p.processed_date ? fmtDate(p.processed_date) : '(chưa rõ ngày)') + (warnParts.length ? ' (sẽ ' + warnParts.join(', ') + ')' : '');
          const ok = await confirmDialog('Xóa ' + label + '?');
          if(!ok) return;
          try{
            if(willRevertSource){
              await bumpExportedFor(p.source_batch, p.source_san_pham, p.source_quy_cach, -Number(p.so_luong_thung || 0), null);
            }
            if(willRevertTargetExport){
              await bumpExportedFor(p.target_batch, p.target_san_pham, p.target_quy_cach, -Number(p.target_so_luong_thung || 0), null);
            }
            if(willRevertTargetBox){
              const { error: delBoxErr } = await sb.from('factory_batch_boxes').delete().eq('id', p.target_box_id);
              if(delBoxErr) throw delBoxErr;
            }
            if(willRevertRework){
              const { data: fbRow } = await sb.from('factory_batches').select('id, finished_qty').eq('raw_batch_id', p.raw_batch_id).maybeSingle();
              if(fbRow){
                await sb.from('factory_batches').update({
                  finished_qty: Math.max(0, Number(fbRow.finished_qty || 0) - Number(p.rework_pass || 0))
                }).eq('id', fbRow.id);
              }
            }
            if(willRevertTonNlRaw){
              // Chỉ xoá được lượt nhập ở lô đích khi nó CHƯA sản xuất (chưa có factory_batches).
              const { data: fbT } = await sb.from('factory_batches').select('id').eq('raw_batch_id', p.target_raw_batch_id).maybeSingle();
              if(fbT){
                showErrorToast('Lượt nhập ở lô "' + p.target_batch + '" đã bắt đầu sản xuất — xoá thủ công ở tab Vùng nguyên liệu trước.');
                return;
              }
              const { error: delRbErr } = await sb.from('raw_batches').update({ deleted_at: new Date().toISOString() }).eq('id', p.target_raw_batch_id);
              if(delRbErr) throw delRbErr;
              notifyRawBatchesChanged();
            }
            const { error } = await sb.from('factory_culled_processing').update({ deleted_at: new Date().toISOString() }).eq('id', p.id);
            if(error) throw error;
            await refreshCulledRows();
            await refreshInventoryRows();
            notifyFactoryProductionChanged();
          } catch(err){
            showErrorToast('Không thể xóa: ' + err.message);
          }
        });
      }

      // Sửa 1 lượt xử lý đã có (factory_culled_processing) — chỉ ngày / ghi chú
      // / số lượng, kèm đồng bộ side-effect theo phần chênh lệch (delta):
      //  • reassign Tồn NL: cập nhật thẳng soluong của lượt nhập ở lô đích
      //    (chặn nếu lô đích đã khai SX — như lúc xoá).
      //  • bán chợ / dạt bỏ nguồn Tồn kho dư: cộng/trừ chênh lệch số thùng vào
      //    "Đã xuất" của lô gốc.
      //  • bán chợ / dạt bỏ nguồn Hàng dạt / Tồn NL: chỉ đổi số, "Còn lại" tự
      //    tính lại từ ledger.
      async function submitCulledProcEdit(){
        const p = editingCulledProc;
        if(!p || !p.id) return;
        const newDate = fieldVal('culled-date') || null;
        const newNote = fieldVal('culled-note') || null;
        const qtyEditable = procQtyEditable(p);
        const oldQty = Number(p.qty_trai || 0);
        let newQty = oldQty;
        if(qtyEditable){
          newQty = parseQty(fieldVal('culled-qty-trai'));
          if(newQty == null || newQty <= 0){ showErrorToast('Nhập số lượng trái hợp lệ (> 0).'); return; }
        }
        const qtyChanged = qtyEditable && Math.abs(newQty - oldQty) > 0.0001;

        const originalLabel = culledSubmitBtn.textContent;
        culledSubmitBtn.disabled = true;
        culledSubmitBtn.textContent = 'Đang lưu...';
        try{
          if(qtyChanged && p.xu_ly_type === 'reassign' && p.source_type === 'ton_nl' && p.target_raw_batch_id){
            const { data: fbT, error: fbTErr } = await sb.from('factory_batches')
              .select('id').eq('raw_batch_id', p.target_raw_batch_id).maybeSingle();
            if(fbTErr) throw fbTErr;
            if(fbT){
              showErrorToast('Lô đích "' + (p.target_batch || '') + '" đã bắt đầu sản xuất — sửa số lượng lượt nhập thủ công ở tab Vùng nguyên liệu, hoặc xoá lượt xử lý này rồi tạo lại.');
              return;
            }
            const { error: upRbErr } = await sb.from('raw_batches')
              .update({ soluong: String(newQty) }).eq('id', p.target_raw_batch_id);
            if(upRbErr) throw upRbErr;
          }

          if(qtyChanged && (p.xu_ly_type === 'market' || p.xu_ly_type === 'discard') && p.source_type === 'ton_du'){
            const qc = Number(p.source_quy_cach || 0);
            if(qc > 0){
              const deltaThung = (newQty / qc) - (oldQty / qc);
              await bumpExportedFor(p.source_batch, p.source_san_pham, qc, deltaThung, null);
              p.so_luong_thung = newQty / qc;
            }
          }

          const patch = { processed_date: newDate, note: newNote };
          if(qtyEditable) patch.qty_trai = newQty;
          if(qtyChanged && p.source_type === 'ton_du' && p.so_luong_thung != null) patch.so_luong_thung = p.so_luong_thung;
          const { error: upErr } = await sb.from('factory_culled_processing').update(patch).eq('id', p.id);
          if(upErr) throw upErr;

          if(p.target_raw_batch_id) notifyRawBatchesChanged();
          await refreshCulledRows();
          await refreshInventoryRows();
          closeModal();
          notifyFactoryProductionChanged();
        } catch(err){
          showErrorToast('Không thể lưu vào Supabase: ' + err.message);
        } finally {
          culledSubmitBtn.disabled = false;
          culledSubmitBtn.textContent = originalLabel;
        }
      }

      culledForm.addEventListener('submit', async function(e){
        e.preventDefault();
        if(editingCulledProc){ await submitCulledProcEdit(); return; }
        if(!editingCulledRow) return;
        const row = editingCulledRow;
        const type = culledTypeSelect.value;
        const dateVal = fieldVal('culled-date') || null;
        const note = fieldVal('culled-note') || null;

        const originalLabel = culledSubmitBtn.textContent;
        culledSubmitBtn.disabled = true;
        culledSubmitBtn.textContent = 'Đang lưu...';
        try{
          if(row.sourceType === 'chua_dong_thung'){
            // Không đi qua factory_culled_processing (không phải quyết định
            // bán chợ/gán bù/dạt bỏ) — chỉ đơn giản là thêm nốt 1 dòng Quy
            // cách còn thiếu cho đúng lô này, y hệt thao tác ở tab Sản xuất.
            // Đã có trigger audit log trên factory_batch_boxes nên vẫn lưu
            // vết được ai làm, không cần ghi thêm lịch sử riêng.
            const sanPham = fieldVal('culled-target-sanpham');
            const quyCach = parseQty(fieldVal('culled-target-quycach'));
            const soLuongThung = parseQty(fieldVal('culled-target-thung'));
            if(!sanPham || !quyCach || !soLuongThung){
              showErrorToast('Điền đủ Sản phẩm, Quy cách và Số lượng thùng.');
              return;
            }
            const qtyTrai = quyCach * soLuongThung;
            if(qtyTrai > row.remaining + 0.001){
              if(!confirm('Số trái đóng thùng (' + fmtQty(qtyTrai) + ') lớn hơn số còn lại chưa đóng thùng (' + fmtQty(row.remaining) + '). Vẫn lưu?')) return;
            }
            const { error: boxErr } = await sb.from('factory_batch_boxes').insert({
              factory_batch_id: row.factoryBatchId, quy_cach: quyCach, so_luong_thung: soLuongThung,
              san_pham: normalizeSanPham(sanPham), ghi_chu: note
            });
            if(boxErr) throw boxErr;
            await refreshCulledRows();
            closeModal();
            notifyFactoryProductionChanged();
            return;
          }
          if(row.sourceType === 'ton_nl'){
            // Tồn nguyên liệu chưa SX — bán thô / dạt bỏ / đưa sang lô khác SX.
            const qty = parseQty(fieldVal('culled-qty-trai'));
            if(!qty || qty <= 0){ showErrorToast('Nhập số trái nguyên liệu.'); return; }
            if(qty > row.remaining + 0.001){
              if(!confirm('Số nhập (' + fmtQty(qty) + ') lớn hơn Tồn NL còn lại (' + fmtQty(row.remaining) + '). Vẫn lưu?')) return;
            }
            let targetBatch = null, targetRawId = null;
            if(type === 'reassign'){
              targetBatch = fieldVal('culled-target-batch');
              if(!targetBatch){ showErrorToast('Nhập Mã lô hàng đích.'); return; }
              const { data: newRb, error: rbErr } = await sb.from('raw_batches').insert({
                batch: targetBatch,
                ncc: 'Chuyển nội bộ từ ' + row.batch,
                loai: 'Vườn',
                chung_loai: row.chungLoai || null,
                soluong: String(qty),
                ngay_nhap: dateVal,
                trang_thai: 'Đạt chuẩn'
              }).select('id').single();
              if(rbErr) throw rbErr;
              targetRawId = newRb.id;
            } else if(type === 'rework'){
              showErrorToast('Tồn nguyên liệu không có "Xử lý lại".'); return;
            }
            const { error } = await sb.from('factory_culled_processing').insert({
              source_type: 'ton_nl', raw_batch_id: row.rawId,
              source_batch: row.batch, source_chung_loai: row.chungLoai,
              xu_ly_type: type, processed_date: dateVal, qty_trai: qty,
              target_batch: targetBatch, target_raw_batch_id: targetRawId, note: note
            });
            if(error) throw error;
            if(targetRawId) notifyRawBatchesChanged();
          } else if(type === 'rework'){
            // Xử lý lại hàng dạt cho đạt chuẩn — chỉ nguồn 'dat' (chưa đóng gói).
            // qty_trai = số đưa vào; rework_pass = số đạt (cộng vào Thành phẩm
            // của đúng đợt sản xuất). Phần (đưa vào − đạt) coi như dạt bỏ.
            if(row.sourceType !== 'dat'){ showErrorToast('Chỉ "Hàng dạt" (chưa đóng gói) mới xử lý lại được.'); return; }
            const qtyIn = parseQty(fieldVal('culled-qty-trai'));
            const qtyPass = parseQty(fieldVal('culled-rework-pass'));
            if(!qtyIn || qtyIn <= 0){ showErrorToast('Nhập "Số trái đưa vào xử lý lại".'); return; }
            if(qtyPass == null || qtyPass < 0 || qtyPass > qtyIn){ showErrorToast('"Số trái đạt" phải trong khoảng 0 – ' + fmtQty(qtyIn) + '.'); return; }
            if(qtyIn > row.remaining + 0.001){
              if(!confirm('Số đưa vào (' + fmtQty(qtyIn) + ') lớn hơn số còn lại chưa xử lý (' + fmtQty(row.remaining) + '). Vẫn lưu?')) return;
            }
            const { data: fbRow, error: fbErr } = await sb.from('factory_batches')
              .select('id, finished_qty').eq('raw_batch_id', row.rawId).maybeSingle();
            if(fbErr) throw fbErr;
            if(!fbRow){ showErrorToast('Không tìm thấy đợt sản xuất của lô để cộng thành phẩm.'); return; }
            if(qtyPass > 0){
              const { error: upErr } = await sb.from('factory_batches')
                .update({ finished_qty: Number(fbRow.finished_qty || 0) + qtyPass }).eq('id', fbRow.id);
              if(upErr) throw upErr;
            }
            const { error } = await sb.from('factory_culled_processing').insert({
              source_type: 'dat', raw_batch_id: row.rawId,
              xu_ly_type: 'rework', processed_date: dateVal, qty_trai: qtyIn, rework_pass: qtyPass, note: note
            });
            if(error) throw error;
          } else if(type === 'market' || type === 'discard'){
            // "Dạt bỏ" đi CHUNG luồng với "Bán chợ" — cùng là hàng rời khỏi
            // "Còn lại chưa xử lý" theo cùng 1 cách, chỉ khác nhãn xu_ly_type
            // để phân biệt trong Lịch sử xử lý. Chưa tính thêm gì khác (VD giá
            // trị hao hụt) — theo đúng yêu cầu, để tính sau khi cần.
            //
            // Nhập theo trái cho cả 2 nguồn — khớp đúng đơn vị của cột "Còn
            // lại" đang hiện. Với 'ton_du', quy đổi ngược ra thùng theo Quy
            // cách của CHÍNH dòng này để cộng vào "Đã xuất" — không chia hết
            // thì chấp nhận số thùng lẻ (VD 7.5 thùng), vì trái mới là đơn vị
            // đúng, thùng chỉ là cách quy đổi để khớp với cột "Đã xuất" sẵn có.
            const qtyTrai = parseQty(fieldVal('culled-qty-trai'));
            if(!qtyTrai || qtyTrai <= 0){ showErrorToast('Nhập số lượng trái hợp lệ.'); return; }
            if(qtyTrai > row.remaining + 0.001){
              if(!confirm('Số lượng nhập (' + fmtQty(qtyTrai) + ') lớn hơn số còn lại chưa xử lý (' + fmtQty(row.remaining) + '). Vẫn lưu?')) return;
            }

            if(row.sourceType === 'dat'){
              const { error } = await sb.from('factory_culled_processing').insert({
                source_type: 'dat', raw_batch_id: row.rawId,
                xu_ly_type: type, processed_date: dateVal, qty_trai: qtyTrai, note: note
              });
              if(error) throw error;
            } else {
              const soLuongThung = qtyTrai / row.quyCach;
              await bumpSourceExported(row, soLuongThung, dateVal);
              const { error } = await sb.from('factory_culled_processing').insert({
                source_type: 'ton_du', source_batch: row.batch, source_chung_loai: row.chungLoai,
                source_san_pham: normalizeSanPham(row.sanPham), source_quy_cach: row.quyCach,
                xu_ly_type: type, processed_date: dateVal, qty_trai: qtyTrai, so_luong_thung: soLuongThung, note: note
              });
              if(error) throw error;
            }
          } else {
            const targetBatch = fieldVal('culled-target-batch');
            const targetSanPham = fieldVal('culled-target-sanpham');
            const targetQuyCach = parseQty(fieldVal('culled-target-quycach'));
            const targetThung = parseQty(fieldVal('culled-target-thung'));
            if(!targetBatch || !targetSanPham || !targetQuyCach || !targetThung){
              showErrorToast('Điền đủ Mã lô hàng đích, Sản phẩm, Quy cách và Số lượng thùng.');
              return;
            }
            const normTarget = normalizeSanPham(targetSanPham);
            const qtyTrai = targetQuyCach * targetThung;
            if(qtyTrai > row.remaining + 0.001){
              if(!confirm('Số trái gán bù (' + fmtQty(qtyTrai) + ') lớn hơn số còn lại chưa xử lý (' + fmtQty(row.remaining) + '). Vẫn lưu?')) return;
            }

            const matches = await resolveTargetChungLoai(targetBatch, normTarget, targetQuyCach);
            if(matches.length === 0){
              showErrorToast('Không tìm thấy lô "' + targetBatch + '" nào đã đóng gói đúng Sản phẩm "' + targetSanPham + '" + Quy cách ' + targetQuyCach + ' trái/thùng — kiểm tra lại, hoặc khai báo Quy cách đó ở tab Sản xuất trước.');
              return;
            }
            // Nhiều chủng loại cùng đóng Sản phẩm+Quy cách này không còn là vấn
            // đề — "Đã xuất" giờ gộp theo (lô, sản phẩm, quy cách). Lấy đợt SX
            // đầu tiên khớp để gắn dòng box mới (nếu là nguồn "Hàng dạt").
            const targetChungLoai = matches[0].chungLoai;

            // Nguồn "Tồn dư" đã đóng gói sẵn — gán bù nghĩa là hàng đó xuất
            // đi dưới tên lô đích thay vì lô gốc, nên cộng vào "Đã xuất".
            // Nguồn "Hàng dạt" CHƯA hề đóng gói — gán bù nghĩa là mẻ nguyên
            // liệu đó vừa được chế biến/đóng gói ra thành thùng cho lô đích,
            // nên phải cộng vào "Thùng đóng gói" (tạo 1 dòng Quy cách mới
            // trong Sản xuất), không phải "Đã xuất" (trước đây cộng nhầm
            // vào đây, làm Tồn kho của lô đích càng âm thêm thay vì đúng ra
            // phải kéo về gần 0).
            let targetBoxId = null;
            if(row.sourceType === 'ton_du'){
              await bumpExportedFor(targetBatch, normTarget, targetQuyCach, targetThung, dateVal);
            } else {
              const { data: newBox, error: boxErr } = await sb.from('factory_batch_boxes').insert({
                factory_batch_id: matches[0].factoryBatchId, quy_cach: targetQuyCach, so_luong_thung: targetThung,
                san_pham: normTarget, ghi_chu: 'Bù từ xử lý hàng dạt "' + row.batch + '"'
              }).select('id').single();
              if(boxErr) throw boxErr;
              targetBoxId = newBox.id;
            }

            let sourceThung = null;
            if(row.sourceType === 'ton_du'){
              sourceThung = qtyTrai / row.quyCach;
              await bumpSourceExported(row, sourceThung, dateVal);
            }

            const { error: logErr } = await sb.from('factory_culled_processing').insert({
              source_type: row.sourceType,
              raw_batch_id: row.sourceType === 'dat' ? row.rawId : null,
              source_batch: row.sourceType === 'ton_du' ? row.batch : null,
              source_chung_loai: row.sourceType === 'ton_du' ? row.chungLoai : null,
              source_san_pham: row.sourceType === 'ton_du' ? normalizeSanPham(row.sanPham) : null,
              source_quy_cach: row.sourceType === 'ton_du' ? row.quyCach : null,
              xu_ly_type: 'reassign', processed_date: dateVal, qty_trai: qtyTrai, so_luong_thung: sourceThung,
              target_batch: targetBatch, target_chung_loai: targetChungLoai, target_san_pham: normTarget,
              target_quy_cach: targetQuyCach, target_so_luong_thung: targetThung, target_box_id: targetBoxId, note: note
            });
            if(logErr) throw logErr;
          }

          await refreshCulledRows();
          await refreshInventoryRows();
          closeModal();
          notifyFactoryProductionChanged();
        } catch(err){
          showErrorToast('Không thể lưu vào Supabase: ' + err.message);
        } finally {
          culledSubmitBtn.disabled = false;
          culledSubmitBtn.textContent = originalLabel;
        }
      });

      showCulledMessage('Đang tải dữ liệu...');
      showCulledHistoryMessage('Đang tải dữ liệu...');
      refreshCulledRows();

      onRawBatchesChanged(refreshCulledRows);
      onFactoryProductionChanged(refreshCulledRows);
    })();

    // ---- Hạn sử dụng theo sản phẩm (tra cứu dùng chung cho Sản xuất) ----
    initCrudModule({
      table: 'shelf_life_reference',
      overlayId: 'add-shelf-life-overlay',
      openBtnId: 'btn-open-add-shelf-life',
      closeBtnId: 'btn-close-add-shelf-life',
      cancelBtnId: 'btn-cancel-add-shelf-life',
      formId: 'form-add-shelf-life',
      tbodyId: 'shelf-life-tbody',
      modalTitleId: 'add-shelf-life-modal-title',
      submitBtnId: 'btn-submit-add-shelf-life',
      addTitle: 'Thêm sản phẩm',
      addLabel: 'Thêm',
      editTitle: 'Sửa hạn sử dụng',
      editLabel: 'Lưu thay đổi',
      cellCount: 3,
      orderBy: [{ column: 'san_pham', ascending: true }],
      emptyMessage: 'Chưa khai báo hạn sử dụng cho sản phẩm nào.',
      validate: function(payload){ return !!payload.san_pham && payload.han_su_dung_ngay != null; },
      validateMessage: 'Vui lòng nhập Sản phẩm và Hạn sử dụng (ngày).',
      readForm: function(){
        return {
          san_pham: fieldVal('sl-san-pham'),
          han_su_dung_ngay: parseQty(fieldVal('sl-han-ngay')),
          ghi_chu: fieldVal('sl-ghichu')
        };
      },
      fillForm: function(form, tr){
        document.getElementById('sl-san-pham').value = tr.dataset.sanPham || '';
        document.getElementById('sl-han-ngay').value = tr.dataset.hanNgay || '';
        document.getElementById('sl-ghichu').value = tr.dataset.ghiChu || '';
      },
      deleteLabel: function(tr){ return 'hạn sử dụng của "' + (tr.dataset.sanPham || '') + '"'; },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.sanPham = d.san_pham || '';
        tr.dataset.hanNgay = d.han_su_dung_ngay != null ? d.han_su_dung_ngay : '';
        tr.dataset.ghiChu = d.ghi_chu || '';
        tr.cells[0].textContent = d.san_pham || '—';
        tr.cells[1].textContent = d.han_su_dung_ngay != null ? (d.han_su_dung_ngay + ' ngày') : '—';
        tr.cells[2].textContent = d.ghi_chu || '—';
      },
      afterRender: function(rows){
        const map = {};
        rows.forEach(function(r){
          if(r.san_pham && r.han_su_dung_ngay != null) map[normalizeSanPham(r.san_pham)] = r.han_su_dung_ngay;
        });
        sharedShelfLifeMap = map;
        notifyShelfLifeChanged();
      }
    });
  })();

  // ---- Tổng quan (tổng hợp read-only từ các bảng khác) ----
  (function(){
    const kpiActive = document.getElementById('kpi-active-batches');
    const kpiContainers = document.getElementById('kpi-containers');
    const kpiQcRate = document.getElementById('kpi-qc-rate');
    const kpiSatisfaction = document.getElementById('kpi-satisfaction');
    const recentTbody = document.getElementById('overview-recent-tbody');
    const alertsList = document.getElementById('alerts-list');
    const calGrid = document.getElementById('calendar-grid');
    const calLabel = document.getElementById('cal-month-label');
    const calPrevBtn = document.getElementById('cal-prev-month');
    const calNextBtn = document.getElementById('cal-next-month');
    let calViewDate = new Date();
    let calShipRows = [], calDocRows = [], calFbRows = [], calPoRows = [];
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
    function renderAlerts(missingDocsCount, docsOverdueCount, overdueFeedbackCount, unresolvedFeedbackOverdueCount, qcPendingCount, staleInventoryCount, pendingOrderCount, pendingProductionCount, upcomingDeliveryCount, upcomingContainerEtaCount){
      if(!alertsList) return;
      alertsList.textContent = '';
      const items = [
        { count: upcomingDeliveryCount, icon: 'ti-calendar-exclamation', chip: 'nic-red', text: 'đơn sắp/đã tới hạn giao (trong ' + DELIVERY_WARNING_DAYS + ' ngày) mà chưa đóng hàng', sub: 'Đơn hàng', tab: 'donhang' },
        { count: upcomingContainerEtaCount, icon: 'ti-ship', chip: 'nic-blue', text: 'container sắp/đã tới ETA (trong ' + ETA_WARNING_DAYS + ' ngày) mà chưa ghi nhận khách nhận hàng', sub: 'Logistics', tab: 'logistics' },
        { count: docsOverdueCount, icon: 'ti-file-alert', chip: 'nic-red', text: 'lô đã QUÁ HẠN bổ sung chứng từ', sub: 'Chứng từ', tab: 'docs' },
        { count: unresolvedFeedbackOverdueCount, icon: 'ti-message-exclamation', chip: 'nic-red', text: 'khiếu nại khách hàng đã QUÁ HẠN xử lý', sub: 'Feedback KH', tab: 'feedback' },
        { count: pendingOrderCount, icon: 'ti-shopping-cart', chip: 'nic-amber', text: 'đơn đã chốt nhưng chưa có nguyên liệu', sub: 'Đơn hàng', tab: 'donhang' },
        { count: pendingProductionCount, icon: 'ti-building-factory-2', chip: 'nic-amber', text: 'lô đã có nguyên liệu nhưng chưa cập nhật sản xuất', sub: 'Xưởng Ba Phi', tab: 'factory' },
        { count: missingDocsCount, icon: 'ti-file-text', chip: 'nic-amber', text: 'lô đang thiếu chứng từ trước khi thông quan', sub: 'Chứng từ', tab: 'docs' },
        { count: overdueFeedbackCount, icon: 'ti-message-star', chip: 'nic-amber', text: 'lô đã quá hạn phản hồi khách hàng (quá ' + FEEDBACK_DEADLINE_DAYS + ' ngày)', sub: 'Feedback KH', tab: 'feedback' },
        { count: qcPendingCount, icon: 'ti-clipboard-check', chip: 'nic-blue', text: 'lô đang chờ QC xác nhận kết quả', sub: 'Đánh giá chất lượng', tab: 'qc' },
        { count: staleInventoryCount, icon: 'ti-package', chip: 'nic-amber', text: 'lô tồn kho quá ' + INVENTORY_STALE_DAYS + ' ngày chưa xuất hết', sub: 'Xưởng Ba Phi', tab: 'factory' }
      ].filter(function(item){ return item.count > 0; });

      notifyAlertItemsChanged(items);

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

    // "Lịch deadline tổng hợp" — gộp 4 loại hạn đang tính rời rạc trong
    // renderAlerts (giao hàng/ETA/chứng từ/feedback) thành 1 lịch tháng, để
    // thấy được ngày nào dồn nhiều việc cùng lúc thay vì chỉ đọc 1 danh sách
    // phẳng. Dùng lại đúng dữ liệu loadOverview đã tải, không query thêm.
    const CAL_TYPE_CLASS = { delivery: 'amber', eta: 'blue', docs: 'red', feedback: 'green', supplierDelivery: 'violet', expiry: 'teal' };
    const CAL_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    function collectCalendarEvents(){
      const events = {};
      function push(dateStr, type, label, tab){
        if(!dateStr) return;
        if(!events[dateStr]) events[dateStr] = [];
        events[dateStr].push({ type: type, label: label, tab: tab });
      }
      Object.values(sharedBatchSummaries).forEach(function(b){
        if(b.ngayGiaoMongMuon && b.orderStatus !== 'Đã đóng hàng'){
          push(b.ngayGiaoMongMuon, 'delivery', b.batch + ' — hạn giao hàng', 'donhang');
        }
      });
      calShipRows.forEach(function(d){
        if(d.eta && d.stage !== 'Khách đã nhận hàng'){
          push(d.eta, 'eta', (d.batch_code || '—') + ' — ETA container', 'logistics');
        }
      });
      calDocRows.forEach(function(d){
        const missing = !d.contract_ok || !d.co_ok || !d.quarantine_ok || !d.bill_of_lading_ok;
        if(d.deadline && missing){
          push(d.deadline, 'docs', (d.batch_code || '—') + ' — hạn bổ sung chứng từ', 'docs');
        }
      });
      calFbRows.forEach(function(d){
        if(d.response_deadline && d.status !== 'Đã xử lý'){
          push(d.response_deadline, 'feedback', (d.batch_code || '—') + ' — hạn phản hồi KH', 'feedback');
        }
      });
      // NCC đã hứa ngày giao (ngay_hen_giao) nhưng chưa có ngày giao thực tế
      // — mốc đầu chuỗi cung ứng, biết trước để kịp xử lý thay vì chỉ tính
      // "% đúng hẹn" sau khi việc đã xong (như bảng Đánh giá NCC đang làm).
      calPoRows.forEach(function(p){
        if(p.ngay_hen_giao && !p.ngay_giao_thuc_te){
          push(p.ngay_hen_giao, 'supplierDelivery', (p.supplier_name || 'NCC') + ' — hạn giao lô ' + (p.batch_code || ''), 'ncc');
        }
      });
      // Thùng thành phẩm còn tồn kho sắp/đã hết hạn sử dụng (FEFO) — lấy từ
      // sharedExpiringStock do Tồn kho công bố, không tính lại.
      sharedExpiringStock.forEach(function(s){
        push(s.expiryDate, 'expiry', s.batch + (s.sanPham ? ' (' + s.sanPham + ')' : '') + ' — hạn sử dụng còn ' + s.remainingDays + ' ngày', 'factory');
      });
      return events;
    }

    function renderCalendar(){
      if(!calGrid) return;
      const events = collectCalendarEvents();
      const year = calViewDate.getFullYear();
      const month = calViewDate.getMonth();
      if(calLabel) calLabel.textContent = 'Tháng ' + (month + 1) + '/' + year;

      calGrid.textContent = '';
      CAL_WEEKDAYS.forEach(function(w){
        const el = document.createElement('div');
        el.className = 'cal-weekday';
        el.textContent = w;
        calGrid.appendChild(el);
      });

      const firstDay = new Date(year, month, 1);
      const startOffset = (firstDay.getDay() + 6) % 7; // Thứ 2 làm đầu tuần
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const todayNow = todayStr();

      for(let i = 0; i < startOffset; i++){
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        calGrid.appendChild(empty);
      }

      for(let day = 1; day <= daysInMonth; day++){
        const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const cell = document.createElement('div');
        cell.className = 'cal-day' + (dateStr === todayNow ? ' today' : '');
        const num = document.createElement('div');
        num.className = 'cal-day-num';
        num.textContent = String(day);
        cell.appendChild(num);

        const dayEvents = events[dateStr];
        if(dayEvents && dayEvents.length){
          cell.classList.add('cal-day-events');
          const dots = document.createElement('div');
          dots.className = 'cal-day-dots';
          dayEvents.forEach(function(ev){
            const dot = document.createElement('span');
            dot.className = 'cal-dot ' + (CAL_TYPE_CLASS[ev.type] || 'amber');
            dots.appendChild(dot);
          });
          cell.appendChild(dots);
          cell.title = dayEvents.map(function(ev){ return ev.label; }).join('\n');
          cell.addEventListener('click', function(){ goTab(dayEvents[0].tab); });
        }
        calGrid.appendChild(cell);
      }
    }

    if(calPrevBtn){
      calPrevBtn.addEventListener('click', function(){
        calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1);
        renderCalendar();
      });
    }
    if(calNextBtn){
      calNextBtn.addEventListener('click', function(){
        calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1);
        renderCalendar();
      });
    }

    async function loadOverview(){
      try{
        const [qcRes, shipRes, docRes, fbRes, poRes] = await Promise.all([
          sb.from('qc_checks').select('*').is('deleted_at', null),
          sb.from('shipments').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          sb.from('documents_checklist').select('*'),
          sb.from('feedbacks').select('*').is('deleted_at', null),
          sb.from('purchase_orders').select('batch_code, supplier_name, ngay_hen_giao, ngay_giao_thuc_te').is('deleted_at', null)
        ]);
        [qcRes, shipRes, docRes, fbRes, poRes].forEach(function(r){ if(r.error) throw r.error; });

        const qcRows = qcRes.data, shipRows = shipRes.data, docRows = docRes.data, fbRows = fbRes.data, poRows = poRes.data;

        // ---- Kỳ đang chọn ở đầu tab (áp cho 4 thẻ KPI) ----
        // Chưa có giá trị (lúc mới tải, trước khi populateSelectors chạy) →
        // không lọc. Lô/lượt không có ngày → KHÔNG tính vào KPI theo kỳ (dữ
        // liệu chưa đủ để xếp vào tháng/năm nào) — khác các danh sách ở #1
        // (danh sách vẫn hiện lô chưa có ngày).
        const _ovYearEl = document.getElementById('chart-year-select');
        const _ovMonthEl = document.getElementById('chart-month-select');
        const ovPeriod = (_ovYearEl && _ovYearEl.value)
          ? { year: Number(_ovYearEl.value), month: (_ovMonthEl && _ovMonthEl.value) ? Number(_ovMonthEl.value) : null }
          : null;
        function inOvPeriod(dateStr){
          if(!ovPeriod) return true;
          const p = periodParts(dateStr);
          if(!p) return false;
          if(p.year !== ovPeriod.year) return false;
          if(ovPeriod.month && p.month !== ovPeriod.month) return false;
          return true;
        }
        function batchInOvPeriod(batchCode){
          const b = sharedBatchSummaries[batchCode];
          return inOvPeriod(b && b.periodDate);
        }

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
          .filter(function(b){ return b.hasSourceInfo && batchInOvPeriod(b.batch) && batchQcStatus(b.batch) !== 'Đạt'; })
          .length;
        const activeShipments = shipRows.filter(function(d){ return d.stage !== 'Khách đã nhận hàng' && batchInOvPeriod(d.batch_code); }).length;
        const ratings = fbRows.filter(function(d){ return d.rating != null && batchInOvPeriod(d.batch_code); }).map(function(d){ return d.rating; });
        const avgRating = ratings.length ? ratings.reduce(function(a, b){ return a + b; }, 0) / ratings.length : null;

        // Tỷ lệ đạt QC = Σ số lượng đạt / Σ số lượng kiểm (có trọng số theo
        // số lượng thực) — giống hệt bảng QC (pickBatchPassRate) và Đánh giá
        // NCC. Lượt kiểm chưa nhập số lượng thì tạm coi là 1 đơn vị đạt/không
        // theo Kết quả; lượt "Chờ xác nhận" chưa có số lượng thì bỏ qua.
        let qcKiem = 0, qcDat = 0;
        qcRows.forEach(function(d){
          if(!batchInOvPeriod(d.batch_code)) return;
          if(d.so_luong_kiem != null && Number(d.so_luong_kiem) > 0){
            qcKiem += Number(d.so_luong_kiem);
            qcDat += d.so_luong_dat != null ? Number(d.so_luong_dat) : 0;
          } else if(d.result && d.result !== 'Chờ xác nhận'){
            qcKiem += 1;
            qcDat += (d.result === 'Đạt') ? 1 : 0;
          }
        });
        const qcRatePct = qcKiem ? Math.round(qcDat / qcKiem * 100) : null;

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
        // Đếm theo LÔ (số lô có ít nhất 1 lượt kiểm "Chờ xác nhận"), không
        // theo từng lượt kiểm — 1 lô nhiều lượt chờ vẫn chỉ là 1 việc cần QC xử lý.
        const qcPendingCount = new Set(
          qcRows.filter(function(d){ return d.result === 'Chờ xác nhận'; }).map(function(d){ return d.batch_code; })
        ).size;
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
        const pendingOrderCount = countPendingRawMaterial();
        // Đã có nguyên liệu (Vùng nguyên liệu) nhưng Xưởng Ba Phi chưa bấm
        // "Cập nhật sản xuất" cho lượt nào — cùng ý nghĩa với badge "Chưa
        // sản xuất" đang hiện ở bảng Sản xuất, chỉ khác là đếm ở đây để nhắc
        // ngay từ Tổng quan, không cần mở đúng tab Xưởng Ba Phi mới thấy.
        const pendingProductionCount = countPendingProduction();
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
        renderAlerts(missingDocsCount, docsOverdueCount, overdueFeedbackCount, unresolvedFeedbackOverdueCount, qcPendingCount, staleInventoryCount, pendingOrderCount, pendingProductionCount, upcomingDeliveryCount, upcomingContainerEtaCount);

        calShipRows = shipRows;
        calDocRows = docRows;
        calFbRows = fbRows;
        calPoRows = poRows;
        renderCalendar();

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
    onExpiringStockChanged(loadOverview);
    // Đổi kỳ ở đầu tab → tính lại 4 thẻ KPI (biểu đồ bên dưới có listener
    // riêng trong IIFE biểu đồ). Cùng lắng 1 element, 2 listener chạy độc lập.
    ['chart-month-select', 'chart-year-select'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.addEventListener('change', loadOverview);
    });
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
          // Phần "dạt" của tháng SẢN XUẤT đó đã được Xử lý (bán chợ/gán bù
          // qua lô khác) không còn là hao hụt thật — cộng vào "thành phẩm
          // hiệu quả" của đúng tháng sản xuất ra nó, cùng cách đã trừ ở
          // bảng chi tiết Xưởng Ba Phi (không giấu, vẫn ghi rõ qua tooltip).
          const resolved = resolvedDatByYearMonth[year + '-' + (i + 1)] || 0;
          const netOutput = lossOutputByMonth[i] + resolved;
          const pct = hasData ? Math.round((1 - netOutput / input) * 100) : 0;
          return {
            label: MONTH_NAMES[i],
            value: hasData ? Math.max(pct, 0) : 0,
            color: pct > 15 ? 'var(--red)' : 'var(--amber)',
            muted: monthFilter ? (i + 1 !== monthFilter) : false,
            tooltip: hasData ? ('Tháng ' + (i + 1) + '/' + year + ': hao hụt ' + pct + '%' + (resolved > 0 ? ' (đã trừ ' + Number(resolved).toLocaleString('vi-VN') + ' trái dạt đã xử lý)' : '')) : ('Tháng ' + (i + 1) + '/' + year + ': chưa có dữ liệu')
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
        // Trọng số theo SỐ LƯỢNG (Σ đạt / Σ kiểm) — giống KPI Tổng quan,
        // bảng QC và Đánh giá NCC. Lượt chưa nhập số lượng → tạm 1 đơn vị.
        const qcKiemByMonth = new Array(12).fill(0);
        const qcDatByMonth = new Array(12).fill(0);
        qcCheckRows.forEach(function(q){
          const p = periodParts(q.created_at);
          if(!p || p.year !== year) return;
          let kiem = 0, dat = 0;
          if(q.so_luong_kiem != null && Number(q.so_luong_kiem) > 0){
            kiem = Number(q.so_luong_kiem);
            dat = q.so_luong_dat != null ? Number(q.so_luong_dat) : 0;
          } else if(q.result && q.result !== 'Chờ xác nhận'){
            kiem = 1; dat = (q.result === 'Đạt') ? 1 : 0;
          } else {
            return;
          }
          qcKiemByMonth[p.month - 1] += kiem;
          qcDatByMonth[p.month - 1] += dat;
        });
        const qcRateItems = qcKiemByMonth.map(function(kiem, i){
          const pct = kiem > 0 ? Math.round(qcDatByMonth[i] / kiem * 100) : 0;
          return {
            label: MONTH_NAMES[i],
            value: pct,
            color: 'var(--forest)',
            muted: monthFilter ? (i + 1 !== monthFilter) : false,
            tooltip: kiem > 0 ? ('Tháng ' + (i + 1) + '/' + year + ': đạt ' + pct + '%') : ('Tháng ' + (i + 1) + '/' + year + ': chưa có lượt kiểm')
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

    // Trái "dạt" đã Xử lý (bán chợ/gán bù qua lô khác — xem "Xử lý hàng
    // tồn & rớt" ở Xưởng Ba Phi), gộp theo THÁNG SẢN XUẤT ra đợt dạt đó
    // (không phải tháng bấm Xử lý) — cũng không có sẵn trong
    // sharedBatchSummaries nên tự tải riêng, giống qcCheckRows ở trên.
    let resolvedDatByYearMonth = {};
    async function refreshResolvedDatCache(){
      if(!lossContainer) { renderCharts(); return; }
      try{
        const [rawRes, procRes] = await Promise.all([
          sb.from('raw_batches').select('id, factory_batches(production_date)').is('deleted_at', null),
          sb.from('factory_culled_processing').select('raw_batch_id, qty_trai').eq('source_type', 'dat').is('deleted_at', null)
        ]);
        if(rawRes.error) throw rawRes.error;
        if(procRes.error) throw procRes.error;
        const prodDateByRawId = {};
        (rawRes.data || []).forEach(function(r){
          const fb = Array.isArray(r.factory_batches) ? r.factory_batches[0] : r.factory_batches;
          if(fb && fb.production_date) prodDateByRawId[r.id] = fb.production_date;
        });
        const byKey = {};
        (procRes.data || []).forEach(function(p){
          const prodDate = p.raw_batch_id != null ? prodDateByRawId[p.raw_batch_id] : null;
          const parts = prodDate ? periodParts(prodDate) : null;
          if(!parts) return;
          const key = parts.year + '-' + parts.month;
          byKey[key] = (byKey[key] || 0) + Number(p.qty_trai || 0);
        });
        resolvedDatByYearMonth = byKey;
      } catch(err){
        console.error('Không tải được dữ liệu dạt đã xử lý cho biểu đồ:', err);
        resolvedDatByYearMonth = {};
      }
      renderCharts();
    }

    populateSelectors();
    refreshQcChecksCache();
    refreshResolvedDatCache();

    monthSelect.addEventListener('change', renderCharts);
    yearSelect.addEventListener('change', function(){ renderCharts(); });
    onBatchSummaryChanged(function(){ populateSelectors(); refreshQcChecksCache(); });
    onFactoryProductionChanged(refreshResolvedDatCache);
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
      ['xuat_khau', 'Xuất khẩu'],
      ['ke_toan_xuong', 'Kế toán xưởng']
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
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshUsers();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
      }
    }

    // Không thể tự đặt mật khẩu thay người khác từ client (cần service_role)
    // — cách an toàn duy nhất là gửi email đặt lại mật khẩu để họ tự đặt.
    // Cần dự án đã cấu hình gửi email (SMTP) hoạt động đúng thì email mới
    // thực sự tới nơi.
    async function sendPasswordReset(u){
      if(!u.email){ showErrorToast('Tài khoản này chưa có email.'); return; }
      const ok = await confirmDialog('Gửi email đặt lại mật khẩu tới ' + u.email + '?', { title: 'Xác nhận', okLabel: 'Gửi', danger: false });
      if(!ok) return;
      try{
        const { error } = await sb.auth.resetPasswordForEmail(u.email);
        if(error) throw error;
        showErrorToast('Đã gửi email đặt lại mật khẩu tới ' + u.email + ' (nếu không thấy, kiểm tra thư mục spam, hoặc Supabase chưa cấu hình gửi email).');
      } catch(err){
        showErrorToast('Không thể gửi email: ' + err.message);
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
        showErrorToast('Không thể khôi phục: ' + err.message);
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
        showErrorToast('Không thể xóa vĩnh viễn: ' + err.message);
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
      ['feedback_kh', 'Feedback KH'],
      ['thu_mua_ban_cho', 'Thu mua & Bán chợ']
    ];
    const PERMISSION_ROLES = ['san_xuat', 'ncc', 'qc', 'xuat_khau', 'ke_toan_xuong'];

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
          showErrorToast('Không thể lưu quyền: ' + err.message);
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

  // ---- Lịch sử hoạt động (audit log, chỉ Admin xem) ----
  // Đọc bảng public.audit_log — được ghi tự động bởi trigger DB trên các
  // bảng nghiệp vụ chính (xem supabase/2026-08-25_audit_log.sql). Không có
  // đường ghi nào từ client, bảng này chỉ đọc.
  (function(){
    const tbody = document.getElementById('audit-tbody');
    const searchInput = document.getElementById('audit-search-input');
    const moduleSelect = document.getElementById('audit-module-select');
    const loadMoreBtn = document.getElementById('btn-audit-load-more');
    if(!tbody || !sb) return;

    const TABLE_LABELS = {
      raw_batches: 'Vùng nguyên liệu',
      raw_suppliers: 'Vùng nguyên liệu — đầu mối',
      suppliers: 'Nhà cung cấp',
      purchase_orders: 'Nhà cung cấp — PO',
      factory_batches: 'Xưởng Ba Phi — sản xuất',
      factory_batch_boxes: 'Xưởng Ba Phi — đóng thùng',
      factory_finished_stock: 'Xưởng Ba Phi — tồn kho',
      factory_staff: 'Xưởng Ba Phi — nhân sự',
      factory_culled_processing: 'Xưởng Ba Phi — hàng dạt/tồn',
      shelf_life_reference: 'Xưởng Ba Phi — hạn sử dụng',
      qc_checks: 'Đánh giá chất lượng',
      shipments: 'Logistics',
      documents_checklist: 'Chứng từ',
      feedbacks: 'Feedback KH',
      batch_info: 'Đơn hàng',
      batch_info_products: 'Đơn hàng — sản phẩm',
      batch_trace_products: 'Đơn hàng — mã QR sản phẩm',
      market_purchases: 'Thu mua & Bán chợ — thu mua',
      market_processing: 'Thu mua & Bán chợ — sơ chế',
      market_processing_sources: 'Thu mua & Bán chợ — sơ chế (nguồn)',
      market_processing_outputs: 'Thu mua & Bán chợ — sơ chế (đầu ra)',
      market_sales: 'Thu mua & Bán chợ — bán chợ',
      profiles: 'Quản lý tài khoản',
      module_permissions: 'Quản lý tài khoản — phân quyền'
    };

    function describeRow(tableName, data){
      if(!data) return '—';
      if(tableName === 'module_permissions') return (data.role || '—') + ' — ' + (data.module_key || '') + ' → ' + (data.access_level || '');
      if(tableName === 'profiles') return data.email || data.full_name || '—';
      return data.batch_code || data.batch || data.po_code || data.name || data.full_name ||
        data.ten_san_pham || data.nguon_mua || data.san_pham || ('#' + (data.id != null ? data.id : '—'));
    }

    function actionLabel(entry){
      if(entry.action === 'insert') return 'Thêm';
      if(entry.action === 'delete') return 'Xóa vĩnh viễn';
      const oldD = entry.old_data || {};
      const newD = entry.new_data || {};
      if('deleted_at' in newD){
        const wasDeleted = !!oldD.deleted_at, nowDeleted = !!newD.deleted_at;
        if(!wasDeleted && nowDeleted) return 'Xóa (vào thùng rác)';
        if(wasDeleted && !nowDeleted) return 'Khôi phục';
      }
      return 'Sửa';
    }

    function fmtDateTime(value){
      const d = new Date(value);
      if(isNaN(d.getTime())) return '—';
      const pad = function(n){ return String(n).padStart(2, '0'); };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function showMessage(text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    let allRows = [];
    let pageSize = 100;

    function populateModuleFilter(){
      const current = moduleSelect.value;
      const seen = {};
      allRows.forEach(function(r){ seen[r.table_name] = true; });
      moduleSelect.textContent = '';
      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'Tất cả khu vực';
      moduleSelect.appendChild(allOpt);
      Object.keys(seen).sort().forEach(function(t){
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = TABLE_LABELS[t] || t;
        moduleSelect.appendChild(opt);
      });
      moduleSelect.value = current || '';
    }

    function render(){
      const q = (searchInput.value || '').trim().toLowerCase();
      const moduleFilter = moduleSelect.value;
      const filtered = allRows.filter(function(r){
        if(moduleFilter && r.table_name !== moduleFilter) return false;
        if(!q) return true;
        const hay = [r.actor_email, ROLE_LABELS[r.actor_role] || r.actor_role, describeRow(r.table_name, r.new_data || r.old_data), r.batch_code]
          .join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if(!filtered.length){ showMessage(allRows.length ? 'Không có kết quả khớp.' : 'Chưa có hoạt động nào được ghi nhận.'); return; }
      tbody.textContent = '';
      filtered.forEach(function(r){
        const tr = document.createElement('tr');
        [
          fmtDateTime(r.created_at),
          (r.actor_email || '—') + (r.actor_role ? ' (' + (ROLE_LABELS[r.actor_role] || r.actor_role) + ')' : ''),
          actionLabel(r),
          TABLE_LABELS[r.table_name] || r.table_name,
          describeRow(r.table_name, r.new_data || r.old_data)
        ].forEach(function(text){
          const td = document.createElement('td');
          td.textContent = text;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    async function load(){
      try{
        const { data, error } = await sb.from('audit_log')
          .select('created_at,actor_email,actor_role,action,table_name,batch_code,old_data,new_data')
          .order('created_at', { ascending: false })
          .range(0, pageSize - 1);
        if(error) throw error;
        allRows = data || [];
        if(loadMoreBtn) loadMoreBtn.style.display = allRows.length >= pageSize ? '' : 'none';
        populateModuleFilter();
        render();
      } catch(err){
        console.error('Không tải được lịch sử hoạt động:', err);
        showMessage('Không tải được dữ liệu — kiểm tra kết nối Supabase (đã chạy migration audit_log chưa?).', 'var(--red)');
      }
    }

    if(searchInput) searchInput.addEventListener('input', render);
    if(moduleSelect) moduleSelect.addEventListener('change', render);
    if(loadMoreBtn){
      loadMoreBtn.addEventListener('click', function(){
        pageSize += 100;
        load();
      });
    }

    showMessage('Đang tải dữ liệu...');
    load();
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

    // Chỉ đổi DOM, KHÔNG đụng tới lịch sử — popstate và traceModuleOpen gọi
    // hàm này để hiện/ẩn khối chi tiết.
    orderDetailClose = function(){
      if(detailSection) detailSection.style.display = 'none';
      if(listSection) listSection.style.display = '';
    };
    orderDetailOpen = function(batchCode){
      if(!batchCode) return;
      if(listSection) listSection.style.display = 'none';
      if(detailSection) detailSection.style.display = '';
      loadBatch(batchCode);
    };

    if(backBtn){
      backBtn.addEventListener('click', function(){
        // Nút Back trong app và nút Back của trình duyệt phải cho cùng 1 kết
        // quả — bấm nút này thì lùi lịch sử thay vì tự đổi DOM, để mốc
        // "đang xem chi tiết" (do traceModuleOpen ghi) bị gỡ đúng cách, và
        // Back tiếp theo của chuột không nhảy xộc ra ngoài app.
        if(location.hash.indexOf('/order/') !== -1) history.back();
        else orderDetailClose();
      });
    }

    showPlaceholder('Chọn 1 lô hàng ở bảng danh sách để xem toàn bộ hành trình.');

    traceModuleOpen = function(batchCode){
      if(!batchCode) return;
      const url = hashForOrder(batchCode);
      if(location.hash !== url) history.pushState({ tab: 'donhang', subtab: null, order: batchCode }, '', url);
      orderDetailOpen(batchCode);
    };
  })();

  // ---- Tìm kiếm toàn cục (topbar) ----
  // Gộp 2 nguồn: lô hàng (đọc thẳng sharedBatchSummaries đã có sẵn trong bộ
  // nhớ — cùng 1 nguồn dữ liệu QC dùng cho toàn hệ thống, không tự query lại)
  // và nhà cung cấp (bảng suppliers nhỏ nên query nhẹ trực tiếp, không giữ
  // cache riêng). Bấm 1 lô hàng thì mở thẳng "Truy xuất lô hàng" (tái dùng
  // goToBatchTrace đã có); bấm 1 NCC thì nhảy tab Nhà cung cấp và nháy sáng
  // đúng dòng trong bảng suppliers-tbody.
  (function(){
    const input = document.getElementById('global-search-input');
    const resultsEl = document.getElementById('global-search-results');
    const wrap = document.getElementById('global-search');
    if(!input || !resultsEl || !wrap || !sb) return;

    let activeIndex = -1;
    let currentItems = [];
    let requestSeq = 0;
    let debounceTimer = null;

    function closeResults(){
      resultsEl.classList.remove('open');
      resultsEl.textContent = '';
      currentItems = [];
      activeIndex = -1;
    }

    function highlightRow(tbodyId, name){
      const tr = document.querySelector('#' + tbodyId + ' tr[data-name="' + CSS.escape(name) + '"]');
      if(!tr) return;
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tr.classList.remove('row-flash');
      void tr.offsetWidth;
      tr.classList.add('row-flash');
    }

    function selectItem(item){
      input.value = '';
      closeResults();
      if(item.kind === 'batch'){
        goToBatchTrace(item.batch);
      } else if(item.kind === 'supplier'){
        goTab('ncc');
        setTimeout(function(){ highlightRow('supplier-tbody', item.name); }, 60);
      }
    }

    function updateActive(){
      currentItems.forEach(function(el, i){ el.classList.toggle('active', i === activeIndex); });
      if(activeIndex >= 0) currentItems[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function renderResults(groups){
      resultsEl.textContent = '';
      currentItems = [];
      const hasAny = groups.some(function(g){ return g.items.length; });
      if(!hasAny){
        const empty = document.createElement('div');
        empty.className = 'gs-empty';
        empty.textContent = 'Không tìm thấy kết quả.';
        resultsEl.appendChild(empty);
        resultsEl.classList.add('open');
        return;
      }
      groups.forEach(function(g){
        if(!g.items.length) return;
        const label = document.createElement('div');
        label.className = 'gs-group-label';
        label.textContent = g.label;
        resultsEl.appendChild(label);
        g.items.forEach(function(item){
          const row = document.createElement('div');
          row.className = 'gs-item';
          const chip = document.createElement('span');
          chip.className = 'icon-chip ' + item.chip;
          const icon = document.createElement('i');
          icon.className = 'ti ' + item.icon;
          chip.appendChild(icon);
          const textWrap = document.createElement('div');
          const title = document.createElement('div');
          title.className = 'gs-item-title';
          title.textContent = item.title;
          textWrap.appendChild(title);
          if(item.sub){
            const sub = document.createElement('div');
            sub.className = 'gs-item-sub';
            sub.textContent = item.sub;
            textWrap.appendChild(sub);
          }
          row.appendChild(chip);
          row.appendChild(textWrap);
          row.addEventListener('click', function(){ selectItem(item); });
          resultsEl.appendChild(row);
          currentItems.push(row);
        });
      });
      activeIndex = -1;
      resultsEl.classList.add('open');
    }

    function searchBatches(q){
      return Object.values(sharedBatchSummaries)
        .filter(function(b){ return b.hasSourceInfo || b.hasOrderInfo; })
        .filter(function(b){
          const nccMatch = Array.from(b.nccSet || []).some(function(n){ return n.toLowerCase().indexOf(q) !== -1; });
          const catMatch = Array.from(b.categorySet || []).some(function(c){ return c.toLowerCase().indexOf(q) !== -1; });
          const khMatch = (b.khachHang || '').toLowerCase().indexOf(q) !== -1;
          return (b.batch || '').toLowerCase().indexOf(q) !== -1 || nccMatch || catMatch || khMatch;
        })
        .slice(0, 6)
        .map(function(b){
          const subParts = [];
          if(b.categorySet && b.categorySet.size) subParts.push(Array.from(b.categorySet).join(', '));
          if(b.nccSet && b.nccSet.size) subParts.push(Array.from(b.nccSet).join(', '));
          return {
            kind: 'batch', batch: b.batch, title: b.batch,
            sub: subParts.join(' · ') || null,
            icon: 'ti-package', chip: 'nic-blue'
          };
        });
    }

    async function searchSuppliers(q){
      try{
        const { data, error } = await sb.from('suppliers').select('name, category').is('deleted_at', null).ilike('name', '%' + q + '%').limit(6);
        if(error) throw error;
        return (data || []).map(function(s){
          return { kind: 'supplier', name: s.name, title: s.name, sub: s.category || null, icon: 'ti-truck-delivery', chip: 'nic-green' };
        });
      } catch(err){
        console.error('Không tìm được nhà cung cấp:', err);
        return [];
      }
    }

    input.addEventListener('input', function(){
      clearTimeout(debounceTimer);
      const q = input.value.trim().toLowerCase();
      if(!q){ closeResults(); return; }
      debounceTimer = setTimeout(async function(){
        const seq = ++requestSeq;
        const batchResults = searchBatches(q);
        const supplierResults = await searchSuppliers(q);
        if(seq !== requestSeq) return;
        renderResults([
          { label: 'Lô hàng', items: batchResults },
          { label: 'Nhà cung cấp', items: supplierResults }
        ]);
      }, 250);
    });

    input.addEventListener('keydown', function(e){
      if(!resultsEl.classList.contains('open') || !currentItems.length) return;
      if(e.key === 'ArrowDown'){
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
        updateActive();
      } else if(e.key === 'ArrowUp'){
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive();
      } else if(e.key === 'Enter'){
        e.preventDefault();
        if(activeIndex >= 0) currentItems[activeIndex].click();
        else if(currentItems.length) currentItems[0].click();
      } else if(e.key === 'Escape'){
        closeResults();
        input.blur();
      }
    });

    document.addEventListener('click', function(e){
      if(!wrap.contains(e.target)) closeResults();
    });
  })();

  // ---- Chuông thông báo "Cần xử lý ngay" (topbar) ---- Không tự tính/query
  // gì cả, chỉ nghe lại đúng danh sách Tổng quan đã tính qua
  // onAlertItemsChanged (xem renderAlerts) — đảm bảo số ở đây luôn khớp
  // 100% với khối "Cần xử lý ngay".
  (function(){
    const bellWrap = document.getElementById('notif-bell-wrap');
    const bellBtn = document.getElementById('notif-bell-btn');
    const bellPanel = document.getElementById('notif-bell-panel');
    const bellCount = document.getElementById('notif-bell-count');
    const bellList = document.getElementById('notif-bell-list');
    if(!bellWrap || !bellBtn || !bellPanel || !bellList) return;

    function closePanel(){ bellPanel.classList.remove('open'); }
    function togglePanel(){ bellPanel.classList.toggle('open'); }

    bellBtn.addEventListener('click', function(e){ e.stopPropagation(); togglePanel(); });
    document.addEventListener('click', function(e){
      if(!bellWrap.contains(e.target)) closePanel();
    });

    function render(items){
      const total = items.reduce(function(sum, item){ return sum + item.count; }, 0);
      if(bellCount){
        if(total > 0){ bellCount.textContent = total > 99 ? '99+' : String(total); bellCount.style.display = ''; }
        else { bellCount.style.display = 'none'; }
      }
      bellList.textContent = '';
      if(!items.length){
        const div = document.createElement('div');
        div.className = 'alert-empty';
        div.textContent = 'Không có việc gì cần xử lý gấp.';
        bellList.appendChild(div);
        return;
      }
      items.forEach(function(item){
        const row = document.createElement('div');
        row.className = 'alert-row';
        row.addEventListener('click', function(){ closePanel(); goTab(item.tab); });

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
        bellList.appendChild(row);
      });
    }

    onAlertItemsChanged(render);
  })();

  // ---- Thu mua & Bán chợ ----
  // Module ĐỘC LẬP hoàn toàn với chuỗi cung ứng xuất khẩu (không tham chiếu
  // raw_batches/purchase_orders/factory_batches/qc_checks...) — theo dõi thu
  // mua dừa trực tiếp, sơ chế và bán ra thị trường nội địa (bán chợ). Toàn bộ
  // số lượng hiện tính bằng trái (đơn vị khác cho sản phẩm sơ chế để sau).
  (function(){
    const section = document.getElementById('tab-thumua');
    if(!section || !sb) return;

    function parseQty(s){
      if(s === undefined || s === null) return null;
      const n = Number(String(s).replace(/\./g, '').trim());
      return isNaN(n) ? null : n;
    }
    function fmtQty(n){ return (n == null) ? '—' : Number(n).toLocaleString('vi-VN') + ' trái'; }
    function fmtMoney(n){ return (n == null) ? '—' : Number(n).toLocaleString('vi-VN') + ' đ'; }

    let latestPurchases = [];
    let latestProcessing = [];
    let latestSales = [];

    // Trái đã dùng từ mỗi lô thu mua, cộng dồn từ mọi lần sơ chế — trừ ra lần
    // sơ chế đang sửa (excludeProcessingId) để không tự trừ chính nó khi tính
    // "còn tồn" hiển thị ngay trong modal đang mở cho lần sơ chế đó.
    function usedTraiByPurchaseId(excludeProcessingId){
      const map = {};
      latestProcessing.forEach(function(p){
        if(excludeProcessingId != null && p.id === excludeProcessingId) return;
        (p.market_processing_sources || []).forEach(function(s){
          map[s.purchase_id] = (map[s.purchase_id] || 0) + (Number(s.so_trai_su_dung) || 0);
        });
      });
      return map;
    }
    function remainingForPurchase(purchase, usedMap){
      const used = usedMap[purchase.id] || 0;
      const total = Number(purchase.so_luong_trai) || 0;
      return total - used;
    }
    function outputTotalsBySanPham(){
      const map = {};
      latestProcessing.forEach(function(p){
        (p.market_processing_outputs || []).forEach(function(o){
          map[o.ten_san_pham] = (map[o.ten_san_pham] || 0) + (Number(o.so_luong_trai) || 0);
        });
      });
      return map;
    }
    function soldTotalsBySanPham(){
      const map = {};
      latestSales.forEach(function(s){
        map[s.ten_san_pham] = (map[s.ten_san_pham] || 0) + (Number(s.so_luong_trai) || 0);
      });
      return map;
    }
    function purchaseLabel(purchaseId){
      const p = latestPurchases.find(function(x){ return x.id === purchaseId; });
      if(!p) return '#' + purchaseId;
      return p.nguon_mua + (p.ngay_mua ? (' (' + fmtDate(p.ngay_mua) + ')') : '');
    }

    function showEmptyRow(tbody, colspan, text, color){
      tbody.textContent = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = colspan;
      td.style.textAlign = 'center';
      td.style.color = color || 'var(--ink-soft)';
      td.style.padding = '20px';
      td.textContent = text;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    // ---- Thẻ tổng quan + bảng tồn theo sản phẩm sơ chế ----
    const statTonTrai = document.getElementById('stat-tm-ton-trai');
    const statDaSoChe = document.getElementById('stat-tm-da-so-che');
    const statLaiGop = document.getElementById('stat-tm-lai-gop');
    const tonSanPhamTbody = document.getElementById('tm-tonkho-sanpham-tbody');
    const tonkhoExportBtn = document.getElementById('btn-export-tm-tonkho');
    if(tonkhoExportBtn){
      tonkhoExportBtn.addEventListener('click', function(){
        exportTableToExcel(tonSanPhamTbody.closest('table'), 'ton-kho-thu-mua-ban-cho-' + todayStr() + '.xlsx', 'Tồn kho');
      });
    }

    function recomputeSummary(){
      const totalPurchasedTrai = latestPurchases.reduce(function(sum, p){ return sum + (Number(p.so_luong_trai) || 0); }, 0);
      const usedMap = usedTraiByPurchaseId();
      const totalUsedTrai = Object.keys(usedMap).reduce(function(sum, k){ return sum + usedMap[k]; }, 0);
      const producedMap = outputTotalsBySanPham();
      const soldMap = soldTotalsBySanPham();
      const totalProduced = Object.keys(producedMap).reduce(function(sum, k){ return sum + producedMap[k]; }, 0);
      const totalCost = latestPurchases.reduce(function(sum, p){
        return sum + ((p.so_luong_trai != null && p.don_gia_mua != null) ? p.so_luong_trai * p.don_gia_mua : 0);
      }, 0);
      const totalRevenue = latestSales.reduce(function(sum, s){
        return sum + ((s.so_luong_trai != null && s.don_gia_ban != null) ? s.so_luong_trai * s.don_gia_ban : 0);
      }, 0);

      if(statTonTrai) statTonTrai.textContent = fmtQty(totalPurchasedTrai - totalUsedTrai);
      if(statDaSoChe) statDaSoChe.textContent = fmtQty(totalProduced);
      if(statLaiGop) statLaiGop.textContent = fmtMoney(totalRevenue - totalCost);

      if(tonSanPhamTbody){
        const names = Array.from(new Set(Object.keys(producedMap).concat(Object.keys(soldMap)))).sort(function(a, b){ return a.localeCompare(b, 'vi'); });
        if(!names.length){
          showEmptyRow(tonSanPhamTbody, 4, 'Chưa có sản phẩm sơ chế nào.');
        } else {
          tonSanPhamTbody.textContent = '';
          names.forEach(function(name){
            const produced = producedMap[name] || 0;
            const sold = soldMap[name] || 0;
            const tr = document.createElement('tr');
            tr.className = 'hoverable';
            [name, fmtQty(produced), fmtQty(sold), fmtQty(produced - sold)].forEach(function(text){
              const td = document.createElement('td');
              td.textContent = text;
              tr.appendChild(td);
            });
            tonSanPhamTbody.appendChild(tr);
          });
        }
        fillDatalist('dl-tm-san-pham', names);
      }
    }

    // ---- Thu mua ----
    const tmMuaSearchInput = document.getElementById('tm-mua-search-input');
    const tmMuaMonthSelect = document.getElementById('tm-mua-month-select');
    const tmMuaYearSelect = document.getElementById('tm-mua-year-select');
    const tmMuaExportBtn = document.getElementById('btn-export-tm-mua');

    function matchesTmMuaPeriod(d){
      if(!tmMuaYearSelect || !tmMuaYearSelect.value) return true;
      const p = periodParts(d.ngay_mua);
      // Chưa điền ngày mua — luôn hiện, đừng để dòng biến mất sau khi lưu.
      if(!p) return true;
      if(p.year !== Number(tmMuaYearSelect.value)) return false;
      if(tmMuaMonthSelect && tmMuaMonthSelect.value && p.month !== Number(tmMuaMonthSelect.value)) return false;
      return true;
    }
    function matchesTmMuaSearch(d){
      const q = (tmMuaSearchInput && tmMuaSearchInput.value || '').trim().toLowerCase();
      if(!q) return true;
      return (d.nguon_mua || '').toLowerCase().indexOf(q) !== -1;
    }
    function populateTmMuaPeriodSelect(rows){
      if(!tmMuaYearSelect) return;
      const years = rows.map(function(d){ const p = periodParts(d.ngay_mua); return p ? p.year : null; }).filter(Boolean);
      populateMonthYearSelect(tmMuaMonthSelect, tmMuaYearSelect, years);
    }

    const purchaseCrud = initCrudModule({
      table: 'market_purchases',
      overlayId: 'add-tm-mua-overlay',
      openBtnId: 'btn-open-add-tm-mua',
      closeBtnId: 'btn-close-add-tm-mua',
      cancelBtnId: 'btn-cancel-add-tm-mua',
      formId: 'form-add-tm-mua',
      tbodyId: 'tm-mua-tbody',
      modalTitleId: 'add-tm-mua-modal-title',
      submitBtnId: 'btn-submit-add-tm-mua',
      addTitle: 'Thêm lần thu mua',
      addLabel: 'Thêm',
      editTitle: 'Sửa lần thu mua',
      editLabel: 'Lưu thay đổi',
      cellCount: 7,
      orderBy: [{ column: 'ngay_mua', ascending: false }, { column: 'created_at', ascending: false }],
      emptyMessage: 'Chưa có lần thu mua nào.',
      emptyFilteredMessage: 'Không có lần thu mua nào khớp tìm kiếm/kỳ đã chọn.',
      // Có từ khóa tìm kiếm thì bỏ qua bộ lọc tháng/năm — nếu không, lần thu
      // mua nào thiếu ngày (ngay_mua null) sẽ vĩnh viễn không khớp kỳ nào cả,
      // ẩn mất khỏi tìm kiếm dù gõ đúng nguồn mua (cùng lý do như Vùng nguyên liệu).
      filterForDisplay: function(rows){
        const hasSearch = !!(tmMuaSearchInput && tmMuaSearchInput.value.trim());
        return rows.filter(function(d){ return matchesTmMuaSearch(d) && (hasSearch || matchesTmMuaPeriod(d)); });
      },
      validate: function(payload){ return !!payload.nguon_mua; },
      validateMessage: 'Vui lòng nhập Nguồn mua.',
      readForm: function(){
        return {
          ngay_mua: fieldVal('f-tm-mua-ngay') || null,
          nguon_mua: fieldVal('f-tm-mua-nguon'),
          so_luong_trai: parseQty(fieldVal('f-tm-mua-soluong')),
          don_gia_mua: parseQty(fieldVal('f-tm-mua-dongia')),
          ghi_chu: fieldVal('f-tm-mua-ghichu')
        };
      },
      fillForm: function(form, tr){
        document.getElementById('f-tm-mua-ngay').value = tr.dataset.ngayMua || '';
        document.getElementById('f-tm-mua-nguon').value = tr.dataset.nguonMua || '';
        document.getElementById('f-tm-mua-soluong').value = tr.dataset.soLuong || '';
        document.getElementById('f-tm-mua-dongia').value = tr.dataset.donGia || '';
        document.getElementById('f-tm-mua-ghichu').value = tr.dataset.ghiChu || '';
      },
      deleteLabel: function(tr){
        return 'lần thu mua "' + (tr.dataset.nguonMua || '') + (tr.dataset.ngayMua ? (' - ' + fmtDate(tr.dataset.ngayMua)) : '') + '"';
      },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.ngayMua = d.ngay_mua || '';
        tr.dataset.nguonMua = d.nguon_mua || '';
        tr.dataset.soLuong = d.so_luong_trai != null ? d.so_luong_trai : '';
        tr.dataset.donGia = d.don_gia_mua != null ? d.don_gia_mua : '';
        tr.dataset.ghiChu = d.ghi_chu || '';
        const remaining = remainingForPurchase(d, usedTraiByPurchaseId());
        const thanhTien = (d.so_luong_trai != null && d.don_gia_mua != null) ? d.so_luong_trai * d.don_gia_mua : null;
        tr.cells[0].textContent = d.ngay_mua ? fmtDate(d.ngay_mua) : '—';
        tr.cells[1].textContent = d.nguon_mua || '—';
        tr.cells[2].textContent = fmtQty(d.so_luong_trai);
        tr.cells[3].textContent = d.don_gia_mua != null ? (fmtMoney(d.don_gia_mua) + '/trái') : '—';
        tr.cells[4].textContent = fmtMoney(thanhTien);
        tr.cells[5].textContent = fmtQty(remaining);
        tr.cells[6].textContent = d.ghi_chu || '—';
      },
      afterRender: function(rows){
        latestPurchases = rows;
        fillDatalist('dl-tm-nguon-mua', Array.from(new Set(rows.map(function(r){ return r.nguon_mua; }).filter(Boolean))).sort(function(a, b){ return a.localeCompare(b, 'vi'); }));
        populateTmMuaPeriodSelect(rows);
        recomputeSummary();
      },
      afterSave: function(){ refreshAllMarketData(); }
    });

    if(tmMuaSearchInput) tmMuaSearchInput.addEventListener('input', function(){ if(purchaseCrud) purchaseCrud.refreshRows(); });
    if(tmMuaMonthSelect) tmMuaMonthSelect.addEventListener('change', function(){ if(purchaseCrud) purchaseCrud.refreshRows(); });
    if(tmMuaYearSelect) tmMuaYearSelect.addEventListener('change', function(){ if(purchaseCrud) purchaseCrud.refreshRows(); });
    if(tmMuaExportBtn){
      tmMuaExportBtn.addEventListener('click', function(){
        exportTableToExcel(document.getElementById('tm-mua-tbody').closest('table'), 'thu-mua-' + todayStr() + '.xlsx', 'Thu mua');
      });
    }

    // ---- Bán chợ ----
    const tmBanSearchInput = document.getElementById('tm-ban-search-input');
    const tmBanMonthSelect = document.getElementById('tm-ban-month-select');
    const tmBanYearSelect = document.getElementById('tm-ban-year-select');
    const tmBanExportBtn = document.getElementById('btn-export-tm-ban');

    function matchesTmBanPeriod(d){
      if(!tmBanYearSelect || !tmBanYearSelect.value) return true;
      const p = periodParts(d.ngay_ban);
      // Chưa điền ngày bán — luôn hiện, đừng để dòng biến mất sau khi lưu.
      if(!p) return true;
      if(p.year !== Number(tmBanYearSelect.value)) return false;
      if(tmBanMonthSelect && tmBanMonthSelect.value && p.month !== Number(tmBanMonthSelect.value)) return false;
      return true;
    }
    function matchesTmBanSearch(d){
      const q = (tmBanSearchInput && tmBanSearchInput.value || '').trim().toLowerCase();
      if(!q) return true;
      return (d.khach_hang || '').toLowerCase().indexOf(q) !== -1 || (d.ten_san_pham || '').toLowerCase().indexOf(q) !== -1;
    }
    function populateTmBanPeriodSelect(rows){
      if(!tmBanYearSelect) return;
      const years = rows.map(function(d){ const p = periodParts(d.ngay_ban); return p ? p.year : null; }).filter(Boolean);
      populateMonthYearSelect(tmBanMonthSelect, tmBanYearSelect, years);
    }

    const saleCrud = initCrudModule({
      table: 'market_sales',
      overlayId: 'add-tm-ban-overlay',
      openBtnId: 'btn-open-add-tm-ban',
      closeBtnId: 'btn-close-add-tm-ban',
      cancelBtnId: 'btn-cancel-add-tm-ban',
      formId: 'form-add-tm-ban',
      tbodyId: 'tm-ban-tbody',
      modalTitleId: 'add-tm-ban-modal-title',
      submitBtnId: 'btn-submit-add-tm-ban',
      addTitle: 'Thêm lần bán',
      addLabel: 'Thêm',
      editTitle: 'Sửa lần bán',
      editLabel: 'Lưu thay đổi',
      cellCount: 7,
      orderBy: [{ column: 'ngay_ban', ascending: false }, { column: 'created_at', ascending: false }],
      emptyMessage: 'Chưa có lần bán nào.',
      emptyFilteredMessage: 'Không có lần bán nào khớp tìm kiếm/kỳ đã chọn.',
      filterForDisplay: function(rows){
        const hasSearch = !!(tmBanSearchInput && tmBanSearchInput.value.trim());
        return rows.filter(function(d){ return matchesTmBanSearch(d) && (hasSearch || matchesTmBanPeriod(d)); });
      },
      validate: function(payload){ return !!payload.ten_san_pham; },
      validateMessage: 'Vui lòng nhập Sản phẩm.',
      readForm: function(){
        return {
          ngay_ban: fieldVal('f-tm-ban-ngay') || null,
          khach_hang: fieldVal('f-tm-ban-khach'),
          ten_san_pham: fieldVal('f-tm-ban-sanpham'),
          so_luong_trai: parseQty(fieldVal('f-tm-ban-soluong')),
          don_gia_ban: parseQty(fieldVal('f-tm-ban-dongia')),
          ghi_chu: fieldVal('f-tm-ban-ghichu')
        };
      },
      fillForm: function(form, tr){
        document.getElementById('f-tm-ban-ngay').value = tr.dataset.ngayBan || '';
        document.getElementById('f-tm-ban-khach').value = tr.dataset.khachHang || '';
        document.getElementById('f-tm-ban-sanpham').value = tr.dataset.tenSanPham || '';
        document.getElementById('f-tm-ban-soluong').value = tr.dataset.soLuong || '';
        document.getElementById('f-tm-ban-dongia').value = tr.dataset.donGia || '';
        document.getElementById('f-tm-ban-ghichu').value = tr.dataset.ghiChu || '';
      },
      deleteLabel: function(tr){
        return 'lần bán "' + (tr.dataset.tenSanPham || '') + (tr.dataset.ngayBan ? (' - ' + fmtDate(tr.dataset.ngayBan)) : '') + '"';
      },
      renderRow: function(tr, d){
        tr.dataset.id = d.id;
        tr.dataset.ngayBan = d.ngay_ban || '';
        tr.dataset.khachHang = d.khach_hang || '';
        tr.dataset.tenSanPham = d.ten_san_pham || '';
        tr.dataset.soLuong = d.so_luong_trai != null ? d.so_luong_trai : '';
        tr.dataset.donGia = d.don_gia_ban != null ? d.don_gia_ban : '';
        tr.dataset.ghiChu = d.ghi_chu || '';
        const thanhTien = (d.so_luong_trai != null && d.don_gia_ban != null) ? d.so_luong_trai * d.don_gia_ban : null;
        tr.cells[0].textContent = d.ngay_ban ? fmtDate(d.ngay_ban) : '—';
        tr.cells[1].textContent = d.khach_hang || '—';
        tr.cells[2].textContent = d.ten_san_pham || '—';
        tr.cells[3].textContent = fmtQty(d.so_luong_trai);
        tr.cells[4].textContent = d.don_gia_ban != null ? (fmtMoney(d.don_gia_ban) + '/trái') : '—';
        tr.cells[5].textContent = fmtMoney(thanhTien);
        tr.cells[6].textContent = d.ghi_chu || '—';
      },
      afterRender: function(rows){
        latestSales = rows;
        populateTmBanPeriodSelect(rows);
        recomputeSummary();
      },
      afterSave: function(){ refreshAllMarketData(); }
    });

    if(tmBanSearchInput) tmBanSearchInput.addEventListener('input', function(){ if(saleCrud) saleCrud.refreshRows(); });
    if(tmBanMonthSelect) tmBanMonthSelect.addEventListener('change', function(){ if(saleCrud) saleCrud.refreshRows(); });
    if(tmBanYearSelect) tmBanYearSelect.addEventListener('change', function(){ if(saleCrud) saleCrud.refreshRows(); });
    if(tmBanExportBtn){
      tmBanExportBtn.addEventListener('click', function(){
        exportTableToExcel(document.getElementById('tm-ban-tbody').closest('table'), 'ban-cho-' + todayStr() + '.xlsx', 'Bán chợ');
      });
    }

    // ---- Sơ chế (2 bảng con: nguồn nguyên liệu + sản phẩm đầu ra) ----
    // Không dùng initCrudModule vì cần lưu kèm 2 bảng con — theo đúng pattern
    // xóa hết rồi chèn lại (factory_batch_boxes) đã dùng ở Xưởng Ba Phi.
    const soOverlay = document.getElementById('add-tm-so-overlay');
    const soOpenBtn = document.getElementById('btn-open-add-tm-so');
    const soCloseBtn = document.getElementById('btn-close-add-tm-so');
    const soCancelBtn = document.getElementById('btn-cancel-add-tm-so');
    const soForm = document.getElementById('form-add-tm-so');
    const soTbody = document.getElementById('tm-so-tbody');
    const soModalTitle = document.getElementById('add-tm-so-modal-title');
    const soSubmitBtn = document.getElementById('btn-submit-add-tm-so');
    const sourcesListEl = document.getElementById('tm-so-sources-list');
    const outputsListEl = document.getElementById('tm-so-outputs-list');
    const addSourceBtn = document.getElementById('btn-tm-so-add-source');
    const addOutputBtn = document.getElementById('btn-tm-so-add-output');
    const tmSoMonthSelect = document.getElementById('tm-so-month-select');
    const tmSoYearSelect = document.getElementById('tm-so-year-select');
    const tmSoExportBtn = document.getElementById('btn-export-tm-so');

    let editingProcessingId = null;

    function matchesTmSoPeriod(d){
      if(!tmSoYearSelect || !tmSoYearSelect.value) return true;
      const p = periodParts(d.ngay_so_che);
      // Chưa điền ngày sơ chế — luôn hiện, đừng để dòng biến mất sau khi lưu.
      if(!p) return true;
      if(p.year !== Number(tmSoYearSelect.value)) return false;
      if(tmSoMonthSelect && tmSoMonthSelect.value && p.month !== Number(tmSoMonthSelect.value)) return false;
      return true;
    }
    function populateTmSoPeriodSelect(rows){
      if(!tmSoYearSelect) return;
      const years = rows.map(function(d){ const p = periodParts(d.ngay_so_che); return p ? p.year : null; }).filter(Boolean);
      populateMonthYearSelect(tmSoMonthSelect, tmSoYearSelect, years);
    }
    // Lọc CHỈ áp cho bảng hiển thị — latestProcessing giữ nguyên TOÀN BỘ dữ
    // liệu (mọi kỳ), vì còn dùng để tính "còn tồn" của Thu mua và các thẻ
    // tổng quan Tồn kho, không được phép chỉ tính theo kỳ đang lọc.
    function renderFilteredProcessingRows(){
      if(!soTbody) return;
      if(!latestProcessing.length){ showEmptyRow(soTbody, 8, 'Chưa có lần sơ chế nào.'); return; }
      const filtered = latestProcessing.filter(matchesTmSoPeriod);
      if(!filtered.length){ showEmptyRow(soTbody, 8, 'Không có lần sơ chế nào trong kỳ đã chọn.'); return; }
      renderProcessingRows(filtered);
    }
    if(tmSoMonthSelect) tmSoMonthSelect.addEventListener('change', renderFilteredProcessingRows);
    if(tmSoYearSelect) tmSoYearSelect.addEventListener('change', renderFilteredProcessingRows);
    if(tmSoExportBtn){
      tmSoExportBtn.addEventListener('click', function(){
        exportTableToExcel(soTbody.closest('table'), 'so-che-' + todayStr() + '.xlsx', 'Sơ chế');
      });
    }

    function populatePurchaseSelect(select, currentPurchaseId){
      select.textContent = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.disabled = true;
      placeholder.textContent = latestPurchases.length ? 'Chọn lô thu mua...' : 'Chưa có lần thu mua nào';
      select.appendChild(placeholder);
      const usedMap = usedTraiByPurchaseId(editingProcessingId);
      latestPurchases.forEach(function(p){
        const opt = document.createElement('option');
        opt.value = String(p.id);
        opt.textContent = (p.ngay_mua ? fmtDate(p.ngay_mua) : '—') + ' - ' + p.nguon_mua + ' (còn ' + fmtQty(remainingForPurchase(p, usedMap)) + ')';
        select.appendChild(opt);
      });
      select.value = currentPurchaseId != null ? String(currentPurchaseId) : '';
    }

    function createSourceRow(purchaseId, qty){
      if(!sourcesListEl) return;
      const row = document.createElement('div');
      row.className = 'tm-so-source-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
      const select = document.createElement('select');
      select.className = 'tm-so-source-purchase';
      select.style.flex = '1.6';
      populatePurchaseSelect(select, purchaseId);
      const qtyInput = document.createElement('input');
      qtyInput.type = 'text';
      qtyInput.className = 'tm-so-source-qty';
      qtyInput.placeholder = 'Số trái sử dụng';
      qtyInput.value = qty != null ? qty : '';
      qtyInput.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa nguồn');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); });
      row.appendChild(select);
      row.appendChild(qtyInput);
      row.appendChild(removeBtn);
      sourcesListEl.appendChild(row);
    }

    function createOutputRow(tenSanPham, qty){
      if(!outputsListEl) return;
      const row = document.createElement('div');
      row.className = 'tm-so-output-row';
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'tm-so-output-name';
      nameInput.setAttribute('list', 'dl-tm-san-pham');
      nameInput.placeholder = 'Tên sản phẩm';
      nameInput.value = tenSanPham || '';
      nameInput.style.flex = '1.6';
      const qtyInput = document.createElement('input');
      qtyInput.type = 'text';
      qtyInput.className = 'tm-so-output-qty';
      qtyInput.placeholder = 'Số lượng (trái)';
      qtyInput.value = qty != null ? qty : '';
      qtyInput.style.flex = '1';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'row-delete-btn';
      removeBtn.setAttribute('aria-label', 'Xóa sản phẩm');
      removeBtn.innerHTML = '<i class="ti ti-trash"></i>';
      removeBtn.addEventListener('click', function(){ row.remove(); });
      row.appendChild(nameInput);
      row.appendChild(qtyInput);
      row.appendChild(removeBtn);
      outputsListEl.appendChild(row);
    }

    function resetSourceRows(sources){
      if(!sourcesListEl) return;
      sourcesListEl.textContent = '';
      if(sources && sources.length) sources.forEach(function(s){ createSourceRow(s.purchase_id, s.so_trai_su_dung); });
      else createSourceRow(null, null);
    }
    function resetOutputRows(outputs){
      if(!outputsListEl) return;
      outputsListEl.textContent = '';
      if(outputs && outputs.length) outputs.forEach(function(o){ createOutputRow(o.ten_san_pham, o.so_luong_trai); });
      else createOutputRow('', null);
    }
    function readSourceRows(){
      if(!sourcesListEl) return [];
      return Array.from(sourcesListEl.querySelectorAll('.tm-so-source-row')).map(function(row){
        const select = row.querySelector('.tm-so-source-purchase');
        const qtyInput = row.querySelector('.tm-so-source-qty');
        return { purchaseId: select.value ? Number(select.value) : null, qty: parseQty(qtyInput.value) };
      }).filter(function(r){ return r.purchaseId && r.qty; });
    }
    function readOutputRows(){
      if(!outputsListEl) return [];
      return Array.from(outputsListEl.querySelectorAll('.tm-so-output-row')).map(function(row){
        const nameInput = row.querySelector('.tm-so-output-name');
        const qtyInput = row.querySelector('.tm-so-output-qty');
        return { tenSanPham: (nameInput.value || '').trim(), qty: parseQty(qtyInput.value) };
      }).filter(function(r){ return r.tenSanPham && r.qty; });
    }

    if(addSourceBtn) addSourceBtn.addEventListener('click', function(){ createSourceRow(); });
    if(addOutputBtn) addOutputBtn.addEventListener('click', function(){ createOutputRow(); });

    function openSoModal(){ if(soOverlay) soOverlay.classList.add('active'); }
    function closeSoModal(){
      if(!soOverlay) return;
      soOverlay.classList.remove('active');
      if(soForm) soForm.reset();
      resetSourceRows();
      resetOutputRows();
      editingProcessingId = null;
    }
    function openAddSoModal(){
      editingProcessingId = null;
      if(soForm) soForm.reset();
      resetSourceRows();
      resetOutputRows();
      if(soModalTitle) soModalTitle.textContent = 'Thêm lần sơ chế';
      if(soSubmitBtn) soSubmitBtn.textContent = 'Thêm';
      openSoModal();
    }
    function openEditSoModal(tr){
      editingProcessingId = Number(tr.dataset.id);
      document.getElementById('f-tm-so-ngay').value = tr.dataset.ngaySoChe || '';
      document.getElementById('f-tm-so-ghichu').value = tr.dataset.ghiChu || '';
      let sources = [];
      let outputs = [];
      try{ sources = JSON.parse(tr.dataset.sources || '[]'); } catch(e){ sources = []; }
      try{ outputs = JSON.parse(tr.dataset.outputs || '[]'); } catch(e){ outputs = []; }
      resetSourceRows(sources);
      resetOutputRows(outputs);
      if(soModalTitle) soModalTitle.textContent = 'Sửa lần sơ chế';
      if(soSubmitBtn) soSubmitBtn.textContent = 'Lưu thay đổi';
      openSoModal();
    }

    if(soOpenBtn) soOpenBtn.addEventListener('click', openAddSoModal);
    if(soCloseBtn) soCloseBtn.addEventListener('click', closeSoModal);
    if(soCancelBtn) soCancelBtn.addEventListener('click', closeSoModal);
    if(soOverlay) soOverlay.addEventListener('click', function(e){ if(e.target === soOverlay) closeSoModal(); });

    async function deleteProcessingRow(tr){
      const id = tr.dataset.id;
      if(!id) return;
      const label = 'lần sơ chế ngày ' + (tr.dataset.ngaySoChe ? fmtDate(tr.dataset.ngaySoChe) : '(chưa rõ ngày)');
      const ok = await confirmDialog('Xóa ' + label + '?');
      if(!ok) return;
      try{
        const { error } = await sb.from('market_processing').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if(error) throw error;
        await refreshAllMarketData();
        showUndoToast('Đã xóa ' + label + '.', async function(){
          const { error: restoreErr } = await sb.from('market_processing').update({ deleted_at: null }).eq('id', id);
          if(restoreErr){ showErrorToast('Không thể hoàn tác: ' + restoreErr.message); return; }
          await refreshAllMarketData();
        });
      } catch(err){
        showErrorToast('Không thể xóa: ' + err.message);
      }
    }

    if(soTbody){
      soTbody.addEventListener('click', function(e){
        const editBtnEl = e.target.closest('.row-edit-btn');
        if(editBtnEl){ openEditSoModal(editBtnEl.closest('tr')); return; }
        const delBtnEl = e.target.closest('.row-delete-btn');
        if(delBtnEl){ deleteProcessingRow(delBtnEl.closest('tr')); return; }
      });
    }

    function renderProcessingRows(rows){
      if(!soTbody) return;
      soTbody.textContent = '';
      if(!rows.length){
        showEmptyRow(soTbody, 8, 'Chưa có lần sơ chế nào.');
        return;
      }
      rows.forEach(function(d){
        const sources = d.market_processing_sources || [];
        const outputs = d.market_processing_outputs || [];
        const totalIn = sources.reduce(function(sum, s){ return sum + (Number(s.so_trai_su_dung) || 0); }, 0);
        const totalOut = outputs.reduce(function(sum, o){ return sum + (Number(o.so_luong_trai) || 0); }, 0);

        const tr = document.createElement('tr');
        tr.className = 'hoverable';
        tr.dataset.id = d.id;
        tr.dataset.ngaySoChe = d.ngay_so_che || '';
        tr.dataset.ghiChu = d.ghi_chu || '';
        tr.dataset.sources = JSON.stringify(sources.map(function(s){ return { purchase_id: s.purchase_id, so_trai_su_dung: s.so_trai_su_dung }; }));
        tr.dataset.outputs = JSON.stringify(outputs.map(function(o){ return { ten_san_pham: o.ten_san_pham, so_luong_trai: o.so_luong_trai }; }));

        const cells = [
          d.ngay_so_che ? fmtDate(d.ngay_so_che) : '—',
          sources.length ? sources.map(function(s){ return purchaseLabel(s.purchase_id) + ': ' + fmtQty(s.so_trai_su_dung); }).join('; ') : '—',
          fmtQty(totalIn),
          outputs.length ? outputs.map(function(o){ return o.ten_san_pham + ': ' + fmtQty(o.so_luong_trai); }).join('; ') : '—',
          fmtQty(totalOut),
          fmtQty(Math.max(0, totalIn - totalOut)),
          d.ghi_chu || '—'
        ];
        cells.forEach(function(text){
          const td = document.createElement('td');
          td.textContent = text;
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
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'row-delete-btn';
        deleteBtn.setAttribute('aria-label', 'Xóa');
        deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);

        soTbody.appendChild(tr);
      });
    }

    async function fetchProcessingRows(){
      const { data, error } = await sb.from('market_processing')
        .select('*, market_processing_sources(*), market_processing_outputs(*)')
        .is('deleted_at', null)
        .order('ngay_so_che', { ascending: false })
        .order('created_at', { ascending: false });
      if(error) throw error;
      return data;
    }

    async function refreshProcessingRows(){
      try{
        const rows = await fetchProcessingRows();
        latestProcessing = rows;
        populateTmSoPeriodSelect(rows);
        renderFilteredProcessingRows();
      } catch(err){
        console.error('Không tải được dữ liệu Sơ chế:', err);
        if(soTbody) showEmptyRow(soTbody, 8, 'Không tải được dữ liệu — kiểm tra kết nối Supabase.', 'var(--red)');
      }
    }

    if(soForm){
      soForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const sources = readSourceRows();
        const outputs = readOutputRows();
        if(!sources.length){ showErrorToast('Vui lòng chọn ít nhất 1 nguồn nguyên liệu (lô thu mua) với số trái sử dụng.'); return; }
        if(!outputs.length){ showErrorToast('Vui lòng nhập ít nhất 1 sản phẩm đầu ra với số lượng.'); return; }

        const payload = {
          ngay_so_che: fieldVal('f-tm-so-ngay') || null,
          ghi_chu: fieldVal('f-tm-so-ghichu')
        };

        const originalLabel = soSubmitBtn.textContent;
        soSubmitBtn.disabled = true;
        soSubmitBtn.textContent = 'Đang lưu...';
        try{
          let processingId = editingProcessingId;
          if(processingId){
            const { error } = await sb.from('market_processing').update(payload).eq('id', processingId);
            if(error) throw error;
          } else {
            const { data, error } = await sb.from('market_processing').insert(payload).select('id');
            if(error) throw error;
            processingId = data[0].id;
          }
          // Đồng bộ 2 bảng con bằng xóa hết rồi chèn lại đúng danh sách hiện
          // có trong form — đơn giản hơn diff từng dòng đã đổi/thêm/xóa (cùng
          // pattern với factory_batch_boxes ở Xưởng Ba Phi).
          const { error: delSrcErr } = await sb.from('market_processing_sources').delete().eq('processing_id', processingId);
          if(delSrcErr) throw delSrcErr;
          const { error: delOutErr } = await sb.from('market_processing_outputs').delete().eq('processing_id', processingId);
          if(delOutErr) throw delOutErr;
          const { error: insSrcErr } = await sb.from('market_processing_sources').insert(sources.map(function(s){
            return { processing_id: processingId, purchase_id: s.purchaseId, so_trai_su_dung: s.qty };
          }));
          if(insSrcErr) throw insSrcErr;
          const { error: insOutErr } = await sb.from('market_processing_outputs').insert(outputs.map(function(o){
            return { processing_id: processingId, ten_san_pham: o.tenSanPham, so_luong_trai: o.qty };
          }));
          if(insOutErr) throw insOutErr;

          await refreshAllMarketData();
          closeSoModal();
        } catch(err){
          showErrorToast('Không thể lưu vào Supabase: ' + err.message);
        } finally {
          soSubmitBtn.disabled = false;
          soSubmitBtn.textContent = originalLabel;
        }
      });
    }

    async function refreshAllMarketData(){
      await Promise.all([
        purchaseCrud ? purchaseCrud.refreshRows() : Promise.resolve(),
        refreshProcessingRows(),
        saleCrud ? saleCrud.refreshRows() : Promise.resolve()
      ]);
      // Thu mua (cột "Còn tồn") và Sơ chế (cột "Nguồn nguyên liệu") tham
      // chiếu CHÉO dữ liệu của nhau — vòng tải trên chạy song song nên mỗi
      // bên có thể chưa thấy dữ liệu mới nhất của bên kia lúc tự render lần
      // đầu. Vòng 2 này chỉ để hiển thị lại cho đúng: Sơ chế render lại từ
      // cache (rẻ, latestPurchases lúc này đã đủ); Thu mua phải tải lại thật
      // vì initCrudModule không có API "render lại từ cache" riêng.
      if(purchaseCrud) await purchaseCrud.refreshRows();
      renderFilteredProcessingRows();
      recomputeSummary();
    }

    refreshAllMarketData();
  })();

  // ================= Báo cáo (tab "Báo cáo" — chỉ Admin) =================
  // Xuất PDF (thư viện pdfmake, nạp từ CDN ở shell.html) 2 loại:
  //   1. Báo cáo tổng hợp theo kỳ (Tháng/Quý/Năm) — toàn chuỗi xuất khẩu.
  //   2. Hồ sơ 1 lô hàng — trọn hành trình.
  // Đọc lại dữ liệu trực tiếp từ Supabase lúc bấm nút, dùng periodDate của lô
  // trong sharedBatchSummaries làm mốc phân kỳ (giống các tab Chứng từ/QC),
  // KHÔNG đụng logic sẵn có của các module khác.
  (function(){
    const kindSelect = document.getElementById('report-period-kind');
    const monthSelect = document.getElementById('report-month');
    const quarterSelect = document.getElementById('report-quarter');
    const yearSelect = document.getElementById('report-year');
    const kyStatus = document.getElementById('report-ky-status');
    const btnKyPreview = document.getElementById('btn-report-ky-preview');
    const btnKyDownload = document.getElementById('btn-report-ky-download');
    const loBatchSelect = document.getElementById('report-lo-batch');
    const loStatus = document.getElementById('report-lo-status');
    const btnLoPreview = document.getElementById('btn-report-lo-preview');
    const btnLoDownload = document.getElementById('btn-report-lo-download');
    if(!kindSelect || !loBatchSelect) return;

    const COLOR_DEEP = '#0f3d38';
    const COLOR_SOFT = '#5c645f';
    const COLOR_LINE = '#d7d4cc';
    const COLOR_ACCENT = '#c98a2b';
    const COLOR_KPI_BG = '#f6f4ee';
    const BRAND = 'FADO AGRI';
    const BRAND_SUB = 'Chuỗi cung ứng xuất khẩu';
    const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    // Logo công ty cho đầu trang PDF — nạp 1 lần từ assets/ rồi cache dạng
    // data URI (pdfmake chỉ nhận ảnh dạng data URI). Nếu tải lỗi thì bỏ qua,
    // đầu trang tự lùi về dùng chữ "FADO AGRI".
    let LOGO_DATA = null;
    (function loadLogo(){
      try{
        fetch('assets/logo-fadoagri-cropped.png')
          .then(function(r){ return r && r.ok ? r.blob() : null; })
          .then(function(blob){
            if(!blob) return;
            const fr = new FileReader();
            fr.onload = function(){ LOGO_DATA = fr.result; };
            fr.readAsDataURL(blob);
          })
          .catch(function(){});
      } catch(e){}
    })();

    function pad2(n){ return String(n).padStart(2, '0'); }
    function num(v){
      if(v == null) return 0;
      const n = Number(String(v).replace(/[^\d.-]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    function fmtInt(n){ return (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('vi-VN'); }
    // raw_batches.raw_batch_id có ràng buộc unique -> PostgREST trả
    // factory_batches là 1 object (hoặc null), KHÔNG phải mảng; các bảng con
    // của nó (boxes/waste) thì là mảng. asArr() chuẩn hoá về mảng cho mọi
    // trường hợp để không vỡ khi lược đồ đổi.
    function asArr(v){ return Array.isArray(v) ? v : (v == null ? [] : [v]); }
    function fmtD(s){
      if(!s) return '—';
      const p = String(s).slice(0, 10).split('-');
      return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : String(s);
    }
    function okFlag(v){ return v ? 'Đã có' : 'Thiếu'; }
    function currentUserLabel(){
      if(!currentUser) return '—';
      const name = currentUser.full_name || currentUser.email || '—';
      const role = ROLE_LABELS[currentUser.role] || currentUser.role || '';
      return role ? (name + ' (' + role + ')') : name;
    }
    function fileSafe(s){
      return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '').toLowerCase() || 'bao-cao';
    }

    // ---- Bộ lọc kỳ ----
    function summaryYears(){
      const set = {};
      Object.values(sharedBatchSummaries).forEach(function(b){
        if(b.periodDate) set[Number(b.periodDate.slice(0, 4))] = true;
      });
      set[new Date().getFullYear()] = true;
      return Object.keys(set).map(Number).sort(function(a, b){ return b - a; });
    }
    function populatePeriodControls(){
      if(!monthSelect.options.length){
        MONTHS.forEach(function(name, i){
          const o = document.createElement('option');
          o.value = String(i + 1); o.textContent = name;
          monthSelect.appendChild(o);
        });
        monthSelect.value = String(new Date().getMonth() + 1);
      }
      const prevYear = yearSelect.value;
      const years = summaryYears();
      yearSelect.innerHTML = '';
      years.forEach(function(y){
        const o = document.createElement('option');
        o.value = String(y); o.textContent = 'Năm ' + y;
        yearSelect.appendChild(o);
      });
      yearSelect.value = years.indexOf(Number(prevYear)) !== -1 ? prevYear : String(years[0]);
    }
    function syncKindVisibility(){
      const k = kindSelect.value;
      monthSelect.style.display = k === 'month' ? '' : 'none';
      quarterSelect.style.display = k === 'quarter' ? '' : 'none';
    }
    kindSelect.addEventListener('change', syncKindVisibility);
    syncKindVisibility();
    populatePeriodControls();

    function selectedRange(){
      const y = Number(yearSelect.value) || new Date().getFullYear();
      const k = kindSelect.value;
      if(k === 'month'){
        const m = Number(monthSelect.value) || 1;
        return { start: y + '-' + pad2(m) + '-01', end: periodRange(y, m).end, label: MONTHS[m - 1] + '/' + y };
      }
      if(k === 'quarter'){
        const q = Number(quarterSelect.value) || 1;
        const sm = (q - 1) * 3 + 1;
        const end = q === 4 ? (y + 1) + '-01-01' : y + '-' + pad2(sm + 3) + '-01';
        return { start: y + '-' + pad2(sm) + '-01', end: end, label: 'Quý ' + q + '/' + y };
      }
      return { start: y + '-01-01', end: (y + 1) + '-01-01', label: 'Năm ' + y };
    }
    function batchInRange(batch, range){
      const b = sharedBatchSummaries[batch];
      if(!b || !b.periodDate) return false;
      return b.periodDate >= range.start && b.periodDate < range.end;
    }

    // ---- Chọn lô cho Hồ sơ theo lô ----
    function populateBatchSelect(){
      const prev = loBatchSelect.value;
      const list = Object.values(sharedBatchSummaries)
        .filter(function(b){ return b.hasSourceInfo; })
        .map(function(b){ return b.batch; })
        .sort(function(a, b){ return a.localeCompare(b, 'vi'); });
      loBatchSelect.innerHTML = '';
      if(!list.length){
        const o = document.createElement('option');
        o.value = ''; o.textContent = '— Chưa có lô hàng nào —';
        loBatchSelect.appendChild(o);
        return;
      }
      list.forEach(function(code){
        const o = document.createElement('option');
        o.value = code; o.textContent = code;
        loBatchSelect.appendChild(o);
      });
      if(list.indexOf(prev) !== -1) loBatchSelect.value = prev;
    }
    populateBatchSelect();
    onBatchSummaryChanged(function(){ populatePeriodControls(); populateBatchSelect(); });

    // ---- Tải dữ liệu thô (dùng chung cho cả 2 loại báo cáo) ----
    async function fetchAll(){
      const [qcRes, shipRes, docRes, fbRes, rawRes, poRes] = await Promise.all([
        sb.from('qc_checks').select('batch_code,check_type,result,inspector,note,created_at').is('deleted_at', null),
        sb.from('shipments').select('batch_code,product,stage,location,eta,etd,created_at').is('deleted_at', null),
        sb.from('documents_checklist').select('batch_code,market,contract_ok,co_ok,quarantine_ok,bill_of_lading_ok,deadline'),
        sb.from('feedbacks').select('batch_code,market,rating,feedback_text,status,created_at').is('deleted_at', null),
        sb.from('raw_batches').select('batch,ncc,chung_loai,soluong,ngay_nhap,factory_batches(finished_qty,production_date,san_pham,factory_batch_boxes(quy_cach,so_luong_thung),factory_batch_waste(so_luong))').is('deleted_at', null),
        sb.from('purchase_orders').select('batch_code,supplier_name,category,quantity,status,created_at').is('deleted_at', null)
      ]);
      [qcRes, shipRes, docRes, fbRes, rawRes, poRes].forEach(function(r){ if(r.error) throw r.error; });
      return {
        qc: qcRes.data || [], ships: shipRes.data || [], docs: docRes.data || [],
        fb: fbRes.data || [], raw: rawRes.data || [], po: poRes.data || []
      };
    }

    // Gộp raw_batches theo lô -> {nhapTho, thanhPham, datBo, boxes, quyCach[]}
    function productionByBatch(rawRows){
      const map = {};
      rawRows.forEach(function(r){
        if(!r.batch) return;
        const g = map[r.batch] || (map[r.batch] = { nhapTho: 0, thanhPham: 0, datBo: 0, boxes: 0, quyCach: {}, ngaySX: null, hasFactory: false });
        g.nhapTho += num(r.soluong);
        asArr(r.factory_batches).forEach(function(fb){
          if(fb.finished_qty != null){ g.thanhPham += num(fb.finished_qty); g.hasFactory = true; }
          if(fb.production_date && (!g.ngaySX || fb.production_date > g.ngaySX)) g.ngaySX = fb.production_date;
          asArr(fb.factory_batch_waste).forEach(function(w){ g.datBo += num(w.so_luong); });
          asArr(fb.factory_batch_boxes).forEach(function(bx){
            g.boxes += num(bx.so_luong_thung);
            if(bx.quy_cach) g.quyCach[bx.quy_cach] = true;
          });
        });
      });
      return map;
    }
    function lossPct(nhap, tp){
      if(!nhap || tp == null) return null;
      return Math.round((1 - tp / nhap) * 1000) / 10;
    }

    // ---- pdfmake: helper dựng khối ----
    function reportHeader(tieuDe, kyText){
      const brandCol = LOGO_DATA
        ? { width: 150, stack: [{ image: LOGO_DATA, width: 138 }, { text: BRAND_SUB, style: 'brandSub', margin: [0, 3, 0, 0] }] }
        : { width: 150, stack: [{ text: BRAND, style: 'brand' }, { text: BRAND_SUB, style: 'brandSub' }] };
      return {
        columns: [
          brandCol,
          {
            width: '*',
            stack: [
              { text: tieuDe, style: 'docTitle', alignment: 'right' },
              { text: kyText, style: 'docMeta', alignment: 'right' },
              { text: 'Ngày xuất: ' + fmtD(todayStr()) + '  ·  Người xuất: ' + currentUserLabel(), style: 'docMeta', alignment: 'right' }
            ]
          }
        ],
        margin: [0, 0, 0, 6]
      };
    }
    function hr(){
      return {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 523, h: 3, color: COLOR_DEEP },
          { type: 'rect', x: 0, y: 3, w: 90, h: 3, color: COLOR_ACCENT }
        ],
        margin: [0, 2, 0, 14]
      };
    }
    function sectionTitle(t){
      return {
        columns: [
          { width: 10, canvas: [{ type: 'rect', x: 0, y: 1, w: 4, h: 11, color: COLOR_ACCENT }] },
          { width: '*', text: t, style: 'section' }
        ],
        margin: [0, 14, 0, 6]
      };
    }
    function dataTable(headers, rows, widths){
      const body = [headers.map(function(h){ return { text: h, style: 'th' }; })];
      if(!rows.length){
        body.push([{ text: 'Không có dữ liệu trong kỳ.', colSpan: headers.length, style: 'empty' }]
          .concat(headers.slice(1).map(function(){ return {}; })));
      } else {
        rows.forEach(function(r){
          body.push(r.map(function(c){ return { text: (c == null || c === '') ? '—' : String(c), style: 'td' }; }));
        });
      }
      return {
        table: { headerRows: 1, widths: widths, body: body },
        layout: {
          hLineWidth: function(i){ return i === 0 || i === 1 ? 0.8 : 0.4; },
          vLineWidth: function(){ return 0; },
          hLineColor: function(i){ return i === 1 ? COLOR_DEEP : COLOR_LINE; },
          paddingTop: function(){ return 4; }, paddingBottom: function(){ return 4; }
        },
        margin: [0, 0, 0, 4]
      };
    }
    function infoRows(pairs){
      return {
        table: { widths: [140, '*'], body: pairs.map(function(p){ return [{ text: p[0], style: 'label' }, { text: (p[1] == null || p[1] === '') ? '—' : String(p[1]), style: 'value' }]; }) },
        layout: 'noBorders', margin: [0, 2, 0, 4]
      };
    }
    function kpiGrid(items){
      const rows = []; let row = [];
      items.forEach(function(it){
        row.push({ stack: [{ text: it.value, style: 'kpiVal' }, { text: it.label, style: 'kpiLbl' }], margin: [0, 7, 0, 7] });
        if(row.length === 3){ rows.push(row); row = []; }
      });
      if(row.length){ while(row.length < 3) row.push({}); rows.push(row); }
      return {
        table: { widths: ['*', '*', '*'], body: rows },
        layout: {
          hLineWidth: function(){ return 2; }, vLineWidth: function(){ return 2; },
          hLineColor: function(){ return '#ffffff'; }, vLineColor: function(){ return '#ffffff'; },
          paddingLeft: function(){ return 10; }, paddingRight: function(){ return 10; },
          fillColor: function(rowIndex, node, colIndex){
            const cell = node.table.body[rowIndex][colIndex];
            return (cell && cell.stack) ? COLOR_KPI_BG : null;
          }
        },
        margin: [0, 4, 0, 4]
      };
    }
    const PDF_STYLES = {
      brand: { fontSize: 15, bold: true, color: COLOR_DEEP },
      brandSub: { fontSize: 9, color: COLOR_SOFT },
      docTitle: { fontSize: 13, bold: true, color: COLOR_DEEP },
      docMeta: { fontSize: 8.5, color: COLOR_SOFT },
      section: { fontSize: 10.5, bold: true, color: COLOR_DEEP },
      th: { fontSize: 8.5, bold: true, color: COLOR_DEEP, fillColor: '#f2f0ea' },
      td: { fontSize: 8.5, color: '#26302e' },
      empty: { fontSize: 8.5, italics: true, color: COLOR_SOFT },
      kpiVal: { fontSize: 13, bold: true, color: COLOR_DEEP },
      kpiLbl: { fontSize: 8, color: COLOR_SOFT },
      label: { fontSize: 8.5, color: COLOR_SOFT },
      value: { fontSize: 9.5, color: '#26302e' }
    };
    function pdfFooter(currentPage, pageCount){
      return {
        columns: [
          { text: BRAND + ' — Báo cáo nội bộ', style: 'docMeta', margin: [36, 0, 0, 0] },
          { text: 'Trang ' + currentPage + '/' + pageCount, style: 'docMeta', alignment: 'right', margin: [0, 0, 36, 0] }
        ],
        margin: [0, 10, 0, 0]
      };
    }
    function docShell(content){
      return {
        pageSize: 'A4', pageMargins: [36, 44, 36, 44], footer: pdfFooter,
        content: content, styles: PDF_STYLES,
        defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.15 }
      };
    }

    // ---- Dựng doc: Báo cáo tổng hợp theo kỳ ----
    function buildSummaryDoc(data, range){
      const prod = productionByBatch(data.raw);
      const inPeriod = function(code){ return batchInRange(code, range); };

      const batchList = Object.values(sharedBatchSummaries)
        .filter(function(b){ return b.hasSourceInfo && inPeriod(b.batch); })
        .sort(function(a, b){ return a.batch.localeCompare(b.batch, 'vi'); });

      // Đơn hàng
      const donHangRows = batchList
        .filter(function(b){ return b.hasOrderInfo || b.khachHang || b.saleType || b.orderStatus; })
        .map(function(b){ return [b.batch, b.khachHang, b.saleType, b.orderStatus, fmtD(b.ngayGiaoMongMuon)]; });

      // Sản xuất & hao hụt
      const sxRows = batchList
        .filter(function(b){ return prod[b.batch]; })
        .map(function(b){
          const g = prod[b.batch];
          const hh = lossPct(g.nhapTho, g.hasFactory ? g.thanhPham : null);
          return [b.batch, b.category, fmtInt(g.nhapTho || null), g.hasFactory ? fmtInt(g.thanhPham) : '—',
            g.datBo ? fmtInt(g.datBo) : '—', hh == null ? '—' : (hh + '%')];
        });

      // QC
      const qcRows = data.qc.filter(function(q){ return inPeriod(q.batch_code); })
        .sort(function(a, b){ return a.batch_code.localeCompare(b.batch_code, 'vi') || String(a.created_at).localeCompare(String(b.created_at)); })
        .map(function(q){ return [q.batch_code, q.check_type, q.result, q.inspector, q.note]; });

      // Logistics
      const logRows = data.ships.filter(function(s){ return inPeriod(s.batch_code); })
        .sort(function(a, b){ return a.batch_code.localeCompare(b.batch_code, 'vi'); })
        .map(function(s){ return [s.batch_code, s.product, s.stage, s.location, fmtD(s.eta)]; });

      // Feedback
      const fbRows = data.fb.filter(function(f){ return inPeriod(f.batch_code); })
        .sort(function(a, b){ return a.batch_code.localeCompare(b.batch_code, 'vi'); })
        .map(function(f){ return [f.batch_code, f.market, f.rating == null ? '—' : (f.rating + '/5'), f.status, f.feedback_text]; });

      // KPI
      let sumNhap = 0, sumTP = 0, hasTP = false;
      batchList.forEach(function(b){
        const g = prod[b.batch];
        if(!g) return;
        sumNhap += g.nhapTho;
        if(g.hasFactory){ sumTP += g.thanhPham; hasTP = true; }
      });
      const haoHut = (sumNhap && hasTP) ? (Math.round((1 - sumTP / sumNhap) * 1000) / 10) : null;
      const qcAll = data.qc.filter(function(q){ return inPeriod(q.batch_code); });
      const qcDecided = qcAll.filter(function(q){ return q.result && q.result !== 'Chờ xác nhận'; });
      const qcPassed = qcDecided.filter(function(q){ return q.result === 'Đạt'; });
      const qcRate = qcDecided.length ? Math.round(qcPassed.length / qcDecided.length * 100) : null;
      const shipsInP = data.ships.filter(function(s){ return inPeriod(s.batch_code); });
      const shipDone = shipsInP.filter(function(s){ return s.stage === 'Khách đã nhận hàng'; }).length;
      const ratings = data.fb.filter(function(f){ return inPeriod(f.batch_code) && f.rating != null; }).map(function(f){ return f.rating; });
      const avgRating = ratings.length ? (ratings.reduce(function(a, b){ return a + b; }, 0) / ratings.length) : null;

      return docShell([
        reportHeader('BÁO CÁO TỔNG HỢP CHUỖI CUNG ỨNG', 'Kỳ báo cáo: ' + range.label),
        hr(),
        sectionTitle('Chỉ số chính trong kỳ'),
        kpiGrid([
          { label: 'Số lô hàng', value: fmtInt(batchList.length) },
          { label: 'Nhập thô (trái)', value: sumNhap ? fmtInt(sumNhap) : '—' },
          { label: 'Thành phẩm (trái)', value: hasTP ? fmtInt(sumTP) : '—' },
          { label: 'Hao hụt trung bình', value: haoHut == null ? '—' : (haoHut + '%') },
          { label: 'Tỷ lệ đạt QC', value: qcRate == null ? '—' : (qcRate + '%') },
          { label: 'Container trong kỳ', value: fmtInt(shipsInP.length) + ' (' + shipDone + ' đã giao)' },
          { label: 'Điểm hài lòng KH', value: avgRating == null ? '—' : (avgRating.toFixed(1) + '/5') }
        ]),
        sectionTitle('1. Đơn hàng trong kỳ'),
        dataTable(['Lô hàng', 'Khách hàng', 'Hình thức', 'Trạng thái', 'Ngày giao mong muốn'], donHangRows, [80, '*', 90, 80, 78]),
        sectionTitle('2. Sản xuất & hao hụt theo lô'),
        dataTable(['Lô hàng', 'Ngành hàng', 'Nhập thô', 'Thành phẩm', 'Dạt bỏ', 'Hao hụt %'], sxRows, [90, 90, '*', '*', '*', 46]),
        sectionTitle('3. Kết quả kiểm tra chất lượng (QC)'),
        dataTable(['Lô hàng', 'Loại kiểm', 'Kết quả', 'Người kiểm', 'Ghi chú'], qcRows, [90, 60, 80, 60, '*']),
        sectionTitle('4. Logistics'),
        dataTable(['Lô hàng', 'Sản phẩm', 'Chặng', 'Vị trí', 'ETA'], logRows, [80, 70, 90, '*', 60]),
        sectionTitle('5. Phản hồi khách hàng'),
        dataTable(['Lô hàng', 'Thị trường', 'Điểm', 'Trạng thái', 'Nội dung'], fbRows, [80, 70, 34, 66, '*'])
      ]);
    }

    // ---- Dựng doc: Hồ sơ theo lô hàng ----
    function buildBatchDoc(data, batchCode){
      const b = sharedBatchSummaries[batchCode] || { batch: batchCode };
      const rawRows = data.raw.filter(function(r){ return r.batch === batchCode; });
      const prod = productionByBatch(rawRows)[batchCode];

      const nlRows = rawRows.map(function(r){ return [r.ncc, r.chung_loai, num(r.soluong) ? (fmtInt(num(r.soluong)) + ' trái') : '—', fmtD(r.ngay_nhap)]; });

      const sxRows = [];
      rawRows.forEach(function(r){
        asArr(r.factory_batches).forEach(function(fb){
          const dat = asArr(fb.factory_batch_waste).reduce(function(s, w){ return s + num(w.so_luong); }, 0);
          const boxes = asArr(fb.factory_batch_boxes).reduce(function(s, x){ return s + num(x.so_luong_thung); }, 0);
          const qc = Array.from(new Set(asArr(fb.factory_batch_boxes).map(function(x){ return x.quy_cach; }).filter(Boolean)));
          const hh = lossPct(num(r.soluong), fb.finished_qty == null ? null : num(fb.finished_qty));
          sxRows.push([
            fmtD(fb.production_date),
            fb.finished_qty == null ? '—' : (fmtInt(num(fb.finished_qty)) + ' trái'),
            dat ? (fmtInt(dat) + ' trái') : '—',
            hh == null ? '—' : (hh + '%'),
            boxes ? (fmtInt(boxes) + ' thùng' + (qc.length ? (' (' + qc.join(', ') + ')') : '')) : '—'
          ]);
        });
      });

      const qcRows = data.qc.filter(function(q){ return q.batch_code === batchCode; })
        .sort(function(a, c){ return String(a.created_at).localeCompare(String(c.created_at)); })
        .map(function(q){ return [fmtD(q.created_at), q.check_type, q.result, q.inspector, q.note]; });

      const ship = data.ships.filter(function(s){ return s.batch_code === batchCode; })
        .sort(function(a, c){ return String(c.created_at).localeCompare(String(a.created_at)); })[0];
      const doc = data.docs.filter(function(d){ return d.batch_code === batchCode; })
        .sort(function(a, c){ return String(c.created_at || '').localeCompare(String(a.created_at || '')); })[0];

      const fbRows = data.fb.filter(function(f){ return f.batch_code === batchCode; })
        .sort(function(a, c){ return String(a.created_at).localeCompare(String(c.created_at)); })
        .map(function(f){ return [fmtD(f.created_at), f.market, f.rating == null ? '—' : (f.rating + '/5'), f.status, f.feedback_text]; });

      const content = [
        reportHeader('HỒ SƠ LÔ HÀNG', 'Lô: ' + batchCode),
        hr(),
        sectionTitle('Thông tin chung'),
        infoRows([
          ['Khách hàng', b.khachHang],
          ['Hình thức', b.saleType],
          ['Trạng thái đơn', b.orderStatus],
          ['Ngành hàng', b.category],
          ['Ngày nhập nguyên liệu', fmtD(b.ngayNhap)],
          ['Ngày giao mong muốn', fmtD(b.ngayGiaoMongMuon)]
        ]),
        sectionTitle('Nguyên liệu & nhà cung cấp'),
        dataTable(['Nhà cung cấp', 'Chủng loại', 'Số lượng nhập', 'Ngày nhập'], nlRows, ['*', 130, 90, 70]),
        sectionTitle('Sản xuất tại xưởng'),
        dataTable(['Ngày SX', 'Thành phẩm', 'Dạt bỏ', 'Hao hụt %', 'Đóng thùng'], sxRows, [70, 90, 80, 56, '*']),
        sectionTitle('Kiểm tra chất lượng (QC)'),
        dataTable(['Ngày', 'Loại kiểm', 'Kết quả', 'Người kiểm', 'Ghi chú'], qcRows, [64, 64, 80, 60, '*']),
        sectionTitle('Logistics'),
        infoRows([
          ['Chặng hiện tại', ship && ship.stage],
          ['Vị trí', ship && ship.location],
          ['Sản phẩm', ship && ship.product],
          ['ETD (dự kiến rời cảng)', ship ? fmtD(ship.etd) : '—'],
          ['ETA (dự kiến cập cảng)', ship ? fmtD(ship.eta) : '—']
        ]),
        sectionTitle('Chứng từ'),
        doc
          ? dataTable(['Hợp đồng', 'C/O', 'Kiểm dịch TV', 'Vận đơn (B/L)', 'Hạn bổ sung'],
              [[okFlag(doc.contract_ok), okFlag(doc.co_ok), okFlag(doc.quarantine_ok), okFlag(doc.bill_of_lading_ok), fmtD(doc.deadline)]],
              ['*', '*', '*', '*', 78])
          : { text: 'Chưa có checklist chứng từ cho lô này.', style: 'empty', margin: [0, 0, 0, 4] },
        sectionTitle('Phản hồi khách hàng'),
        dataTable(['Ngày', 'Thị trường', 'Điểm', 'Trạng thái', 'Nội dung'], fbRows, [64, 70, 34, 66, '*'])
      ];
      return docShell(content);
    }

    // ---- Chạy: build + tải/xem PDF ----
    function pdfReady(){
      if(typeof pdfMake === 'undefined' || !pdfMake.createPdf){
        return false;
      }
      return true;
    }
    function setBusy(statusEl, btns, busy, msg){
      btns.forEach(function(b){ if(b) b.disabled = busy; });
      if(statusEl) statusEl.textContent = msg || '';
    }
    async function runReport(kind, mode){
      const isKy = kind === 'ky';
      const statusEl = isKy ? kyStatus : loStatus;
      const btns = isKy ? [btnKyPreview, btnKyDownload] : [btnLoPreview, btnLoDownload];
      if(!pdfReady()){
        setBusy(statusEl, btns, false, 'Không tải được thư viện xuất PDF — kiểm tra kết nối mạng rồi thử lại.');
        return;
      }
      let range = null, batchCode = null;
      if(isKy){
        range = selectedRange();
      } else {
        batchCode = loBatchSelect.value;
        if(!batchCode){ setBusy(statusEl, btns, false, 'Chưa chọn lô hàng.'); return; }
      }
      setBusy(statusEl, btns, true, 'Đang tạo báo cáo…');
      try{
        const data = await fetchAll();
        const dd = isKy ? buildSummaryDoc(data, range) : buildBatchDoc(data, batchCode);
        const name = isKy
          ? ('bao-cao-tong-hop_' + fileSafe(range.label) + '_' + todayStr() + '.pdf')
          : ('ho-so-lo_' + fileSafe(batchCode) + '_' + todayStr() + '.pdf');
        const pdf = pdfMake.createPdf(dd);
        if(mode === 'download') pdf.download(name);
        else pdf.open();
        setBusy(statusEl, btns, false, mode === 'download' ? ('Đã tạo: ' + name) : 'Đã mở bản xem trước ở tab mới.');
      } catch(err){
        console.error('Báo cáo lỗi:', err);
        setBusy(statusEl, btns, false, 'Lỗi khi tạo báo cáo: ' + (err && (err.message || err)) );
      }
    }
    if(btnKyPreview) btnKyPreview.addEventListener('click', function(){ runReport('ky', 'open'); });
    if(btnKyDownload) btnKyDownload.addEventListener('click', function(){ runReport('ky', 'download'); });
    if(btnLoPreview) btnLoPreview.addEventListener('click', function(){ runReport('lo', 'open'); });
    if(btnLoDownload) btnLoDownload.addEventListener('click', function(){ runReport('lo', 'download'); });
  })();

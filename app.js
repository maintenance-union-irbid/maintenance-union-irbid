import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const SUPABASE_URL = 'https://gcrjwbmeuxaejndlsvrb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_2c6tZWTU8DNevKhM5O3-0A_9g7aEntj'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})

const app = document.querySelector('#app')
const state = {
  session: null,
  profile: null,
  memberships: [],
  showrooms: [],
  services: [],
  slots: [],
  booking: {
    showroomId: '', serviceId: '', date: '', slot: '',
    name: '', phone: '', location: 'home', address: ''
  }
}

const routes = ['/', '/login', '/admin', '/showroom', '/team']
const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
const fmtDate = v => new Intl.DateTimeFormat('ar-JO', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Amman'}).format(new Date(v))
const fmtTime = v => new Intl.DateTimeFormat('ar-JO', {hour:'numeric',minute:'2-digit',timeZone:'Asia/Amman'}).format(new Date(v))
const statusLabel = s => ({pending:'جديد',confirmed:'مؤكد',in_progress:'قيد التنفيذ',completed:'مكتمل',cancelled:'ملغي',rejected:'مرفوض'})[s] || s

function path() {
  return routes.includes(location.pathname) ? location.pathname : '/'
}

function shell(content) {
  const p = path()
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/" data-nav>
        <span class="brand-mark">ص</span>
        <span><strong>اتحاد الصيانة</strong><small>إربد</small></span>
      </a>
      <nav class="nav">
        <a href="/" data-nav class="${p==='/'?'active':''}">حجز صيانة</a>
        <a href="/showroom" data-nav class="${p==='/showroom'?'active':''}">صاحب المعرض</a>
        <a href="/team" data-nav class="${p==='/team'?'active':''}">الموظف</a>
        <a href="/admin" data-nav class="${p==='/admin'?'active':''}">الإدارة</a>
        <a href="/login" data-nav class="${p==='/login'?'active':''}">${state.session?'الحساب':'دخول'}</a>
      </nav>
    </header>
    <main class="container">${content}</main>
    <footer class="footer">اتحاد الصيانة - إربد · نظام متعدد المعارض</footer>
  `
  bindNav()
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      history.pushState({}, '', a.getAttribute('href'))
      render()
    })
  })
}

function notice(message, error=false) {
  return message ? `<div class="notice ${error?'error':''}">${escapeHtml(message)}</div>` : ''
}

async function refreshAuth() {
  const { data } = await supabase.auth.getSession()
  state.session = data.session
  state.profile = null
  state.memberships = []
  if (!state.session) return
  const uid = state.session.user.id
  const [profile, memberships] = await Promise.all([
    supabase.from('profiles').select('id,full_name,phone,global_role').eq('id', uid).maybeSingle(),
    supabase.from('showroom_memberships')
      .select('showroom_id,user_id,role,is_active,showrooms(id,name,slug,address,phone,logo_url,is_active)')
      .eq('user_id', uid).eq('is_active', true)
  ])
  state.profile = profile.data || null
  state.memberships = memberships.data || []
}

async function loadPublicShowrooms() {
  const { data, error } = await supabase.from('showrooms')
    .select('id,name,slug,logo_url,address,phone,is_active')
    .eq('is_active', true).order('name')
  if (error) throw error
  state.showrooms = data || []
}

async function renderBooking(message='', isError=false, success=null) {
  if (!state.showrooms.length) {
    try { await loadPublicShowrooms() } catch (e) { message = e.message; isError = true }
  }
  const b = state.booking
  const selectedShowroom = state.showrooms.find(s => s.id === b.showroomId)
  const selectedService = state.services.find(s => s.id === b.serviceId)

  if (success) {
    shell(`
      <section class="panel narrow">
        <div class="eyebrow">تم تسجيل الطلب</div>
        <h1>الحجز جاهز</h1>
        <div class="summary-grid">
          <div><span>رقم الطلب</span><strong>${escapeHtml(success.order_number)}</strong></div>
          <div><span>المعرض</span><strong>${escapeHtml(selectedShowroom?.name || '')}</strong></div>
          <div><span>الخدمة</span><strong>${escapeHtml(selectedService?.name || '')}</strong></div>
          <div><span>الموعد</span><strong>${escapeHtml(fmtDate(b.slot))}</strong></div>
          <div><span>الموقع</span><strong>${escapeHtml(b.location==='home'?b.address:(selectedShowroom?.address||'داخل المعرض'))}</strong></div>
        </div>
        <button class="btn primary" id="new-booking">حجز طلب جديد</button>
      </section>
    `)
    document.querySelector('#new-booking').onclick = () => {
      state.booking = {showroomId:'',serviceId:'',date:'',slot:'',name:'',phone:'',location:'home',address:''}
      state.services=[]; state.slots=[]; renderBooking()
    }
    return
  }

  shell(`
    <section class="hero">
      <div>
        <div class="eyebrow">اتحاد الصيانة - إربد</div>
        <h1>اختار المعرض أولًا، والباقي حسب خدماته وسعته.</h1>
        <p>كل معرض مستقل بخدماته ومواعيده وموظفيه. النظام يمنع التعارض والحجز فوق السعة على مستوى قاعدة البيانات.</p>
      </div>
      <div class="hero-badge">حجز موحّد<br><strong>متعدد المعارض</strong></div>
    </section>

    <section class="panel">
      <h2>1. اختر المعرض</h2>
      <div class="showroom-grid">
        ${state.showrooms.map(s => `
          <button type="button" class="showroom-card ${b.showroomId===s.id?'selected':''}" data-showroom="${s.id}">
            <div class="showroom-logo">${s.logo_url?`<img src="${escapeHtml(s.logo_url)}" alt="">`:escapeHtml(s.name.slice(0,1))}</div>
            <strong>${escapeHtml(s.name)}</strong>
            <small>${escapeHtml(s.address || 'إربد')}</small>
          </button>`).join('')}
      </div>

      ${selectedShowroom?`<div class="sticky-selection">المعرض المختار: <strong>${escapeHtml(selectedShowroom.name)}</strong></div>`:''}

      <div class="form-section">
        <h2>2. الخدمة والموعد</h2>
        <div class="grid2">
          <label>الخدمة
            <select id="service" ${b.showroomId?'':'disabled'}>
              <option value="">اختر الخدمة</option>
              ${state.services.map(s=>`<option value="${s.id}" ${b.serviceId===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </label>
          <label>التاريخ
            <input id="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="${escapeHtml(b.date)}" ${b.showroomId?'':'disabled'}>
          </label>
        </div>
        <div class="slot-grid">
          ${b.date && !state.slots.length?'<div class="muted">لا توجد مواعيد متاحة في هذا اليوم.</div>':''}
          ${state.slots.map(s=>`
            <button type="button" class="slot ${b.slot===s.slot_start?'selected':''}" data-slot="${s.slot_start}">
              <strong>${escapeHtml(fmtTime(s.slot_start))}</strong>
              <small>متبقي ${s.remaining} من ${s.capacity}</small>
            </button>`).join('')}
        </div>
      </div>

      <div class="form-section">
        <h2>3. بيانات الطلب</h2>
        <div class="grid2">
          <label>الاسم<input id="customer-name" autocomplete="name" value="${escapeHtml(b.name)}"></label>
          <label>رقم الهاتف<input id="customer-phone" inputmode="tel" autocomplete="tel" value="${escapeHtml(b.phone)}"></label>
        </div>
        <div class="segmented">
          <button type="button" data-location="home" class="${b.location==='home'?'active':''}">الصيانة في المنزل</button>
          <button type="button" data-location="showroom" class="${b.location==='showroom'?'active':''}">الصيانة داخل المعرض</button>
        </div>
        <div id="location-area">
          ${b.location==='home'
            ? `<label>عنوان تنفيذ الصيانة<textarea id="address" rows="3">${escapeHtml(b.address)}</textarea></label>`
            : `<div class="info-box">مكان التنفيذ: ${escapeHtml(selectedShowroom?.address || 'عنوان المعرض')}</div>`}
        </div>
      </div>

      ${notice(message,isError)}
      <button class="btn primary" id="submit-booking">تأكيد طلب الصيانة</button>
    </section>
  `)

  document.querySelectorAll('[data-showroom]').forEach(btn => btn.onclick = async () => {
    b.showroomId = btn.dataset.showroom
    b.serviceId=''; b.date=''; b.slot=''
    state.services=[]; state.slots=[]
    const { data, error } = await supabase.from('services')
      .select('id,showroom_id,name,description,duration_minutes,is_active')
      .eq('showroom_id', b.showroomId).eq('is_active', true).order('name')
    if (error) return renderBooking(error.message,true)
    state.services = data || []
    renderBooking()
  })

  const service = document.querySelector('#service')
  if (service) service.onchange = () => { b.serviceId = service.value; renderBooking() }

  const date = document.querySelector('#date')
  if (date) date.onchange = async () => {
    b.date = date.value; b.slot=''; state.slots=[]
    if (!b.showroomId || !b.date) return renderBooking()
    const { data, error } = await supabase.rpc('get_available_slots', {p_showroom_id:b.showroomId,p_date:b.date})
    if (error) return renderBooking(error.message,true)
    state.slots = data || []
    renderBooking()
  }

  document.querySelectorAll('[data-slot]').forEach(btn => btn.onclick = () => { b.slot=btn.dataset.slot; renderBooking() })
  document.querySelectorAll('[data-location]').forEach(btn => btn.onclick = () => {
    b.location = btn.dataset.location
    if (b.location==='showroom') b.address=''
    renderBooking()
  })

  const name = document.querySelector('#customer-name')
  const phone = document.querySelector('#customer-phone')
  const address = document.querySelector('#address')
  if (name) name.oninput = () => b.name=name.value
  if (phone) phone.oninput = () => b.phone=phone.value
  if (address) address.oninput = () => b.address=address.value

  document.querySelector('#submit-booking').onclick = async () => {
    if (!b.showroomId || !b.serviceId || !b.slot || b.name.trim().length<2 || b.phone.trim().length<7)
      return renderBooking('أكمل المعرض والخدمة والموعد والاسم ورقم الهاتف.', true)
    if (b.location==='home' && !b.address.trim())
      return renderBooking('عنوان الصيانة المنزلية مطلوب.', true)

    const button = document.querySelector('#submit-booking')
    button.disabled = true; button.textContent = 'جارٍ تثبيت الحجز…'
    const { data, error } = await supabase.rpc('create_booking', {
      p_showroom_id:b.showroomId,p_service_id:b.serviceId,p_customer_name:b.name.trim(),
      p_customer_phone:b.phone.trim(),p_execution_location:b.location,
      p_address_text:b.location==='home'?b.address.trim():null,p_scheduled_at:b.slot
    })
    if (error) return renderBooking(error.message,true)
    const created = Array.isArray(data)?data[0]:data
    renderBooking('',false,created)
  }
}

async function renderLogin(message='', isError=false) {
  if (state.session) {
    shell(`
      <section class="panel narrow">
        <div class="eyebrow">الحساب الحالي</div>
        <h1>${escapeHtml(state.session.user.email || state.session.user.phone || state.session.user.id)}</h1>
        <p class="portal-note">الدور العام: <strong>${escapeHtml(state.profile?.global_role || 'user')}</strong></p>
        ${notice(message,isError)}
        <button class="btn danger" id="logout">تسجيل الخروج</button>
      </section>`)
    document.querySelector('#logout').onclick = async () => {
      await supabase.auth.signOut(); await refreshAuth(); renderLogin('تم تسجيل الخروج.')
    }
    return
  }

  shell(`
    <section class="panel narrow">
      <div class="eyebrow">النظام الداخلي</div>
      <h1>تسجيل الدخول</h1>
      <form id="login-form" class="stack">
        <label>البريد الإلكتروني<input id="email" type="email" autocomplete="username" required></label>
        <label>كلمة المرور<input id="password" type="password" autocomplete="current-password" minlength="8" required></label>
        ${notice(message,isError)}
        <button class="btn primary" type="submit">دخول</button>
      </form>
    </section>`)
  document.querySelector('#login-form').onsubmit = async e => {
    e.preventDefault()
    const email=document.querySelector('#email').value.trim()
    const password=document.querySelector('#password').value
    const { error } = await supabase.auth.signInWithPassword({email,password})
    if (error) return renderLogin(error.message,true)
    await refreshAuth()
    renderLogin('تم تسجيل الدخول.')
  }
}

function requireSession() {
  if (!state.session) {
    shell('<section class="panel narrow"><h1>تسجيل الدخول مطلوب</h1><p>سجل دخولك أولًا للوصول لهذه الواجهة.</p><a class="btn primary" href="/login" data-nav>تسجيل الدخول</a></section>')
    return false
  }
  return true
}

async function renderAdmin(message='', isError=false) {
  if (!requireSession()) return
  if (state.profile?.global_role !== 'admin') {
    shell('<section class="panel"><h1>الإدارة العامة</h1><p>هذا الحساب لا يملك صلاحية الإدارة العامة.</p></section>')
    return
  }
  const [showroomsR, bookingsR] = await Promise.all([
    supabase.from('showrooms').select('*').order('name'),
    supabase.from('bookings').select('*,showrooms(name,address),services(name)').order('scheduled_at',{ascending:false})
  ])
  if (showroomsR.error || bookingsR.error) return shell(`<section class="panel">${notice(showroomsR.error?.message||bookingsR.error?.message,true)}</section>`)
  const showrooms=showroomsR.data||[], bookings=bookingsR.data||[]
  shell(`
    <section class="panel">
      <div class="page-heading"><div><div class="eyebrow">الإدارة العامة</div><h1>جميع طلبات الاتحاد</h1></div><span class="count-pill">${bookings.length} طلب</span></div>
      <div class="kpis">
        <div class="kpi"><strong>${showrooms.length}</strong><span>معرض</span></div>
        <div class="kpi"><strong>${bookings.filter(b=>b.status==='pending').length}</strong><span>جديد</span></div>
        <div class="kpi"><strong>${bookings.filter(b=>b.status==='in_progress').length}</strong><span>قيد التنفيذ</span></div>
        <div class="kpi"><strong>${bookings.filter(b=>b.status==='completed').length}</strong><span>مكتمل</span></div>
      </div>

      <div class="subpanel">
        <h2>إضافة معرض</h2>
        <form id="add-showroom" class="grid2">
          <label>اسم المعرض<input id="sr-name" required></label>
          <label>Slug<input id="sr-slug" required pattern="[a-z0-9-]+"></label>
          <label>العنوان<input id="sr-address"></label>
          <label>الهاتف<input id="sr-phone"></label>
          <button class="btn primary" type="submit">إضافة المعرض</button>
        </form>
      </div>

      <div class="filters">
        <input id="q" placeholder="بحث بالطلب أو العميل أو الهاتف">
        <select id="f-showroom"><option value="">كل المعارض</option>${showrooms.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select>
        <select id="f-status"><option value="">كل الحالات</option><option value="pending">جديد</option><option value="confirmed">مؤكد</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option><option value="rejected">مرفوض</option></select>
        <input id="f-date" type="date">
        <input id="f-employee" placeholder="معرّف الموظف">
      </div>
      ${notice(message,isError)}
      <div class="table-wrap">
        <table>
          <thead><tr><th>الطلب</th><th>المعرض</th><th>الخدمة</th><th>العميل</th><th>الموعد</th><th>الموظف</th><th>الحالة</th></tr></thead>
          <tbody id="admin-rows">
            ${bookings.map(b=>adminRow(b)).join('')}
          </tbody>
        </table>
      </div>
    </section>`)

  function filter() {
    const q=document.querySelector('#q').value.trim().toLowerCase()
    const showroom=document.querySelector('#f-showroom').value
    const status=document.querySelector('#f-status').value
    const date=document.querySelector('#f-date').value
    const employee=document.querySelector('#f-employee').value.trim().toLowerCase()
    const out=bookings.filter(b=>{
      if(showroom&&b.showroom_id!==showroom)return false
      if(status&&b.status!==status)return false
      if(date&&b.scheduled_at.slice(0,10)!==date)return false
      if(employee&&!String(b.assigned_employee_id||'').toLowerCase().includes(employee))return false
      if(q&&![b.order_number,b.customer_name,b.customer_phone,b.showrooms?.name,b.services?.name].some(v=>String(v||'').toLowerCase().includes(q)))return false
      return true
    })
    document.querySelector('#admin-rows').innerHTML=out.map(b=>adminRow(b)).join('')
    bindAdminRows()
  }
  ;['#q','#f-showroom','#f-status','#f-date','#f-employee'].forEach(sel=>document.querySelector(sel).oninput=filter)

  document.querySelector('#add-showroom').onsubmit=async e=>{
    e.preventDefault()
    const payload={name:document.querySelector('#sr-name').value.trim(),slug:document.querySelector('#sr-slug').value.trim().toLowerCase(),address:document.querySelector('#sr-address').value.trim()||null,phone:document.querySelector('#sr-phone').value.trim()||null}
    const {error}=await supabase.from('showrooms').insert(payload)
    if(error)return renderAdmin(error.message,true)
    renderAdmin('تمت إضافة المعرض.')
  }
  bindAdminRows()

  function bindAdminRows(){
    document.querySelectorAll('[data-status-id]').forEach(sel=>sel.onchange=async()=>{
      const {error}=await supabase.from('bookings').update({status:sel.value}).eq('id',sel.dataset.statusId)
      if(error)return renderAdmin(error.message,true)
      renderAdmin('تم تحديث حالة الطلب.')
    })
  }
}

function adminRow(b){
  return `<tr data-search-row>
    <td><strong>${escapeHtml(b.order_number)}</strong></td>
    <td>${escapeHtml(b.showrooms?.name||'')}</td>
    <td>${escapeHtml(b.services?.name||'')}</td>
    <td>${escapeHtml(b.customer_name)}<small class="block">${escapeHtml(b.customer_phone)}</small></td>
    <td>${escapeHtml(fmtDate(b.scheduled_at))}</td>
    <td class="mono">${escapeHtml(b.assigned_employee_id||'—')}</td>
    <td><select data-status-id="${b.id}">
      ${['pending','confirmed','in_progress','completed','cancelled','rejected'].map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
    </select></td>
  </tr>`
}

async function renderShowroom(message='', isError=false) {
  if (!requireSession()) return
  const managers=state.memberships.filter(m=>m.role==='manager')
  if(!managers.length){shell('<section class="panel"><h1>بوابة صاحب المعرض</h1><p>لا يوجد معرض مرتبط بهذا الحساب كمدير.</p></section>');return}
  let showroomId=sessionStorage.getItem('showroom-manager-id')||managers[0].showroom_id
  if(!managers.some(m=>m.showroom_id===showroomId))showroomId=managers[0].showroom_id
  const [sR,svcR,avR,bR,mR]=await Promise.all([
    supabase.from('showrooms').select('*').eq('id',showroomId).maybeSingle(),
    supabase.from('services').select('*').eq('showroom_id',showroomId).order('name'),
    supabase.from('showroom_availability').select('*').eq('showroom_id',showroomId).order('weekday'),
    supabase.from('bookings').select('*,services(name),showrooms(name,address)').eq('showroom_id',showroomId).order('scheduled_at'),
    supabase.from('showroom_memberships').select('showroom_id,user_id,role,is_active,profiles:user_id(full_name,phone)').eq('showroom_id',showroomId).eq('role','employee')
  ])
  const err=sR.error||svcR.error||avR.error||bR.error||mR.error
  if(err){shell(`<section class="panel">${notice(err.message,true)}</section>`);return}
  const showroom=sR.data, services=svcR.data||[], availability=avR.data||[], bookings=bR.data||[], employees=mR.data||[]
  shell(`
    <section class="panel">
      <div class="page-heading">
        <div><div class="eyebrow">بوابة صاحب المعرض</div><h1>${escapeHtml(showroom?.name||'المعرض')}</h1></div>
        ${managers.length>1?`<select id="manager-showroom">${managers.map(m=>`<option value="${m.showroom_id}" ${m.showroom_id===showroomId?'selected':''}>${escapeHtml(m.showrooms?.name||m.showroom_id)}</option>`).join('')}</select>`:''}
      </div>
      ${notice(message,isError)}
      <div class="dashboard-grid">
        <div class="subpanel">
          <h2>الخدمات</h2>
          <form id="add-service" class="stack">
            <label>اسم خدمة جديدة<input id="service-name" required></label>
            <label>مدة الخدمة بالدقائق<input id="service-duration" type="number" min="15" max="480" value="60" required></label>
            <button class="btn primary" type="submit">إضافة خدمة</button>
          </form>
          ${services.map(s=>`<div class="list-row"><div><strong>${escapeHtml(s.name)}</strong><small>${s.duration_minutes} دقيقة</small></div><button class="btn small" data-service-toggle="${s.id}" data-active="${s.is_active}">${s.is_active?'إيقاف':'تفعيل'}</button></div>`).join('')}
        </div>
        <div class="subpanel">
          <h2>سعة المواعيد</h2>
          <form id="add-availability" class="stack">
            <label>اليوم<select id="av-day"><option value="0">الأحد</option><option value="1">الإثنين</option><option value="2">الثلاثاء</option><option value="3">الأربعاء</option><option value="4">الخميس</option><option value="5">الجمعة</option><option value="6">السبت</option></select></label>
            <div class="grid2"><label>من<input id="av-start" type="time" value="09:00"></label><label>إلى<input id="av-end" type="time" value="17:00"></label></div>
            <div class="grid2"><label>مدة الخانة<input id="av-slot" type="number" min="15" value="60"></label><label>السعة<input id="av-cap" type="number" min="1" max="100" value="1"></label></div>
            <button class="btn primary" type="submit">إضافة دوام</button>
          </form>
          ${availability.map(a=>`<div class="list-row"><div><strong>يوم ${a.weekday}</strong><small>${escapeHtml(a.start_time)} - ${escapeHtml(a.end_time)}</small></div><label>السعة<input data-capacity="${a.id}" type="number" min="1" max="100" value="${a.capacity}"></label></div>`).join('')}
        </div>
      </div>
      <div class="subpanel">
        <h2>موظفو المعرض</h2>
        <form id="add-employee" class="grid2">
          <label>UUID حساب الموظف<input id="employee-id" required></label>
          <button class="btn primary" type="submit">ربط موظف</button>
        </form>
        ${employees.map(e=>`<div class="list-row"><div><strong>${escapeHtml(e.profiles?.full_name||e.user_id)}</strong><small>${escapeHtml(e.profiles?.phone||e.user_id)}</small></div><span>${e.is_active?'نشط':'متوقف'}</span></div>`).join('')}
      </div>
      <div class="subpanel">
        <h2>طلبات المعرض</h2>
        <div class="table-wrap"><table><thead><tr><th>الطلب</th><th>الخدمة</th><th>العنوان</th><th>الموعد</th><th>إسناد</th><th>الحالة</th></tr></thead><tbody>
          ${bookings.map(b=>`<tr><td>${escapeHtml(b.order_number)}</td><td>${escapeHtml(b.services?.name||'')}</td><td>${escapeHtml(b.execution_location==='home'?(b.address_text||''):(showroom?.address||''))}</td><td>${escapeHtml(fmtDate(b.scheduled_at))}</td><td><select data-assign="${b.id}"><option value="">غير مسند</option>${employees.filter(e=>e.is_active).map(e=>`<option value="${e.user_id}" ${b.assigned_employee_id===e.user_id?'selected':''}>${escapeHtml(e.profiles?.full_name||e.user_id)}</option>`).join('')}</select></td><td>${statusLabel(b.status)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </section>`)

  const switcher=document.querySelector('#manager-showroom')
  if(switcher)switcher.onchange=()=>{sessionStorage.setItem('showroom-manager-id',switcher.value);renderShowroom()}
  document.querySelector('#add-service').onsubmit=async e=>{
    e.preventDefault();const name=document.querySelector('#service-name').value.trim();const duration=Number(document.querySelector('#service-duration').value)
    const {error}=await supabase.from('services').insert({showroom_id:showroomId,name,duration_minutes:duration})
    if(error)return renderShowroom(error.message,true);renderShowroom('تمت إضافة الخدمة.')
  }
  document.querySelectorAll('[data-service-toggle]').forEach(btn=>btn.onclick=async()=>{
    const {error}=await supabase.from('services').update({is_active:btn.dataset.active!=='true'}).eq('id',btn.dataset.serviceToggle)
    if(error)return renderShowroom(error.message,true);renderShowroom('تم تحديث الخدمة.')
  })
  document.querySelector('#add-availability').onsubmit=async e=>{
    e.preventDefault();const payload={showroom_id:showroomId,weekday:Number(document.querySelector('#av-day').value),start_time:document.querySelector('#av-start').value,end_time:document.querySelector('#av-end').value,slot_minutes:Number(document.querySelector('#av-slot').value),capacity:Number(document.querySelector('#av-cap').value)}
    const {error}=await supabase.from('showroom_availability').insert(payload)
    if(error)return renderShowroom(error.message,true);renderShowroom('تمت إضافة الدوام.')
  }
  document.querySelectorAll('[data-capacity]').forEach(inp=>inp.onchange=async()=>{
    const cap=Math.max(1,Math.min(100,Number(inp.value)))
    const {error}=await supabase.from('showroom_availability').update({capacity:cap}).eq('id',inp.dataset.capacity)
    if(error)return renderShowroom(error.message,true);renderShowroom('تم تحديث السعة.')
  })
  document.querySelector('#add-employee').onsubmit=async e=>{
    e.preventDefault();const user_id=document.querySelector('#employee-id').value.trim()
    const {error}=await supabase.from('showroom_memberships').upsert({showroom_id:showroomId,user_id,role:'employee',is_active:true},{onConflict:'showroom_id,user_id'})
    if(error)return renderShowroom(error.message,true);renderShowroom('تم ربط الموظف.')
  }
  document.querySelectorAll('[data-assign]').forEach(sel=>sel.onchange=async()=>{
    const {error}=await supabase.from('bookings').update({assigned_employee_id:sel.value||null}).eq('id',sel.dataset.assign)
    if(error)return renderShowroom(error.message,true);renderShowroom('تم تحديث إسناد المهمة.')
  })
}

async function renderTeam(message='',isError=false){
  if(!requireSession())return
  const uid=state.session.user.id
  const {data,error}=await supabase.from('bookings').select('*,showrooms(name,address),services(name)').eq('assigned_employee_id',uid).order('scheduled_at')
  if(error){shell(`<section class="panel">${notice(error.message,true)}</section>`);return}
  const bookings=data||[]
  shell(`
    <section class="panel">
      <div class="eyebrow">فريق الصيانة</div><h1>مهامي</h1>
      ${notice(message,isError)}
      <div class="task-grid">
        ${!bookings.length?'<div class="empty">لا توجد مهام مسندة لهذا الحساب.</div>':''}
        ${bookings.map(b=>`<article class="task-card">
          <div class="task-head"><strong>${escapeHtml(b.order_number)}</strong><span class="status ${b.status}">${statusLabel(b.status)}</span></div>
          <h3>${escapeHtml(b.services?.name||'')}</h3>
          <p><strong>المعرض:</strong> ${escapeHtml(b.showrooms?.name||'')}</p>
          <p><strong>العنوان:</strong> ${escapeHtml(b.execution_location==='home'?(b.address_text||''):(b.showrooms?.address||''))}</p>
          <p><strong>الموعد:</strong> ${escapeHtml(fmtDate(b.scheduled_at))}</p>
          <label>ملاحظات التنفيذ<textarea data-note="${b.id}" rows="3">${escapeHtml(b.execution_notes||'')}</textarea></label>
          <div class="button-row">
            <button class="btn" data-task="${b.id}" data-task-status="in_progress">بدء التنفيذ</button>
            <button class="btn primary" data-task="${b.id}" data-task-status="completed">إتمام المهمة</button>
          </div>
        </article>`).join('')}
      </div>
    </section>`)
  document.querySelectorAll('[data-task]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.task
    const note=document.querySelector(`[data-note="${id}"]`).value
    const {error}=await supabase.rpc('employee_update_booking',{p_booking_id:id,p_status:btn.dataset.taskStatus,p_execution_notes:note||null})
    if(error)return renderTeam(error.message,true);renderTeam('تم تحديث المهمة.')
  })
}

async function render(){
  await refreshAuth()
  switch(path()){
    case '/': return renderBooking()
    case '/login': return renderLogin()
    case '/admin': return renderAdmin()
    case '/showroom': return renderShowroom()
    case '/team': return renderTeam()
    default: return renderBooking()
  }
}

window.addEventListener('popstate',render)
supabase.auth.onAuthStateChange(()=>setTimeout(render,0))
render().catch(err=>shell(`<section class="panel">${notice(err?.message||'حدث خطأ غير متوقع',true)}</section>`))

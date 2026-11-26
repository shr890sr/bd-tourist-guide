(() => {
  const localLiveServer = location.port === '5500' && ['localhost', '127.0.0.1'].includes(location.hostname);
  const API = localLiveServer ? `http://${location.hostname}:3000/api` : '/api';
  const tokenKey = 'bdtg-session-token';
  const token = () => sessionStorage.getItem(tokenKey);
  async function api(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...options.headers };
    let response;
    try { response = await fetch(`${API}${path}`, { ...options, headers }); }
    catch { throw new Error('The site service could not be reached. Please try again later.'); }
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `Request failed (${response.status}).`);
    return data;
  }
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const feedback = (form, message, success = false) => { const node = form.querySelector('.form-feedback'); if (node) { node.textContent = message; node.style.color = success ? '#1b7049' : ''; } };

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav?.classList.toggle('is-open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open'); menuButton?.setAttribute('aria-expanded', 'false'); menuButton?.setAttribute('aria-label', 'Open navigation');
  }));

  const grid = document.querySelector('#destination-grid');
  const searchForm = document.querySelector('#destination-search');
  const searchInput = document.querySelector('#search-query');
  const regionFilter = document.querySelector('#location-filter');
  const languageFilter = document.querySelector('#language-filter');
  const destinationEmpty = document.querySelector('#destination-empty');
  const destinationStatus = document.querySelector('#destination-status');
  let destinations = [];
  function makeDestinationCard(item) {
    const card = document.createElement('article'); card.className = 'destination-card';
    const link = document.createElement('a'); link.className = 'card-image-link'; link.href = '#guides'; link.setAttribute('aria-label', `Explore ${item.name}`);
    const image = document.createElement('img'); image.src = item.imageUrl || ''; image.alt = `${item.name} destination`; image.loading = 'lazy'; image.addEventListener('error', () => { image.hidden = true; }); link.append(image);
    const tag = document.createElement('span'); tag.className = 'image-tag'; tag.textContent = item.category || 'Destination'; link.append(tag);
    const content = document.createElement('div'); content.className = 'card-content';
    const location = document.createElement('p'); location.className = 'card-location'; location.textContent = item.location;
    const title = document.createElement('h3'); title.textContent = item.name;
    const description = document.createElement('p'); description.textContent = item.description;
    const more = document.createElement('a'); more.className = 'text-link'; more.href = '#guides'; more.append(document.createTextNode('Explore destination ')); const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→'; more.append(arrow);
    content.append(location, title, description, more); card.append(link, content); return card;
  }
  function showLocalDestinations() {
    const query = searchInput.value.trim().toLocaleLowerCase(), region = regionFilter.value.toLocaleLowerCase();
    const cards = [...grid.querySelectorAll('.destination-card')]; let count = 0;
    cards.forEach(card => { const show = card.dataset.name.toLocaleLowerCase().includes(query) && (!region || card.dataset.region.toLocaleLowerCase().includes(region)); card.hidden = !show; if (show) count++; });
    destinationEmpty.hidden = count > 0; destinationStatus.textContent = `${count} destination${count === 1 ? '' : 's'} shown from the local page.`;
  }
  let destinationRequest = 0;
  async function loadDestinations() {
    const request = ++destinationRequest; const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (regionFilter.value) params.set('location', regionFilter.value);
    try {
      const result = await api(`/destinations?${params}`); if (request !== destinationRequest) return;
      destinations = result.data; grid.replaceChildren(...destinations.map(makeDestinationCard));
      destinationEmpty.hidden = destinations.length > 0; destinationStatus.textContent = params.size ? `${result.pagination.total} destination${result.pagination.total === 1 ? '' : 's'} found` : '';
      updateReviewTargets(); loadGuides();
    } catch { if (request === destinationRequest) showLocalDestinations(); }
  }
  let searchTimer;
  searchForm?.addEventListener('submit', event => { event.preventDefault(); loadDestinations(); document.querySelector('#destinations').scrollIntoView({ behavior: 'smooth' }); });
  searchInput?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadDestinations, 250); });
  regionFilter?.addEventListener('change', loadDestinations);

  const guideList = document.querySelector('#guide-list');
  let currentGuides = [];
  async function loadGuides() {
    const params = new URLSearchParams(); if (languageFilter.value) params.set('language', languageFilter.value);
    if (regionFilter.value) params.set('location', regionFilter.value);
    try {
      const result = await api(`/guides?${params}`); currentGuides = result.data; renderGuides(currentGuides);
    } catch { currentGuides = []; }
  }
  function renderGuides(guides) {
    guideList.replaceChildren();
    if (!guides.length) { const icon = document.createElement('span'); icon.className = 'guide-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = '✳'; const heading = document.createElement('h3'); heading.textContent = 'No matching guides'; const copy = document.createElement('p'); copy.textContent = 'No approved guide profiles match these filters yet.'; guideList.append(icon, heading, copy); return; }
    guides.forEach(guide => {
      const card = document.createElement('article'); card.className = 'guide-list-card'; const heading = document.createElement('h3'); heading.textContent = guide.name;
      const details = document.createElement('p'); details.textContent = `${guide.location} · ${guide.languages.join(', ')} · ${guide.guideType}`;
      const intro = document.createElement('p'); intro.textContent = guide.introduction; card.append(heading, details, intro);
      const hire = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Send a hiring request'; hire.append(summary);
      const form = document.createElement('form'); form.className = 'booking-form';
      form.innerHTML = `<label>Destination<select name="destinationId" required>${destinations.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label><label>Travel date<input type="date" name="travelDate" required></label><label>Request details<textarea name="requestDetails" maxlength="2000" required></textarea></label><button class="button button-light" type="submit">Send request</button><p class="form-feedback" aria-live="polite"></p>`;
      form.addEventListener('submit', async event => { event.preventDefault(); if (!token()) { document.querySelector('#account').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#account-status').textContent = 'Sign in or create an account before sending a hiring request.'; return; }
        const data = Object.fromEntries(new FormData(form)); data.guideId = guide.id; data.destinationId = Number(data.destinationId);
        try { const result = await api('/bookings', { method: 'POST', body: JSON.stringify(data) }); feedback(form, `Request #${result.data.id} sent. Its status is pending until the guide responds.`, true); form.reset(); loadBookings(); }
        catch (error) { feedback(form, error.message); }
      });
      hire.append(form); card.append(hire); guideList.append(card);
    });
  }
  languageFilter?.addEventListener('change', loadGuides);

  const reviewTargetType = document.querySelector('[name="targetType"]');
  const reviewTarget = document.querySelector('[name="targetId"]');
  function updateReviewTargets() {
    const values = reviewTargetType.value === 'guide' ? currentGuides.map(g => ({ id: g.id, name: `${g.name} — ${g.location}` })) : destinations.map(d => ({ id: d.id, name: d.name }));
    reviewTarget.replaceChildren(); const first = document.createElement('option'); first.value = ''; first.textContent = values.length ? 'Choose one' : 'No options available'; reviewTarget.append(first);
    values.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; reviewTarget.append(option); }); reviewTarget.disabled = !values.length;
  }
  reviewTargetType?.addEventListener('change', () => { if (reviewTargetType.value === 'guide') loadGuides().then(updateReviewTargets); else updateReviewTargets(); });
  async function loadReviews() {
    const panel = document.querySelector('#review-list');
    try { const result = await api('/reviews?limit=6'); panel.replaceChildren();
      if (!result.data.length) { const heading = document.createElement('p'); heading.textContent = 'No traveler reviews are available yet.'; const note = document.createElement('small'); note.textContent = 'Reviews appear here after travelers submit them.'; panel.append(heading, note); return; }
      result.data.forEach(review => { const item = document.createElement('article'); item.className = 'review-item'; const name = document.createElement('strong'); name.textContent = `${review.reviewer_name} · ${'★'.repeat(review.rating)}`; const copy = document.createElement('p'); copy.textContent = review.comment; const date = document.createElement('small'); date.textContent = new Date(review.created_at + 'Z').toLocaleDateString(); item.append(name, copy, date); panel.append(item); });
    } catch { panel.textContent = 'Traveler reviews could not be loaded right now.'; }
  }
  document.querySelector('#review-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; if (!token()) { feedback(form, 'Sign in to submit a review.'); return; }
    const raw = Object.fromEntries(new FormData(form)), body = { rating: Number(raw.rating), comment: raw.comment };
    if (raw.targetType === 'guide') body.guideId = Number(raw.targetId); else body.destinationId = Number(raw.targetId);
    try { await api('/reviews', { method: 'POST', body: JSON.stringify(body) }); feedback(form, 'Review submitted successfully.', true); form.reset(); updateReviewTargets(); await loadReviews(); }
    catch (error) { feedback(form, error.message); }
  });

  const authForm = document.querySelector('#auth-form'); let authMode = 'register';
  function setAuthMode(mode) { authMode = mode; const registering = mode === 'register'; document.querySelector('#auth-heading').textContent = registering ? 'Create your account' : 'Sign in to your account'; document.querySelector('#full-name-field').hidden = !registering; document.querySelector('#phone-field').hidden = !registering; authForm.elements.fullName.required = registering; authForm.elements.password.autocomplete = registering ? 'new-password' : 'current-password'; authForm.querySelector('button[type=submit]').textContent = registering ? 'Create account' : 'Sign in'; document.querySelector('#auth-mode').textContent = registering ? 'Already have an account? Sign in' : 'New here? Create an account'; }
  document.querySelector('#auth-mode')?.addEventListener('click', () => setAuthMode(authMode === 'register' ? 'login' : 'register'));
  let currentRole = 'tourist';
  async function loadBookings() {
    if (!token()) return; const list = document.querySelector('#booking-list');
    try {
      const incoming = currentRole === 'guide'; const result = await api(incoming ? '/bookings/incoming' : '/bookings/mine'); list.replaceChildren();
      const title = document.createElement('h4'); title.textContent = incoming ? 'Incoming hiring requests' : 'Your hiring requests'; list.append(title);
      if (!result.data.length) { const p = document.createElement('p'); p.textContent = incoming ? 'You have no incoming requests.' : 'You have no hiring requests.'; list.append(p); }
      result.data.forEach(booking => {
        const row = document.createElement('div'); row.className = 'booking-row'; const detail = document.createElement('p'); detail.textContent = `${booking.destination_name} · ${booking.travel_date} · ${booking.status}${incoming ? ` · ${booking.tourist_name}` : ` · ${booking.guide_name}`}`; row.append(detail);
        const actions = incoming ? (booking.status === 'pending' ? ['accepted', 'rejected'] : booking.status === 'accepted' ? ['completed'] : []) : ['pending', 'accepted'].includes(booking.status) ? ['cancelled'] : [];
        actions.forEach(status => { const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button'; button.textContent = status[0].toUpperCase() + status.slice(1); button.addEventListener('click', async () => { try { await api(`/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); loadBookings(); } catch (error) { detail.textContent = error.message; } }); row.append(button); }); list.append(row);
      });
    } catch (error) { list.textContent = error.message; }
  }
  const guideProfileForm = document.querySelector('#guide-profile-form');
  async function loadGuideProfile() {
    if (currentRole !== 'guide') { guideProfileForm.hidden = true; return; }
    try { const result = await api('/guides/me'); const profile = result.data; guideProfileForm.elements.introduction.value = profile.introduction; guideProfileForm.elements.location.value = profile.location; guideProfileForm.elements.languages.value = profile.languages.join(', '); guideProfileForm.elements.guideType.value = profile.guide_type; guideProfileForm.hidden = false; }
    catch (error) { feedback(guideProfileForm, error.message); guideProfileForm.hidden = false; }
  }
  guideProfileForm?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const body = { introduction: values.introduction, location: values.location, languages: values.languages.split(',').map(value => value.trim()).filter(Boolean), guideType: values.guideType };
    try { await api('/guides/me', { method: 'PATCH', body: JSON.stringify(body) }); feedback(form, 'Guide profile updated.', true); loadGuides(); }
    catch (error) { feedback(form, error.message); }
  });
  async function refreshSession() {
    if (!token()) { document.querySelector('#auth-form').hidden = false; document.querySelector('#signed-in-panel').hidden = true; document.querySelector('#account-status').textContent = 'You are not signed in.'; return; }
    try { const result = await api('/auth/me'); currentRole = result.user.role; document.querySelector('#auth-form').hidden = true; document.querySelector('#signed-in-panel').hidden = false; document.querySelector('#signed-in-name').textContent = result.user.fullName; document.querySelector('#signed-in-email').textContent = result.user.email; document.querySelector('#account-status').textContent = `Signed in as ${result.user.role}.`; loadBookings(); loadApplicationStatus(); loadGuideProfile(); }
    catch { sessionStorage.removeItem(tokenKey); document.querySelector('#auth-form').hidden = false; document.querySelector('#signed-in-panel').hidden = true; document.querySelector('#account-status').textContent = 'Your session expired. Please sign in again.'; }
  }
  authForm?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const body = { email: values.email, password: values.password }; if (authMode === 'register') { body.fullName = values.fullName; if (values.phone) body.phone = values.phone; }
    try { const result = await api(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(body) }); sessionStorage.setItem(tokenKey, result.token); feedback(form, '', true); form.reset(); await refreshSession(); }
    catch (error) { feedback(form, error.message); }
  });
  document.querySelector('#logout-button')?.addEventListener('click', async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* local session still needs clearing */ } sessionStorage.removeItem(tokenKey); await refreshSession(); });

  const applicationForm = document.querySelector('#application-form');
  async function loadApplicationStatus() { const node = document.querySelector('#application-status'); if (!token()) return; try { const result = await api('/applications/me'); node.textContent = `Volunteer application status: ${result.data.status}.`; applicationForm.hidden = true; } catch (error) { if (error.message.includes('not found')) { node.textContent = 'You have not applied to become a volunteer guide.'; applicationForm.hidden = false; } else { node.textContent = error.message; } } }
  applicationForm?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; if (!token()) { feedback(form, 'Create an account or sign in before applying.'); document.querySelector('#account').scrollIntoView({ behavior: 'smooth' }); return; }
    const values = Object.fromEntries(new FormData(form)); const body = { introduction: values.introduction, location: values.location, languages: values.languages.split(',').map(value => value.trim()).filter(Boolean), experience: values.experience };
    try { const result = await api('/applications', { method: 'POST', body: JSON.stringify(body) }); feedback(form, `Application #${result.data.id} submitted. Its status is pending administrator review.`, true); form.hidden = true; loadApplicationStatus(); }
    catch (error) { feedback(form, error.message); }
  });

  document.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { if (img.dataset.fallback && !img.dataset.fallbackTried) { img.dataset.fallbackTried = 'true'; img.src = img.dataset.fallback; } else img.hidden = true; }));
  document.querySelector('#year').textContent = new Date().getFullYear();
  setAuthMode('register'); refreshSession(); loadDestinations(); loadReviews();
})();

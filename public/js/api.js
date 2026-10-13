const Api = (() => {
  const TOKEN_KEY = 'campushub_token';
  const USER_KEY = 'campushub_user';

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  }
  function setSession(t, u) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }
  function clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, { method = 'GET', body, form } = {}) {
    const headers = {};
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(`/api${path}`, { method, headers, body: payload });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : await res.blob();
    if (res.status === 401) {
      clear();
      if (!location.hash.includes('login')) location.hash = '#login';
    }
    if (!res.ok) {
      const msg = data && data.message ? data.message : 'Request failed';
      throw new Error(msg);
    }
    return data;
  }

  function fileUrl(id) {
    return `/api/files/${id}`;
  }

  async function download(id, name) {
    const t = token();
    const res = await fetch(`/api/files/${id}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;
      throw new Error(data?.message || 'Download failed');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { token, user, setSession, clear, request, fileUrl, download };
})();

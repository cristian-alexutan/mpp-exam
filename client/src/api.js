function getAuthHeader() {
  try {
    const user = JSON.parse(localStorage.getItem('tt_user'));
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch { return {}; }
}

export async function apiFetch(url, { body, method = 'GET', headers = {}, ...opts } = {}) {
  const isFormData = body instanceof FormData;
  return fetch(url, {
    method,
    headers: {
      ...getAuthHeader(),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    ...opts,
  });
}

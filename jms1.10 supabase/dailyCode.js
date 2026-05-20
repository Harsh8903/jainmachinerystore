(async function () {
  const SESSION_KEY = 'jms_code_verified';
  if (sessionStorage.getItem(SESSION_KEY)) return;

  const DEFAULT_FORMULA = '{date} * ({month} + 1) + 5';

  function evalFormula(expr) {
    const now = new Date();
    const safe = expr
      .replace(/\{date\}/g, now.getDate())
      .replace(/\{month\}/g, now.getMonth() + 1)
      .replace(/\{year\}/g, now.getFullYear())
      .replace(/\{day\}/g, now.getDay());
    if (!/^[\d\s\+\-\*\/\%\(\)\.]+$/.test(safe)) return null;
    try {
      const result = Function('"use strict"; return (' + safe + ')')();
      return isFinite(result) ? String(Math.round(result)) : null;
    } catch { return null; }
  }

  // Try to get formula from Supabase, fall back to localStorage then default
  let formula = DEFAULT_FORMULA;
  try {
    if (typeof sb !== 'undefined') {
      const { data } = await sb.from('settings').select('value').eq('key', 'otp_formula').single();
      if (data && data.value) formula = data.value;
    } else {
      formula = localStorage.getItem('jms_otp_formula') || DEFAULT_FORMULA;
    }
  } catch {
    formula = localStorage.getItem('jms_otp_formula') || DEFAULT_FORMULA;
  }

  const code = evalFormula(formula);
  if (!code) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:1rem;padding:2rem;width:90%;max-width:340px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2);">
      <span class="material-symbols-outlined" style="font-size:40px;color:#4b41e1;">lock</span>
      <h2 style="font-size:18px;font-weight:800;margin:.75rem 0 .25rem;color:#111;">Daily Access Code</h2>
      <p style="font-size:13px;color:#666;margin-bottom:1.25rem;">Enter today's code to continue.</p>
      <input id="jms-code-input" type="number" placeholder="Enter code"
        style="width:100%;border:1.5px solid #c6c6cd;border-radius:.5rem;padding:.65rem 1rem;font-size:16px;text-align:center;outline:none;margin-bottom:.75rem;" />
      <p id="jms-code-error" style="color:#ba1a1a;font-size:12px;min-height:16px;margin-bottom:.5rem;"></p>
      <button id="jms-code-btn"
        style="width:100%;background:#4b41e1;color:#fff;border:none;border-radius:.5rem;padding:.75rem;font-size:15px;font-weight:700;cursor:pointer;">
        Enter
      </button>
    </div>`;

  document.body.appendChild(overlay);

  function attempt() {
    const val = document.getElementById('jms-code-input').value.trim();
    if (val === code) {
      sessionStorage.setItem(SESSION_KEY, '1');
      overlay.remove();
    } else {
      document.getElementById('jms-code-error').textContent = 'Incorrect code. Try again.';
      document.getElementById('jms-code-input').value = '';
    }
  }

  document.getElementById('jms-code-btn').addEventListener('click', attempt);
  document.getElementById('jms-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
})();

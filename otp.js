/* otp.js: browser-side OTP logic for the King of Cards planner.
   Contains NO secrets. It only talks to your own backend (otp-backend.gs).
   Exposes window.KocOtp = { LENGTH, send(phone), verify(phone, code), cooldownLeft() } */
(function () {
  'use strict';

  // Paste the Web App URL you get after deploying otp-backend.gs
  const OTP_ENDPOINT = 'https://koc-otp.video-b66.workers.dev';
  const LENGTH = 6;           // must match CFG.OTP_LENGTH in otp-backend.gs
  const RESEND_SECONDS = 30;  // must match CFG.COOLDOWN in otp-backend.gs

  let resendAt = 0;

  async function call(action, payload) {
    if (!OTP_ENDPOINT || OTP_ENDPOINT.indexOf('PASTE') === 0) return { ok: false, error: 'OTP service is not configured yet.' };
    try {
      // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
      const res = await fetch(OTP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action }, payload))
      });
      return await res.json();
    } catch (e) {
      return { ok: false, error: 'Network problem. Check your connection and try again.' };
    }
  }

  function cooldownLeft() { return Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)); }

  async function send(phone) {
    if (!/^[6-9]\d{9}$/.test(phone || '')) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
    const left = cooldownLeft();
    if (left > 0) return { ok: false, error: 'Please wait ' + left + 's before asking for another code.' };
    const r = await call('send', { phone });
    if (r.ok) resendAt = Date.now() + RESEND_SECONDS * 1000;
    return r;
  }

  async function verify(phone, code) {
    if (!new RegExp('^\\d{' + LENGTH + '}$').test(code || '')) return { ok: false, error: 'Enter the ' + LENGTH + '-digit code.' };
    return call('verify', { phone, code });
  }

  window.KocOtp = { LENGTH, send, verify, cooldownLeft };
})();
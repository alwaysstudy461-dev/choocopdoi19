import React, { useEffect, useRef, useState } from 'react';
import { useOcop } from '../context/OcopContext.jsx';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { dictateToValue } from '../utils/speech.js';
import OcopIcon from './OcopIcon.jsx';

export default function AuthModal() {
  const {
    authModalState,
    closeAuthModal,
    accounts,
    loginAccount,
    registerAccount,
    restoreDefaultUser,
    showToast,
  } = useOcop();

  const [role, setRole] = useState(authModalState.role || 'farmer');
  const [mode, setMode] = useState(authModalState.mode || 'login');

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginErr, setLoginErr] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddr, setRegAddr] = useState('');
  const [regFarmName, setRegFarmName] = useState('');
  const [regRegion, setRegRegion] = useState('Long Khánh');
  const [regCert, setRegCert] = useState('OCOP 4 sao');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regErr, setRegErr] = useState('');
  const modalBoxRef = useRef(null);

  useGSAP(
    () => {
      if (!authModalState.open || !modalBoxRef.current || isReducedMotion()) return;
      gsap.from(modalBoxRef.current, {
        opacity: 0,
        y: 12,
        scale: 0.97,
        duration: 0.24,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { dependencies: [authModalState.open] }
  );

  useEffect(() => {
    if (authModalState.open) {
      setRole(authModalState.role || 'farmer');
      setMode(authModalState.mode || 'login');
      setLoginErr('');
      setRegErr('');
    }
  }, [authModalState.open, authModalState.mode, authModalState.role]);

  if (!authModalState.open) return null;

  const isF = role === 'farmer';
  const isReg = mode === 'register';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginErr('');
    const cleanPhone = loginPhone.trim().replace(/\s+/g, '');
    if (cleanPhone.length < 9) {
      setLoginErr('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9 số).');
      return;
    }
    if (loginPass.length < 6) {
      setLoginErr('Mật khẩu tối thiểu 6 ký tự (mẫu: 123456).');
      return;
    }

    const res = await loginAccount({ phone: cleanPhone, password: loginPass });
    if (res.ok && res.user) {
      closeAuthModal();
      setLoginPhone('');
      setLoginPass('');
      showToast(`Xin chào ${res.user.farmName || res.user.name}!`, 'check-circle');
      return;
    }

    setLoginErr(res.error || 'Số điện thoại này chưa đăng ký. Hãy bấm tab “Đăng ký tài khoản mới” để tạo ngay!');
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setRegErr('');
    const name = regName.trim();
    const phone = regPhone.trim().replace(/\s+/g, '');

    if (!name || phone.length < 9 || regPass.length < 6) {
      setRegErr('Nhập đủ Họ tên, SĐT (≥9 số) và Mật khẩu (≥6 ký tự).');
      return;
    }
    if (regPass !== regPass2) {
      setRegErr('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    const farmName = isF ? regFarmName.trim() : '';
    if (isF && !farmName) {
      setRegErr('Nhà vườn vui lòng nhập Tên nhà vườn / HTX.');
      return;
    }

    if (accounts.some((a) => String(a.phone || '').replace(/\s+/g, '') === phone)) {
      setRegErr('Số điện thoại này đã tồn tại. Bạn có thể đăng nhập trực tiếp!');
      return;
    }

    const res = await registerAccount({
      role,
      name,
      phone,
      password: regPass,
      address: !isF ? regAddr.trim() : '',
      farmName,
      region: regRegion,
      cert: regCert,
    });

    if (!res.ok) {
      setRegErr(res.error || 'Không thể tạo tài khoản lúc này.');
      return;
    }

    closeAuthModal();
    setRegName('');
    setRegPhone('');
    setRegAddr('');
    setRegFarmName('');
    setRegPass('');
    setRegPass2('');
    showToast(`Tạo tài khoản thành công! Xin chào ${res.user.farmName || res.user.name}!`, 'party');
  };

  const submitBtnCls = isF
    ? 'w-full py-3 rounded-xl bg-harvest hover:bg-harvest-dark text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-1.5'
    : 'w-full py-3 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-1.5';

  return (
    <div
      id="ocop-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập hoặc Đăng ký tài khoản mới"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div ref={modalBoxRef} className="bg-white rounded-panel max-w-lg w-full shadow-2xl border border-forest-dark/15 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div
          id="auth-m-banner"
          className={
            isF
              ? 'p-5 bg-gradient-to-br from-harvest-dark to-harvest text-white relative shrink-0 transition-all'
              : 'p-5 bg-gradient-to-br from-forest-dark to-forest text-white relative shrink-0 transition-all'
          }
        >
          <button
            type="button"
            id="btn-close-auth-modal"
            aria-label="Đóng hộp thoại tài khoản"
            onClick={closeAuthModal}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-sale text-white font-extrabold flex items-center justify-center transition-colors"
          >
            <OcopIcon name="x" className="w-4 h-4" />
          </button>
          <span id="auth-m-pill" className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-sunny text-[11px] font-extrabold uppercase">
            <OcopIcon name={isF ? 'farmer' : 'cart'} className="w-3.5 h-3.5" />
            <span>{isF ? 'Nhà nông / Nhà vườn' : 'Khách hàng'}</span>
          </span>
          <h3 id="auth-m-title" className="text-lg sm:text-xl font-extrabold mt-1.5">
            {isReg
              ? isF ? 'Đăng ký tài khoản Nhà vườn mới' : 'Đăng ký tài khoản Khách hàng mới'
              : isF ? 'Đăng nhập Kênh Nhà vườn' : 'Đăng nhập Khách hàng'}
          </h3>
          <p id="auth-m-sub" className="text-xs text-white/85 mt-0.5">
            {isReg
              ? 'Tài khoản mới được lưu đồng bộ để sử dụng trên toàn Chợ OCOP.'
              : 'Nhập số điện thoại tài khoản đã tạo hoặc chọn nhanh bên dưới.'}
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              id="auth-m-role-cust"
              onClick={() => {
                setRole('customer');
                setLoginErr('');
                setRegErr('');
              }}
              className={
                !isF
                  ? 'text-left p-3 rounded-2xl border-2 border-forest bg-mint shadow-sm transition-all'
                  : 'text-left p-3 rounded-2xl border-2 border-forest-dark/15 bg-bgsoft transition-all'
              }
            >
              <div className="text-forest mb-1">
                <OcopIcon name="cart" className="w-5 h-5" />
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-forest-dark">Khách hàng</div>
              <div className="text-[11px] text-forest-dark/65">Mua sắm &amp; lưu địa chỉ</div>
            </button>
            <button
              type="button"
              id="auth-m-role-farm"
              onClick={() => {
                setRole('farmer');
                setLoginErr('');
                setRegErr('');
              }}
              className={
                isF
                  ? 'text-left p-3 rounded-2xl border-2 border-harvest bg-harvest-light shadow-sm transition-all'
                  : 'text-left p-3 rounded-2xl border-2 border-forest-dark/15 bg-bgsoft transition-all'
              }
            >
              <div className="text-harvest-dark mb-1">
                <OcopIcon name="farmer" className="w-5 h-5" />
              </div>
              <div className="font-extrabold text-xs sm:text-sm text-forest-dark">Nhà nông / Vườn</div>
              <div className="text-[11px] text-forest-dark/65">Quản lý đơn &amp; đăng bán AI</div>
            </button>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-bgsoft border border-forest-dark/10">
            <button
              type="button"
              id="auth-m-tab-login"
              onClick={() => {
                setMode('login');
                setLoginErr('');
                setRegErr('');
              }}
              className={
                !isReg
                  ? 'py-2 rounded-lg text-xs sm:text-sm font-extrabold bg-white text-forest-dark shadow-sm'
                  : 'py-2 rounded-lg text-xs sm:text-sm font-bold text-forest-dark/65'
              }
            >
              Đăng nhập
            </button>
            <button
              type="button"
              id="auth-m-tab-reg"
              onClick={() => {
                setMode('register');
                setLoginErr('');
                setRegErr('');
              }}
              className={
                isReg
                  ? 'py-2 rounded-lg text-xs sm:text-sm font-extrabold bg-white text-forest-dark shadow-sm'
                  : 'py-2 rounded-lg text-xs sm:text-sm font-bold text-forest-dark/65'
              }
            >
              Đăng ký tài khoản mới
            </button>
          </div>

          {!isReg ? (
            <form id="auth-m-login-form" onSubmit={handleLoginSubmit} className="space-y-3" noValidate>
              <div>
                <label htmlFor="auth-m-login-id" className="block text-xs font-extrabold mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  id="auth-m-login-id"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="VD: 0987654321 hoặc SĐT vừa đăng ký"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgsoft border border-forest-dark/20 focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm font-medium"
                />
              </div>
              <div>
                <label htmlFor="auth-m-login-pass" className="block text-xs font-extrabold mb-1">
                  Mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    id="auth-m-login-pass"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự (mẫu: 123456)"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-bgsoft border border-forest-dark/20 focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm font-medium"
                  />
                  <button
                    type="button"
                    aria-label={showLoginPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowLoginPass((v) => !v)}
                    className="auth-m-eye absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-mint text-forest-dark flex items-center justify-center"
                  >
                    <OcopIcon name={showLoginPass ? 'eye-off' : 'eye'} className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loginErr ? (
                <div id="auth-m-login-err" role="alert" className="text-xs font-bold text-sale bg-sale/10 p-2.5 rounded-xl flex items-start gap-2">
                  <OcopIcon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginErr}</span>
                </div>
              ) : null}
              <button type="submit" id="auth-m-login-btn" className={submitBtnCls}>
                <span>{isF ? 'Đăng nhập Nhà vườn' : 'Đăng nhập Khách hàng'}</span>
                <OcopIcon name="arrow-right" className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-forest-dark/10 space-y-2">
                <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-forest-dark/55">
                  <OcopIcon name="zap" className="w-3.5 h-3.5 text-sunny" />
                  <span>Hoặc chọn nhanh tài khoản đã tạo:</span>
                </div>
                <div id="auth-m-saved-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {accounts.map((a) => {
                    const isFarmerAcc = a.role === 'farmer';
                    return (
                      <button
                        key={a.phone}
                        type="button"
                        onClick={() => restoreDefaultUser(a.phone)}
                        className={`text-left p-2.5 rounded-xl border transition-colors ${
                          isFarmerAcc
                            ? 'bg-harvest-light/70 hover:bg-amber-200/80 border-harvest/25 text-harvest-dark'
                            : 'bg-mint/80 hover:bg-forest/15 border-forest/20 text-forest-dark'
                        }`}
                      >
                        <div className="font-extrabold text-xs truncate flex items-center gap-1">
                          <OcopIcon name={isFarmerAcc ? 'farmer' : 'cart'} className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isFarmerAcc ? a.farmName || a.name : a.name}</span>
                        </div>
                        <div className="text-[10px] opacity-75 truncate">
                          {a.phone}
                          {isFarmerAcc && a.region ? ` • ${a.region}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          ) : (
            <form id="auth-m-reg-form" onSubmit={handleRegSubmit} className="space-y-3" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="auth-m-reg-name" id="auth-m-reg-name-lbl" className="block text-xs font-extrabold mb-1">
                    {isF ? 'Họ tên chủ vườn *' : 'Họ và tên *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="auth-m-reg-name"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="VD: Trần Văn Hải"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm"
                    />
                    <button
                      type="button"
                      title="Nói họ tên"
                      aria-label="Nói họ tên"
                      onClick={() => dictateToValue({ onToast: (m) => showToast(m, 'mic'), onInterim: setRegName, onDone: setRegName })}
                      className="auth-m-mic absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-mint text-forest text-xs flex items-center justify-center"
                    >
                      <OcopIcon name="mic" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="auth-m-reg-phone" className="block text-xs font-extrabold mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    id="auth-m-reg-phone"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm"
                  />
                </div>
              </div>

              {!isF ? (
                <div id="auth-m-reg-cust-box">
                  <label htmlFor="auth-m-reg-addr" className="block text-xs font-extrabold mb-1">
                    Địa chỉ nhận hàng mặc định
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="auth-m-reg-addr"
                      value={regAddr}
                      onChange={(e) => setRegAddr(e.target.value)}
                      placeholder="Số nhà, phường/xã, TP. Biên Hòa..."
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm"
                    />
                    <button
                      type="button"
                      title="Đọc địa chỉ"
                      aria-label="Đọc địa chỉ"
                      onClick={() => dictateToValue({ onToast: (m) => showToast(m, 'mic'), onInterim: setRegAddr, onDone: setRegAddr })}
                      className="auth-m-mic absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-mint text-forest text-xs flex items-center justify-center"
                    >
                      <OcopIcon name="mic" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div id="auth-m-reg-farm-box" className="space-y-2.5 bg-harvest-light/70 p-3 rounded-2xl border border-harvest/25">
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-harvest-dark">
                    <OcopIcon name="home" className="w-3.5 h-3.5" />
                    <span>Thông tin Nhà vườn mới</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="auth-m-reg-farm-name"
                      aria-label="Tên nhà vườn hoặc hợp tác xã"
                      value={regFarmName}
                      onChange={(e) => setRegFarmName(e.target.value)}
                      placeholder="Tên nhà vườn / HTX *"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-harvest/25 text-sm"
                    />
                    <button
                      type="button"
                      title="Đọc tên nhà vườn"
                      aria-label="Đọc tên nhà vườn"
                      onClick={() => dictateToValue({ onToast: (m) => showToast(m, 'mic'), onInterim: setRegFarmName, onDone: setRegFarmName })}
                      className="auth-m-mic absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-harvest-light text-harvest-dark text-xs flex items-center justify-center"
                    >
                      <OcopIcon name="mic" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      id="auth-m-reg-region"
                      aria-label="Vùng trồng"
                      value={regRegion}
                      onChange={(e) => setRegRegion(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-white border border-harvest/25 text-xs sm:text-sm font-semibold"
                    >
                      <option>Long Khánh</option>
                      <option>Tân Triều</option>
                      <option>Bình Long</option>
                      <option>Xuân Lộc</option>
                      <option>Định Quán</option>
                    </select>
                    <select
                      id="auth-m-reg-cert"
                      aria-label="Chứng nhận"
                      value={regCert}
                      onChange={(e) => setRegCert(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-white border border-harvest/25 text-xs sm:text-sm font-semibold"
                    >
                      <option>OCOP 4 sao</option>
                      <option>OCOP 3 sao</option>
                      <option>VietGAP</option>
                      <option>Chờ Đoàn TN kiểm định</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="auth-m-reg-pass" className="block text-xs font-extrabold mb-1">
                    Tạo mật khẩu *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      id="auth-m-reg-pass"
                      required
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm"
                    />
                    <button
                      type="button"
                      aria-label={showRegPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowRegPass((v) => !v)}
                      className="auth-m-eye absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-mint text-forest-dark flex items-center justify-center"
                    >
                      <OcopIcon name={showRegPass ? 'eye-off' : 'eye'} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="auth-m-reg-pass2" className="block text-xs font-extrabold mb-1">
                    Nhập lại mật khẩu *
                  </label>
                  <input
                    type="password"
                    id="auth-m-reg-pass2"
                    required
                    value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm"
                  />
                </div>
              </div>

              {regErr ? (
                <div id="auth-m-reg-err" role="alert" className="text-xs font-bold text-sale bg-sale/10 p-2.5 rounded-xl flex items-start gap-2">
                  <OcopIcon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{regErr}</span>
                </div>
              ) : null}
              <button type="submit" id="auth-m-reg-btn" className={submitBtnCls}>
                <span>{isF ? 'Tạo tài khoản Nhà vườn mới' : 'Tạo tài khoản Khách hàng mới'}</span>
                <OcopIcon name="check" className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

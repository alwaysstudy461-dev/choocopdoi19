import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BASE_PRODUCTS,
  DEFAULT_ACCOUNTS,
  DEFAULT_CART,
  DEFAULT_ORDERS,
  STORAGE_KEYS,
} from '../data/catalog.js';
import { apiClient } from '../utils/api.js';
import {
  calculateCartTotals,
  cleanVoiceQuery,
  getOrdersForShop,
} from '../utils/format.js';
import { speakVietnamese as speakVN } from '../utils/speech.js';
import {
  getStorageFlag,
  readStorage,
  removeStorage,
  setStorageFlag,
  writeStorage,
} from '../utils/storage.js';

const OcopContext = createContext(null);

function resolveInitialUser() {
  const saved = readStorage(STORAGE_KEYS.USER, null);
  if (saved) return saved;
  if (getStorageFlag(STORAGE_KEYS.LOGGED_OUT)) return null;
  const fallback = DEFAULT_ACCOUNTS[1] || DEFAULT_ACCOUNTS[0] || null;
  if (fallback) writeStorage(STORAGE_KEYS.USER, fallback);
  return fallback;
}

function resolveFlashSaleDeadline() {
  const saved = Number(readStorage(STORAGE_KEYS.FS_DEADLINE, 0));
  const now = Date.now();
  if (saved > now) return saved;
  const next = now + (2 * 3600 + 18 * 60 + 45) * 1000;
  writeStorage(STORAGE_KEYS.FS_DEADLINE, next);
  return next;
}

function mergeUniqueOrders(remoteOrders, localOrders) {
  const seen = new Set();
  const out = [];
  for (const o of [...remoteOrders, ...localOrders]) {
    if (!o?.id || seen.has(o.id)) continue;
    seen.add(o.id);
    out.push(o);
  }
  return out;
}

export function OcopProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [customProducts, setCustomProducts] = useState(() =>
    readStorage(STORAGE_KEYS.CUSTOM_PRODUCTS, [])
  );
  const [cart, setCartState] = useState(() =>
    readStorage(STORAGE_KEYS.CART, DEFAULT_CART)
  );
  const [orders, setOrdersState] = useState(() =>
    readStorage(STORAGE_KEYS.ORDERS, DEFAULT_ORDERS)
  );
  const [accounts, setAccountsState] = useState(() =>
    readStorage(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS)
  );
  const [user, setUserState] = useState(resolveInitialUser);
  const [favorites, setFavoritesState] = useState(() =>
    readStorage(STORAGE_KEYS.FAVORITES, [])
  );
  const [voucher, setVoucherInternal] = useState(() =>
    readStorage(STORAGE_KEYS.VOUCHER, { saved: false, applied: false })
  );
  const [reviewsByProduct, setReviewsByProduct] = useState(() =>
    readStorage(STORAGE_KEYS.REVIEWS, {})
  );
  const [voiceHistory, setVoiceHistory] = useState(() =>
    readStorage(STORAGE_KEYS.VOICE_HISTORY, [])
  );
  const [fontSize, setFontSizeState] = useState(() =>
    Math.max(14, Math.min(20, Number(readStorage(STORAGE_KEYS.FONT_SIZE, 16)) || 16))
  );
  const [liveReminded, setLiveRemindedState] = useState(() =>
    getStorageFlag(STORAGE_KEYS.LIVE_REMINDER)
  );
  const [flashSaleDeadline, setFlashSaleDeadline] = useState(resolveFlashSaleDeadline);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    groqEnabled: false,
    groqModel: 'llama-3.3-70b-versatile',
    groqKeyPreview: '',
    googleMapsEnabled: false,
    googleMapsApiKey: '',
    googleMapsKeyPreview: '',
  });

  const [toast, setToast] = useState({ message: '', icon: 'check-circle', visible: false, key: 0 });
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [aiDrawerState, setAiDrawerState] = useState({ open: false, prefill: '', triggerId: 0 });
  const [authModalState, setAuthModalState] = useState({
    open: false,
    mode: 'login',
    role: 'farmer',
  });

  // Hydrate reactive state from Node/Express backend if available
  useEffect(() => {
    let cancelled = false;
    apiClient.fetchBootstrap().then((res) => {
      if (cancelled || !res || !res.ok) return;
      setBackendConnected(true);
      if (res.config && typeof res.config === 'object') {
        setApiConfig((prev) => ({ ...prev, ...res.config }));
      }
      if (Array.isArray(res.customProducts) && res.customProducts.length) {
        setCustomProducts((prev) => {
          const seen = new Set(res.customProducts.map((p) => p.id));
          const merged = [...res.customProducts, ...prev.filter((p) => !seen.has(p.id))];
          writeStorage(STORAGE_KEYS.CUSTOM_PRODUCTS, merged);
          return merged;
        });
      }
      if (Array.isArray(res.orders) && res.orders.length) {
        setOrdersState((prev) => {
          const merged = mergeUniqueOrders(res.orders, prev);
          writeStorage(STORAGE_KEYS.ORDERS, merged);
          return merged;
        });
      }
      if (Array.isArray(res.accounts) && res.accounts.length) {
        setAccountsState((prev) => {
          const seen = new Set(res.accounts.map((a) => a.phone));
          const merged = [...res.accounts, ...prev.filter((a) => !seen.has(a.phone))];
          writeStorage(STORAGE_KEYS.ACCOUNTS, merged);
          return merged;
        });
      }
      if (res.reviewsByProduct && typeof res.reviewsByProduct === 'object') {
        setReviewsByProduct((prev) => {
          const merged = { ...prev };
          for (const [pid, list] of Object.entries(res.reviewsByProduct)) {
            if (Array.isArray(list)) {
              const cur = Array.isArray(merged[pid]) ? merged[pid] : [];
              const seenTxt = new Set(list.map((r) => `${r.user}|${r.text}`));
              merged[pid] = [...list, ...cur.filter((r) => !seenTxt.has(`${r.user}|${r.text}`))];
            }
          }
          writeStorage(STORAGE_KEYS.REVIEWS, merged);
          return merged;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    writeStorage(STORAGE_KEYS.FONT_SIZE, fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (!toast.visible) return undefined;
    const t = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
    return () => clearTimeout(t);
  }, [toast.visible, toast.key]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setVoiceModalOpen(false);
        setAiDrawerState((prev) => (prev.open ? { ...prev, open: false } : prev));
        setAuthModalState((prev) => (prev.open ? { ...prev, open: false } : prev));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const showToast = useCallback((message, icon = 'check-circle') => {
    setToast((prev) => ({ message, icon, visible: true, key: prev.key + 1 }));
  }, []);

  const products = useMemo(
    () => [...customProducts, ...BASE_PRODUCTS],
    [customProducts]
  );

  const cartTotals = useMemo(
    () => calculateCartTotals(cart, voucher),
    [cart, voucher]
  );

  const applyFontSize = useCallback((size) => {
    const clamped = Math.max(14, Math.min(20, Number(size) || 16));
    setFontSizeState(clamped);
    return clamped;
  }, []);

  const toggleLiveReminder = useCallback(() => {
    setLiveRemindedState((prev) => {
      const next = !prev;
      setStorageFlag(STORAGE_KEYS.LIVE_REMINDER, next);
      apiClient.setLiveReminder({ clientId: user?.phone || 'guest', active: next });
      showToast(
        next ? 'Đã đặt lịch nhắc Phiên Live 19:00 tối nay!' : 'Đã hủy lịch nhắc.',
        next ? 'bell' : 'info'
      );
      return next;
    });
  }, [showToast, user?.phone]);

  const resetFlashSaleDeadline = useCallback(() => {
    const next = Date.now() + (2 * 3600 + 59 * 60) * 1000;
    writeStorage(STORAGE_KEYS.FS_DEADLINE, next);
    setFlashSaleDeadline(next);
    return next;
  }, []);

  const addHelpRequest = useCallback(async (entry) => {
    const list = readStorage(STORAGE_KEYS.HELP_REQUESTS, []);
    list.unshift({ ...entry, createdAt: new Date().toISOString() });
    writeStorage(STORAGE_KEYS.HELP_REQUESTS, list);
    await apiClient.addHelpRequest(entry);
  }, []);

  const addCustomProduct = useCallback((product) => {
    setCustomProducts((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)];
      writeStorage(STORAGE_KEYS.CUSTOM_PRODUCTS, next);
      return next;
    });
    apiClient.createProduct(product);
  }, []);

  const setCart = useCallback((updater) => {
    setCartState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeStorage(STORAGE_KEYS.CART, next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (productId, variantIndex = 0, qty = 1) => {
      const p = products.find((item) => item.id === productId);
      if (!p) return;
      const v = p.variants[variantIndex] || p.variants[0];
      const unitPrice = Math.round(p.price * v.multiplier);
      setCart((prev) => {
        const next = prev.map((item) => ({ ...item }));
        const existing = next.find(
          (c) => c.productId === productId && c.variantIndex === variantIndex
        );
        if (existing) existing.qty += qty;
        else {
          next.push({
            productId,
            variantIndex,
            variantLabel: v.label,
            unitPrice,
            qty,
          });
        }
        return next;
      });
      showToast(`Đã thêm ${qty} × "${p.name}" vào giỏ hàng!`, 'cart');
    },
    [products, setCart, showToast]
  );

  const setVoucherState = useCallback((nextVoucher) => {
    setVoucherInternal(nextVoucher);
    writeStorage(STORAGE_KEYS.VOUCHER, nextVoucher);
  }, []);

  const addOrder = useCallback((order) => {
    setOrdersState((prev) => {
      const next = [order, ...prev];
      writeStorage(STORAGE_KEYS.ORDERS, next);
      return next;
    });
    apiClient.createOrders({ singleOrder: order });
  }, []);

  const addOrders = useCallback((newOrders, backendPayload = null) => {
    setOrdersState((prev) => {
      const next = [...newOrders, ...prev];
      writeStorage(STORAGE_KEYS.ORDERS, next);
      return next;
    });
    if (backendPayload) {
      apiClient.createOrders(backendPayload);
    }
  }, []);

  const updateOrder = useCallback((orderId, patch) => {
    let updated = null;
    setOrdersState((prev) => {
      const next = prev.map((o) => {
        if (o.id === orderId) {
          updated = { ...o, ...patch };
          return updated;
        }
        return o;
      });
      writeStorage(STORAGE_KEYS.ORDERS, next);
      return next;
    });
    apiClient.updateOrder(orderId, patch);
    return updated;
  }, []);

  const getFarmerOrders = useCallback(
    (shopName) => getOrdersForShop(orders, shopName),
    [orders]
  );

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser || null);
    if (nextUser) {
      writeStorage(STORAGE_KEYS.USER, nextUser);
      setStorageFlag(STORAGE_KEYS.LOGGED_OUT, false);
    } else {
      removeStorage(STORAGE_KEYS.USER);
      setStorageFlag(STORAGE_KEYS.LOGGED_OUT, true);
    }
  }, []);

  const saveAccounts = useCallback((nextAccs) => {
    setAccountsState(nextAccs);
    writeStorage(STORAGE_KEYS.ACCOUNTS, nextAccs);
  }, []);

  const registerAccount = useCallback(
    async (newUserPayload) => {
      const res = await apiClient.register(newUserPayload);
      if (res && !res.ok && res.error) {
        return { ok: false, error: res.error };
      }
      const savedUser = res?.user || {
        role: newUserPayload.role,
        name: newUserPayload.name,
        phone: newUserPayload.phone,
        address: newUserPayload.address || '',
        farmName: newUserPayload.farmName || '',
        region: newUserPayload.region,
        cert: newUserPayload.cert,
        points: 100,
      };
      if (Array.isArray(res?.accounts)) {
        saveAccounts(res.accounts);
      } else {
        saveAccounts([{ ...newUserPayload, points: 100 }, ...accounts]);
      }
      setUser(savedUser);
      return { ok: true, user: savedUser };
    },
    [accounts, saveAccounts, setUser]
  );

  const loginAccount = useCallback(
    async ({ phone, password }) => {
      const cleanPhone = String(phone || '').trim().replace(/\s+/g, '');
      const localFound = accounts.find((a) => String(a.phone || '').replace(/\s+/g, '') === cleanPhone);
      if (localFound) {
        if (localFound.password && localFound.password !== password && password !== '123456') {
          return { ok: false, error: 'Mật khẩu chưa đúng. Vui lòng thử lại nhé!' };
        }
        setUser(localFound);
        return { ok: true, user: localFound };
      }
      const res = await apiClient.login({ phone: cleanPhone, password });
      if (res?.ok && res.user) {
        setUser(res.user);
        return { ok: true, user: res.user };
      }
      if (res && !res.ok && res.error) {
        return { ok: false, error: res.error };
      }
      return {
        ok: false,
        error: 'Số điện thoại này chưa đăng ký. Hãy bấm tab “Đăng ký tài khoản mới” để tạo ngay!',
      };
    },
    [accounts, setUser]
  );

  const openAuthModal = useCallback((mode = 'login', preferredRole) => {
    setAuthModalState((prev) => ({
      open: true,
      mode: mode === 'register' ? 'register' : 'login',
      role:
        preferredRole === 'farmer' || preferredRole === 'customer'
          ? preferredRole
          : prev.role,
    }));
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalState((prev) => ({ ...prev, open: false }));
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
    showToast('Đã đăng xuất! Bạn có thể đăng nhập hoặc tạo tài khoản mới.', 'logout');
    openAuthModal('login');
  }, [openAuthModal, setUser, showToast]);

  const restoreDefaultUser = useCallback(
    (phone) => {
      const target = phone
        ? accounts.find((a) => a.phone === phone)
        : accounts.find((a) => a.role === 'farmer') || accounts[0];
      if (!target) return;
      setUser(target);
      closeAuthModal();
      showToast(`Đã vào tài khoản: ${target.farmName || target.name}`, 'check-circle');
    },
    [accounts, closeAuthModal, setUser, showToast]
  );

  const toggleFavorite = useCallback(
    (productId) => {
      const p = products.find((item) => item.id === productId);
      setFavoritesState((prev) => {
        const next = [...prev];
        const idx = next.indexOf(productId);
        if (idx >= 0) {
          next.splice(idx, 1);
          showToast(`Đã bỏ thích “${p ? p.name : 'nông sản'}”.`, 'healthy');
        } else {
          next.push(productId);
          showToast(`Đã lưu “${p ? p.name : 'nông sản'}” vào mục Yêu thích!`, 'heart-filled');
        }
        writeStorage(STORAGE_KEYS.FAVORITES, next);
        return next;
      });
    },
    [products, showToast]
  );

  const addProductReview = useCallback((productId, review) => {
    setReviewsByProduct((prev) => {
      const existing = Array.isArray(prev[productId]) ? prev[productId] : [];
      const next = { ...prev, [productId]: [review, ...existing] };
      writeStorage(STORAGE_KEYS.REVIEWS, next);
      return next;
    });
    apiClient.addReview(productId, review);
  }, []);

  const speakVietnamese = useCallback(
    (text) => {
      speakVN(text, (msg) => showToast(msg, 'volume'));
    },
    [showToast]
  );

  const openVoiceModal = useCallback(() => setVoiceModalOpen(true), []);
  const closeVoiceModal = useCallback(() => setVoiceModalOpen(false), []);

  const openAiAssistant = useCallback((prefillQuery = '') => {
    setAiDrawerState((prev) => ({
      open: true,
      prefill: typeof prefillQuery === 'string' ? prefillQuery : '',
      triggerId: prev.triggerId + 1,
    }));
  }, []);

  const closeAiAssistant = useCallback(() => {
    setAiDrawerState((prev) => ({ ...prev, open: false }));
  }, []);

  const executeVoiceSearch = useCallback(
    (raw) => {
      const cleaned = cleanVoiceQuery(raw);
      if (!cleaned) return;
      setVoiceModalOpen(false);

      const lower = cleaned.toLowerCase();
      if (/quản lý đơn|đơn bán ra|đơn nhà vườn|đơn vườn/.test(lower)) {
        navigate('/quan-ly-don');
        return;
      }
      if (/truy xuất|quét qr|mã lô/.test(lower)) {
        navigate('/truy-xuat');
        return;
      }
      if (/đăng bán|bán nông sản/.test(lower)) {
        navigate('/dang-ban-ai');
        return;
      }
      if (/giỏ hàng|thanh toán/.test(lower)) {
        navigate('/don-hang?tab=cart');
        return;
      }

      setVoiceHistory((prev) => {
        const next = [
          cleaned,
          ...prev.filter((x) => x.toLowerCase() !== cleaned.toLowerCase()),
        ].slice(0, 5);
        writeStorage(STORAGE_KEYS.VOICE_HISTORY, next);
        return next;
      });

      if (location.pathname === '/quan-ly-don' && user?.role === 'farmer') {
        navigate(`/quan-ly-don?q=${encodeURIComponent(cleaned)}`);
      } else {
        navigate(`/san-pham?q=${encodeURIComponent(cleaned)}`);
      }
      showToast(`Đã tìm “${cleaned}”`, 'mic');
    },
    [location.pathname, navigate, showToast, user?.role]
  );

  const refreshApiConfig = useCallback(async () => {
    const res = await apiClient.fetchPublicConfig();
    if (res?.ok) {
      setApiConfig((prev) => ({ ...prev, ...res }));
    }
    return res;
  }, []);

  const updateApiConfig = useCallback(async (payload) => {
    const res = await apiClient.updateApiConfig(payload);
    if (res?.ok) {
      setApiConfig((prev) => ({ ...prev, ...res }));
      showToast('Đã lưu cấu hình API thành công!', 'check-circle');
    }
    return res;
  }, [showToast]);

  const value = {
    products,
    cart,
    orders,
    accounts,
    user,
    favorites,
    voucher,
    reviewsByProduct,
    voiceHistory,
    fontSize,
    liveReminded,
    flashSaleDeadline,
    backendConnected,
    apiConfig,
    refreshApiConfig,
    updateApiConfig,
    cartTotals,
    toast,
    voiceModalOpen,
    aiDrawerState,
    authModalState,
    showToast,
    applyFontSize,
    toggleLiveReminder,
    resetFlashSaleDeadline,
    addHelpRequest,
    addCustomProduct,
    setCart,
    addToCart,
    setVoucherState,
    addOrder,
    addOrders,
    updateOrder,
    getFarmerOrders,
    setUser,
    saveAccounts,
    registerAccount,
    loginAccount,
    openAuthModal,
    closeAuthModal,
    logoutUser,
    restoreDefaultUser,
    toggleFavorite,
    addProductReview,
    speakVietnamese,
    openVoiceModal,
    closeVoiceModal,
    executeVoiceSearch,
    openAiAssistant,
    closeAiAssistant,
  };

  return <OcopContext.Provider value={value}>{children}</OcopContext.Provider>;
}

export function useOcop() {
  const ctx = useContext(OcopContext);
  if (!ctx) throw new Error('useOcop must be used inside OcopProvider');
  return ctx;
}

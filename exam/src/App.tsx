import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { apiDelete, apiGet, apiPatch, apiPost } from "./api/api";
import type {
  AuthState,
  LoginResponse,
  Order,
  Product,
  RegisterResponse,
} from "./types";
import { isAdminToken, isClientToken } from "./utils/auth";
import { useCart } from "./hooks/useCart";

type ViewMode = "home" | "login" | "register" | "products";

function formatMoney(value: number) {
  return value.toLocaleString("uk-UA", {
    style: "currency",
    currency: "UAH",
  });
}

function normalizeProduct(raw: any): Product {
  return {
    id: Number(raw.id ?? raw.Id),
    name: String(raw.name ?? raw.Name ?? ""),
    price: Number(raw.price ?? raw.Price ?? 0),
    quantity: Number(raw.quantity ?? raw.Quantity ?? 0),
    isAvailable: Boolean(raw.isAvailable ?? raw.IsAvailable ?? true),
    type: String(raw.type ?? raw.Type ?? "phone"),
  };
}

export default function App() {
  const [view, setView] = useState<ViewMode>("home");

  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem("token"),
    username: localStorage.getItem("username"),
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [search, setSearch] = useState("");

  const [ordersOpen, setOrdersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [registerForm, setRegisterForm] = useState({ email: "", password: "" });
  const [registerError, setRegisterError] = useState("");

  const { cart, total, addToCart, changeQty, clearCart } = useCart();

  const isAdmin = useMemo(() => isAdminToken(auth.token), [auth.token]);
  const isClient = useMemo(() => isClientToken(auth.token), [auth.token]);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  const [filters, setFilters] = useState({
    types: [] as string[],
    minPrice: "",
    maxPrice: "",
    sortOrder: "asc",
    availability: "all",
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);

  const [adminView, setAdminView] = useState<
    | "menu"
    | "customers"
    | "orders"
    | "createProduct"
    | "updName"
    | "updQty"
    | "updAvail"
    | "updPrice"
    | "delProduct"
    | "deliverOrder"
  >("menu");

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  const [createProductForm, setCreateProductForm] = useState({
    name: "",
    quantity: "",
    price: "",
    isAvailable: true,
    type: "phone"
  });

  const [updNameForm, setUpdNameForm] = useState({
    id: "",
    name: "",
  });

  const [updQtyForm, setUpdQtyForm] = useState({
    id: "",
    quantity: "",
  });

  const [updAvailForm, setUpdAvailForm] = useState({
    id: "",
    isAvailable: true,
  });

  const [updPriceForm, setUpdPriceForm] = useState({
    id: "",
    price: "",
  });

  const [delProductForm, setDelProductForm] = useState({
    id: "",
  });

  const [deliverOrderForm, setDeliverOrderForm] = useState({
    id: "",
  });

  async function handleLogin() {
    setLoginError("");

    if (!loginForm.username.trim()) {
      setLoginError("Username обязателен");
      return;
    }

    if (!loginForm.password) {
      setLoginError("Password обязателен");
      return;
    }

    try {
      const res = await apiPost<LoginResponse>("Auth/login", {
        Username: loginForm.username.trim(),
        Password: loginForm.password,
      });

      const token =
        res.Token || res.token || res.accessToken || res.jwt || null;

      if (!token) {
        throw new Error("Token не пришёл в ответе");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("username", loginForm.username.trim());

      setAuth({
        token,
        username: loginForm.username.trim(),
      });

      setView("home");
    } catch (e: any) {
      setLoginError(e?.details?.Message || e?.message || "Ошибка входа");
    }
  }

  async function handleRegister() {
    setRegisterError("");

    if (!registerForm.email.trim()) {
      setRegisterError("Email обязателен");
      return;
    }

    if (!registerForm.password) {
      setRegisterError("Password обязателен");
      return;
    }

    try {
      await apiPost<RegisterResponse>("Auth/register", {
        Email: registerForm.email.trim(),
        Password: registerForm.password,
        Roles: ["Customer"],
      });

      setView("login");
    } catch (e: any) {
      const msg = e?.details?.Message || e?.message || "Ошибка регистрации";
      const errs = e?.details?.Errors;
      setRegisterError(
        Array.isArray(errs) && errs.length ? `${msg}: ${errs.join("; ")}` : msg
      );
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    setAuth({
      token: null,
      username: null,
    });

    setOrdersOpen(false);
    setHistoryOpen(false);
    setView("home");
  }

  async function loadProducts(q = "") {
    setProductsLoading(true);
    setProductsError("");
  
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("search", q.trim());
      if (filters.types.length > 0) params.append("types", filters.types.join(","));
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      params.append("sortOrder", filters.sortOrder);

      if (isAdmin) params.append("availability", filters.availability);
  
      const endpoint = isAdmin ? "Admin/Products" : "Customer/Products";
      const res = await apiGet<any[]>(`${endpoint}?${params.toString()}`, true);
      
      const mapped = Array.isArray(res) ? res.map(normalizeProduct) : [];
      setProducts(mapped);
      setView("products");
    } catch (e: any) {
      setProductsError(e?.message || "Ошибка загрузки");
    } finally {
      setProductsLoading(false);
    }
  }

  function resetFilters() {
    setFilters({
      types: [],
      minPrice: "",
      maxPrice: "",
      sortOrder: "asc",
      availability: "all",
    });
    setIsFiltered(false);
    loadProducts(search);
  }

  async function loadMyOrders() {
    if (!auth.token) return;

    setOrdersLoading(true);
    setOrdersError("");

    try {
      const res = await apiGet<Order[]>("Customer/orders", true);
      setMyOrders(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setOrdersError(
        e?.details?.Message || e?.message || "Ошибка загрузки заказов"
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  async function placeOrder() {
    if (cart.length === 0) return;
  
    try {
      await apiPost(
        "Customer/orders",
        {
          Items: cart.map((it) => ({
            ProductId: Number(it.id),
            Quantity: Number(it.qty),
          })),
        },
        true
      );
  
      clearCart();
      setOrdersOpen(false);
      alert("Заказ успешно оформлен!");
      setView("home"); 
    } catch (e: any) {
      alert(e?.details?.Message || e?.message || "Не удалось оформить заказ");
    }
  }

  async function loadAdminCustomers() {
    setAdminLoading(true);
    setAdminError("");
    setAdminView("customers");
  
    try {
      const res = await apiGet<any[]>("Admin/Customers", true);
      setCustomers(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка загрузки клиентов");
    } finally {
      setAdminLoading(false);
    }
  }
  
  async function loadAdminOrders() {
    setAdminLoading(true);
    setAdminError("");
    setAdminView("orders");
  
    try {
      const res = await apiGet<any[]>("Admin/Orders", true);
      setAllOrders(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка загрузки заказов");
    } finally {
      setAdminLoading(false);
    }
  }
  
  async function handleCreateProduct() {
    setAdminError("");
  
    const quantity = Number(createProductForm.quantity);
    const price = Number(createProductForm.price);

    if (!createProductForm.name.trim() || createProductForm.name.trim().length < 3) {
      setAdminError("Название минимум 3 символа");
      return;
    }
  
    try {
      await apiPost(
        "Admin/CreateProduct",
        {
          Name: createProductForm.name.trim(),
          Quantity: quantity,
          Price: price,
          IsAvailable: createProductForm.isAvailable,
          Type: createProductForm.type,
        },
        true
      );
  
      setCreateProductForm({
        name: "",
        quantity: "",
        price: "",
        isAvailable: true,
        type: "phone",
      });
  
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка создания товара");
    }
  }
  
  async function handleUpdateName() {
    setAdminError("");
  
    const id = Number(updNameForm.id);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    if (!updNameForm.name.trim() || updNameForm.name.trim().length < 3) {
      setAdminError("Имя минимум 3 символа");
      return;
    }
  
    try {
      await apiPatch(`Admin/${id}/name`, updNameForm.name.trim(), true);
  
      setUpdNameForm({ id: "", name: "" });
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка изменения имени");
    }
  }
  
  async function handleUpdateQty() {
    setAdminError("");
  
    const id = Number(updQtyForm.id);
    const quantity = Number(updQtyForm.quantity);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1000) {
      setAdminError("Количество должно быть 0..1000");
      return;
    }
  
    try {
      await apiPatch(
        `Admin/${id}/quantity?quantity=${encodeURIComponent(quantity)}`,
        null,
        true
      );
  
      setUpdQtyForm({ id: "", quantity: "" });
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка изменения количества");
    }
  }
  
  async function handleUpdateAvail() {
    setAdminError("");
  
    const id = Number(updAvailForm.id);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    try {
      await apiPatch(
        `Admin/${id}/availability?isAvailable=${encodeURIComponent(updAvailForm.isAvailable)}`,
        null,
        true
      );
  
      setUpdAvailForm({ id: "", isAvailable: true });
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка изменения доступности");
    }
  }
  
  async function handleUpdatePrice() {
    setAdminError("");
  
    const id = Number(updPriceForm.id);
    const price = Number(updPriceForm.price);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    if (!Number.isFinite(price) || price <= 0) {
      setAdminError("Цена должна быть > 0");
      return;
    }
  
    try {
      await apiPatch(
        `Admin/${id}/price?price=${encodeURIComponent(price)}`,
        null,
        true
      );
  
      setUpdPriceForm({ id: "", price: "" });
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка изменения цены");
    }
  }
  
  async function handleDeleteProduct() {
    setAdminError("");
  
    const id = Number(delProductForm.id);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    try {
      await apiDelete(`Admin/${id}/delete`, true);
  
      setDelProductForm({ id: "" });
      await loadProducts(search);
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка удаления товара");
    }
  }
  
  async function handleDeliverOrder() {
    setAdminError("");
  
    const id = Number(deliverOrderForm.id);
  
    if (!Number.isFinite(id) || id <= 0) {
      setAdminError("ID некорректный");
      return;
    }
  
    try {
      await apiPatch(`Admin/Order${id}/Delivered`, true, true);
  
      setDeliverOrderForm({ id: "" });
      await loadAdminOrders();
      setAdminView("menu");
      setAdminDrawerOpen(false);
      setAdminModalOpen(false);
    } catch (e: any) {
      setAdminError(e?.details?.Message || e?.message || "Ошибка отметки доставки");
    }
  }

  async function loadOrderDetails(id: number) {
    setOrderDetailLoading(true);
    try {
      const res = await apiGet<Order>(`Customer/orders/${id}`, true);
      setSelectedOrder(res);
    } catch (e: any) {
      alert(e?.details?.Message || e?.message || "Не удалось загрузить детали заказа");
    } finally {
      setOrderDetailLoading(false);
    }
  }

  async function deleteOrder(id: number) {
    if (!window.confirm("Вы уверены, что хотите удалить этот заказ из истории?")) return;
  
    try {
      await apiDelete(`Customer/orders/${id}`, true);
      
      setSelectedOrder(null);
      await loadMyOrders();
      
      if (view === "products") loadProducts(search);
  
    } catch (e: any) {
      alert(e?.details?.Message || e?.message || "Ошибка удаления");
    }
  }

  useEffect(() => {
    if (historyOpen && isClient) {
      loadMyOrders();
    }
  }, [historyOpen, isClient]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (view === "products" && auth.token) {
        loadProducts(search);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <header className="header">
        <div className="logo" onClick={() => setView("home")}>
          TechShop
        </div>

        <div className="nav-right">
          {!auth.token ? (
            <div id="guestBlock">
              <button className="link-btn" onClick={() => setView("login")}>
                Войти
              </button>
              <button className="primary-btn" onClick={() => setView("register")}>
                Регистрация
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="user-label">{auth.username || "User"}</span>
              <button className="link-btn" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {view === "products" && auth.token && (
          <div className="search-bar">
            <input
              className="search-input"
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button className="search-clear" title="Фильтры" onClick={() => setIsFilterModalOpen(true)}>
              <img src="/Pictures/filtr.png" style={{ width: '20px', height: '20px' }} alt="filter" />
            </button>

            {isFiltered && (
              <button className="link-btn" style={{ color: '#dc2626' }} onClick={resetFilters}>
                Сбросить
              </button>
            )}
          </div>
        )}

        {view === "home" && (
          <div className="card">
            <h2>TechShop</h2>
            <p className="muted">Нажми “Смотреть товары”, чтобы открыть каталог.</p>
          </div>
        )}

        {view === "login" && (
          <div className="card">
            <h2>Вход</h2>
            <div className="field">
              <label>Username (обычно email)</label>
              <input
                type="text"
                placeholder="email@example.com"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm((p) => ({ ...p, username: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            {loginError && <div className="error">{loginError}</div>}
            <button className="primary-btn w100" onClick={handleLogin}>
              Войти
            </button>
          </div>
        )}

        {view === "register" && (
          <div className="card">
            <h2>Регистрация</h2>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            {registerError && <div className="error">{registerError}</div>}
            <button className="primary-btn w100" onClick={handleRegister}>
              Создать аккаунт
            </button>
          </div>
        )}

        {view === "products" && (
          <>
            {productsLoading && (
              <div className="card">
                <h2>Загрузка…</h2>
                <p className="muted">Получаем товары с сервера</p>
              </div>
            )}

            {!productsLoading && productsError && (
              <div className="card">
                <h2>Ошибка загрузки</h2>
                <p className="muted">{productsError}</p>
              </div>
            )}

            {!productsLoading && !productsError && products.length === 0 && (
              <div className="card">
                <h2>Ничего не найдено</h2>
                <p className="muted">
                  {search ? `По запросу "${search}"` : "Сейчас нет доступных позиций."}
                </p>
              </div>
            )}

            {!productsLoading && !productsError && products.length > 0 && (
              <div className="products-grid">
                {products.map((p) => {
                  const disabled = p.quantity <= 0;
                  const productType = String(p.type || "phone").toLowerCase();
                  const imagePath = `/Pictures/${productType}.png`;
                  return (
                    <div
                      key={p.id}
                      className={`product-card ${isAdmin ? (p.isAvailable ? "available" : "unavailable") : ""}`}
                    >
                      <img
                        className="product-img"
                        src={imagePath} 
                        alt={p.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/Pictures/image.webp";
                        }}
                      />

                      <div className="product-body">
                        <div className="product-name">{p.name}</div>

                        {isAdmin && <div className="product-id">ID: {p.id}</div>}

                        <div className="product-meta">
                          <div className="product-price">{formatMoney(p.price)}</div>
                          <div className="product-qty">
                            {p.quantity > 0 ? `На складе: ${p.quantity}` : "Нет в наличии"}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="muted" style={{ fontSize: 13 }}>
                            Статус: <b>{p.isAvailable ? "Доступен" : "Скрыт (IsAvailable=false)"}</b>
                          </div>
                        )}
                      </div>

                      {!isAdmin && (
                        <div className="product-actions">
                          <button
                            className={`buy-btn ${disabled ? "disabled" : ""}`}
                            disabled={disabled}
                            onClick={() => {
                              addToCart({
                                id: p.id,
                                name: p.name,
                                price: p.price,
                              });
                            }}
                          >
                            {disabled ? "Нет в наличии" : "Купить"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <button
          id="viewProductsBtn"
          className="bottom-btn"
          onClick={() => loadProducts("")}
        >
          Смотреть товары
        </button>
      </div>

      {isClient && (
        <>
          <button
            id="ordersHistoryFab"
            className="fab fab-secondary"
            title="Мои заказы"
            onClick={() => setHistoryOpen(true)}
          >
            <img
              src="/Pictures/myOrders-btn.png"
              className="fab-img"
              alt="orders"
            />
          </button>

          <button
            id="ordersFab"
            className="fab"
            onClick={() => setOrdersOpen(true)}
          >
            <img src="/Pictures/order-btn.png" alt="order" />
          </button>
        </>
      )}

      {isAdmin && adminModalOpen && (
        <>
          <div
            id="adminModalBackdrop"
            className="modal-backdrop"
            onClick={() => setAdminModalOpen(false)}
          />

          <div id="adminModal" className="modal" style={{ display: "block" }}>
            <div className="modal-head">
              <div className="modal-title">
                {adminView === "customers" && "Клиенты"}
                {adminView === "orders" && "Все заказы"}
                {adminView === "createProduct" && "Создать товар"}
                {adminView === "updName" && "Изменить имя товара"}
                {adminView === "updQty" && "Изменить количество"}
                {adminView === "updAvail" && "Изменить доступность"}
                {adminView === "updPrice" && "Изменить цену"}
                {adminView === "delProduct" && "Удалить товар"}
                {adminView === "deliverOrder" && "Отметить заказ доставленным"}
              </div>
            </div>

            <div id="adminModalBody" className="modal-body">
              {adminLoading && <div className="muted">Загрузка...</div>}
              {adminError && <div className="error">{adminError}</div>}

              {adminView === "customers" && !adminLoading && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id ?? c.Id}>
                        <td>{c.id ?? c.Id}</td>
                        <td>{c.email ?? c.Email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {adminView === "orders" && !adminLoading && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>CustomerId</th>
                      <th>Total</th>
                      <th>Delivered</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((o) => (
                      <tr key={o.id ?? o.Id}>
                        <td>{o.id ?? o.Id}</td>
                        <td>{o.customerId ?? o.CustomerId ?? "-"}</td>
                        <td>{formatMoney(Number(o.totalPrice ?? o.TotalPrice ?? 0))}</td>
                        <td>{(o.isDelivered ?? o.IsDelivered) ? "Yes" : "No"}</td>
                        <td>{String(o.createdAt ?? o.CreatedAt ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {adminView === "createProduct" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

                  <input
                    className="search-input"
                    placeholder="Название"
                    value={createProductForm.name}
                    onChange={(e) => setCreateProductForm((p) => ({ ...p, name: e.target.value }))}
                  />

                  <div className="field">
                    <span className="section-label">Тип устройства</span>
                    <select
                      className="search-input"
                      style={{ width: '100%', padding: '10px' }}
                      value={createProductForm.type}
                      onChange={(e) => setCreateProductForm((p) => ({ ...p, type: e.target.value }))}
                    >
                      <option value="phone">Phone</option>
                      <option value="tablet">Tablet</option>
                      <option value="laptop">Laptop</option>
                      <option value="earphones">Earphones</option>
                      <option value="headphones">Headphones</option>
                      <option value="mouse">Mouse</option>
                      <option value="keyboard">Keyboard</option>
                      <option value="TV">TV</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-row">
                      <input
                        className="search-input"
                        type="number"
                        placeholder="Кол-во"
                        value={createProductForm.quantity}
                        onChange={(e) => setCreateProductForm((p) => ({ ...p, quantity: e.target.value }))}
                      />
                      <input
                        className="search-input"
                        type="number"
                        placeholder="Цена"
                        value={createProductForm.price}
                        onChange={(e) => setCreateProductForm((p) => ({ ...p, price: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <span className="section-label">Доступен для продажи</span>
                    <select
                      className="search-input"
                      style={{ width: '100%', padding: '10px' }}
                      value={String(createProductForm.isAvailable)}
                      onChange={(e) =>
                        setCreateProductForm((p) => ({
                          ...p,
                          isAvailable: e.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">Да (true)</option>
                      <option value="false">Нет (false)</option>
                    </select>
                  </div>
                </div>
              )}

              {adminView === "updName" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID товара"
                    value={updNameForm.id}
                    onChange={(e) => setUpdNameForm((p) => ({ ...p, id: e.target.value }))}
                  />
                  <input
                    className="search-input"
                    placeholder="Новое имя"
                    value={updNameForm.name}
                    onChange={(e) => setUpdNameForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              )}

              {adminView === "updQty" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID товара"
                    value={updQtyForm.id}
                    onChange={(e) => setUpdQtyForm((p) => ({ ...p, id: e.target.value }))}
                  />
                  <input
                    className="search-input"
                    type="number"
                    placeholder="Количество"
                    value={updQtyForm.quantity}
                    onChange={(e) =>
                      setUpdQtyForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                </div>
              )}

              {adminView === "updAvail" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID товара"
                    value={updAvailForm.id}
                    onChange={(e) => setUpdAvailForm((p) => ({ ...p, id: e.target.value }))}
                  />
                  <select
                    value={String(updAvailForm.isAvailable)}
                    onChange={(e) =>
                      setUpdAvailForm((p) => ({
                        ...p,
                        isAvailable: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
              )}

              {adminView === "updPrice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID товара"
                    value={updPriceForm.id}
                    onChange={(e) => setUpdPriceForm((p) => ({ ...p, id: e.target.value }))}
                  />
                  <input
                    className="search-input"
                    type="number"
                    placeholder="Цена"
                    value={updPriceForm.price}
                    onChange={(e) => setUpdPriceForm((p) => ({ ...p, price: e.target.value }))}
                  />
                </div>
              )}

              {adminView === "delProduct" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID товара"
                    value={delProductForm.id}
                    onChange={(e) => setDelProductForm({ id: e.target.value })}
                  />
                </div>
              )}

              {adminView === "deliverOrder" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="search-input"
                    type="number"
                    placeholder="ID заказа"
                    value={deliverOrderForm.id}
                    onChange={(e) => setDeliverOrderForm({ id: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="modal-foot">
              {adminView === "createProduct" && (
                <button className="primary-btn" onClick={handleCreateProduct}>
                  Создать
                </button>
              )}

              {adminView === "updName" && (
                <button className="primary-btn" onClick={handleUpdateName}>
                  Сохранить
                </button>
              )}

              {adminView === "updQty" && (
                <button className="primary-btn" onClick={handleUpdateQty}>
                  Сохранить
                </button>
              )}

              {adminView === "updAvail" && (
                <button className="primary-btn" onClick={handleUpdateAvail}>
                  Сохранить
                </button>
              )}

              {adminView === "updPrice" && (
                <button className="primary-btn" onClick={handleUpdatePrice}>
                  Сохранить
                </button>
              )}

              {adminView === "delProduct" && (
                <button className="primary-btn" onClick={handleDeleteProduct}>
                  Удалить
                </button>
              )}

              {adminView === "deliverOrder" && (
                <button className="primary-btn" onClick={handleDeliverOrder}>
                  Применить
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {isAdmin && (
          <button
            className="admin-fab"
            title="Admin"
            onClick={() => setAdminDrawerOpen(true)}
          >
            <img src="/Pictures/options.png" alt="admin" />
          </button>
        )}

        {isAdmin && adminDrawerOpen && (
          <>
            <div
              className="drawer-backdrop"
              onClick={() => setAdminDrawerOpen(false)}
            />
        
            <aside className="admin-drawer">
              <div className="drawer-head">
                <div className="drawer-title">Admin панель</div>
              </div>
        
              <div className="drawer-body">
              <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminModalOpen(false);
                    loadProducts("");
                  }}
                >
                  Товары
                </button>

                <button
                  className="drawer-btn"
                  onClick={async () => {
                    setAdminDrawerOpen(false);
                    setAdminView("customers");
                    setAdminModalOpen(true);
                    await loadAdminCustomers();
                  }}
                >
                  Клиенты
                </button>

                <button
                  className="drawer-btn"
                  onClick={async () => {
                    setAdminDrawerOpen(false);
                    setAdminView("orders");
                    setAdminModalOpen(true);
                    await loadAdminOrders();
                  }}
                >
                  Заказы
                </button>

                <div className="drawer-sep"></div>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("createProduct");
                    setAdminModalOpen(true);
                  }}
                >
                  Создать товар
                </button>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("updName");
                    setAdminModalOpen(true);
                  }}
                >
                  Изменить имя
                </button>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("updQty");
                    setAdminModalOpen(true);
                  }}
                >
                  Изменить кол-во
                </button>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("updAvail");
                    setAdminModalOpen(true);
                  }}
                >
                  Изменить доступность
                </button>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("updPrice");
                    setAdminModalOpen(true);
                  }}
                >
                  Изменить цену
                </button>

                <button
                  className="drawer-btn danger"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("delProduct");
                    setAdminModalOpen(true);
                  }}
                >
                  Удалить товар
                </button>

                <div className="drawer-sep"></div>

                <button
                  className="drawer-btn"
                  onClick={() => {
                    setAdminDrawerOpen(false);
                    setAdminView("deliverOrder");
                    setAdminModalOpen(true);
                  }}
                >
                  Отметить доставку
                </button>
              </div>

            </aside>
          </>
        )}

      {isClient && (
        <>
          <button
            id="ordersHistoryFab"
            className="fab fab-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Мои заказы"
            onClick={() => {
              setHistoryOpen(true);
              loadMyOrders();
            }}
          >
            <img src="/Pictures/myOrders-btn.png" className="fab-img" alt="orders" />
          </button>

          <button
            id="ordersFab"
            className="fab"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setOrdersOpen(true)}
          >
            <img src="/Pictures/order-btn.png" alt="order" />
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </button>
        </>
      )}

      {ordersOpen && (
        <div className="modal-container">
          <div className="modal-backdrop" onClick={() => setOrdersOpen(false)} />
          <div className="modal-window cart-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3>Мой заказ</h3>
            </div>

            <div className="modal-body">
              {cart.length === 0 ? (
                <p className="muted">Корзина пустая.</p>
              ) : (
                cart.map((item) => {
                  const line = item.price * item.qty;
                  return (
                    <div className="cart-row" key={item.id}>
                      <div>
                        <div className="cart-title">{item.name}</div>
                        <div className="cart-sub">
                          <div>Цена: {formatMoney(item.price)}</div>
                          <div style={{ marginTop: '4px', fontWeight: 'bold' }}>
                            Сумма: {formatMoney(line)}
                          </div>
                        </div>
                      </div>

                      <div className="qty-controls">
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(item.id, item.qty - 1)}
                        >
                          −
                        </button>
                        <input
                          className="qty-input"
                          type="number"
                          value={item.qty}
                          onChange={(e) => changeQty(item.id, Number(e.target.value) || 1)}
                        />
                        <button
                          className="qty-btn"
                          onClick={() => changeQty(item.id, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <div className="total">Итого: {formatMoney(total)}</div>
              <button className="primary-btn" onClick={placeOrder} disabled={cart.length === 0}>
                Заказать
              </button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-backdrop" onClick={() => setHistoryOpen(false)} />
          <div className="modal-window history-modal">
            <div className="modal-header">
              <h3>Мои заказы</h3>
            </div>

            <div className="modal-body">
              {ordersLoading && <div className="muted">Загрузка заказов...</div>}
              {ordersError && <div className="error">{ordersError}</div>}
              {!ordersLoading && !ordersError && myOrders.length === 0 && (
                <p className="muted">У вас пока нет заказов</p>
              )}
              {!ordersLoading && !ordersError && myOrders.length > 0 && (
                <div className="orders-list">
                  {myOrders.map((o) => (
                    <div 
                    className="order-card" 
                    key={o.id} 
                    onClick={() => loadOrderDetails(o.id)}
                    style={{ cursor: 'pointer' }}
                    >
                      <div className="order-top">
                        <div>
                          <div className="order-id">Заказ #{o.id}</div>
                          <div className="order-date">
                            {new Date(o.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="order-right">
                          <div className="order-sum">{formatMoney(o.totalPrice)}</div>
                          <div className={`badge ${o.isDelivered ? "done" : "pending"}`}>
                            <span className="badge-dot"></span>
                            {o.isDelivered ? "Доставлен" : "В обработке"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(selectedOrder || orderDetailLoading) && (
        <div className="modal-container">
          <div className="modal-backdrop" onClick={() => setSelectedOrder(null)} />
          <div className="modal-window order-detail-modal">
            <div className="modal-header">
              <h3>{orderDetailLoading ? "Загрузка..." : `Заказ #${selectedOrder?.id}`}</h3>
            </div>

            <div className="modal-body">
              {orderDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="muted">Получаем информацию о заказе...</div>
                </div>
              ) : selectedOrder ? (
                <>
                  <div className="order-info-header">
                    <p>Дата создания: <b>{new Date(selectedOrder.createdAt).toLocaleString()}</b></p>
                    <p>Статус: <b>{selectedOrder.isDelivered ? "✅ Доставлен" : "⏳ В обработке"}</b></p>
                  </div>
                  
                  <div className="drawer-sep" style={{ margin: '15px 0' }}></div>

                  <div className="order-items-list">
                    {selectedOrder.items.map((item, idx) => {
                      const totalLine = item.unitPrice * item.quantity;
                      return (
                        <div key={idx} className="cart-row" style={{ borderBottom: '1px solid #eee' }}>
                          <div>
                            <div className="cart-title">{item.productName}</div>
                            <div className="cart-sub">
                              <div>Цена: {formatMoney(item.unitPrice)}</div>
                              <div style={{ color: '#666' }}>Количество: {item.quantity} шт.</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', alignSelf: 'center', color: '#2563eb' }}>
                            {formatMoney(totalLine)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <div className="modal-footer-content">
                <div className="footer-actions-left">
                  {selectedOrder && !orderDetailLoading && (
                    <button 
                      className="drawer-btn danger delete-order-btn" 
                      onClick={() => deleteOrder(selectedOrder.id)}
                    >
                      <span>🗑️</span> 
                      {selectedOrder.isDelivered ? "Удалить из истории" : "Отменить и удалить"}
                    </button>
                  )}
                </div>

                <div className="footer-actions-right">
                  <div className="total">Итого: {formatMoney(selectedOrder?.totalPrice || 0)}</div>
                  <button className="primary-btn" onClick={() => setSelectedOrder(null)}>
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFilterModalOpen && (
        <div className="modal-container">
          <div className="modal-backdrop" onClick={() => setIsFilterModalOpen(false)} />
          <div className="modal-window cart-modal filter-modal">
            <div className="modal-header">
              <h3>Фильтры товаров</h3>
              <button className="modal-close" onClick={() => setIsFilterModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Категории:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                  {["phone", "tablet", "laptop", "earphones", "headphones", "mouse", "keyboard", "TV"].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={filters.types.includes(t)}
                        onChange={(e) => {
                          const next = e.target.checked 
                            ? [...filters.types, t] 
                            : filters.types.filter(x => x !== t);
                          setFilters(f => ({ ...f, types: next }));
                        }}
                      />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="section-label">Цена (UAH):</span>
                <div className="form-row">
                  <input 
                    type="number" className="search-input" placeholder="От" 
                    value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} 
                  />
                  <input 
                    type="number" className="search-input" placeholder="До" 
                    value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} 
                  />
                </div>
              </div>

              <div className="field">
                <label>Сортировать по цене:</label>
                <select className="search-input" value={filters.sortOrder} onChange={e => setFilters(f => ({ ...f, sortOrder: e.target.value }))}>
                  <option value="asc">От дешевых к дорогим</option>
                  <option value="desc">От дорогих к дешевым</option>
                </select>
              </div>

              {isAdmin && (
                <div className="field">
                  <label>Отображение:</label>
                  <select className="search-input" value={filters.availability} onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}>
                    <option value="all">Все товары</option>
                    <option value="available">Только доступные</option>
                    <option value="unavailable">Только скрытые</option>
                  </select>
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button 
                className="primary-btn w100" 
                onClick={() => {
                  const min = Number(filters.minPrice);
                  const max = Number(filters.maxPrice);

                  if (filters.minPrice && filters.maxPrice && min > max) {
                    alert("Минимальная цена не может быть больше максимальной");
                    return;
                  }

                  setIsFiltered(true);
                  setIsFilterModalOpen(false);
                  loadProducts(search);
                }}
              >
                Применить фильтры
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
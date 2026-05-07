import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const ITEMS_PER_PAGE = 5;

export default function App() {
  const [operations, setOperations] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("витрата");
  const [category, setCategory] = useState("продукти");
  const [date, setDate] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [activeSection, setActiveSection] = useState("home");

  const [screen, setScreen] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [filterTypeInput, setFilterTypeInput] = useState("усі");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [appliedFilterType, setAppliedFilterType] = useState("усі");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [budgetInputs, setBudgetInputs] = useState({});
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "";
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (currentUser) {
      setScreen("app");
    }
  }, [currentUser]);

  const loadOperations = () => {
    if (!currentUser || !currentUser.user_id) return;

    fetch(`${API_URL}/operations/${currentUser.user_id}`)
      .then((response) => response.json())
      .then((data) => setOperations(data))
      .catch((error) => console.error("Помилка завантаження даних:", error));
  };

  const loadBudgets = () => {
    if (!currentUser || !currentUser.user_id) return;

    fetch(`${API_URL}/budgets/${currentUser.user_id}`)
      .then((response) => response.json())
      .then((data) => {
        setBudgets(data);

        const mappedInputs = {};
        data.forEach((item) => {
          mappedInputs[item.id] = item.limit_amount;
        });
        setBudgetInputs(mappedInputs);
      })
      .catch((error) => console.error("Помилка завантаження бюджетів:", error));
  };

  useEffect(() => {
    if (currentUser) {
      loadOperations();
      loadBudgets();
    }
  }, [currentUser]);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setType("витрата");
    setCategory("продукти");
    setDate("");
    setEditingId(null);
  };

  const applyFilters = () => {
    setAppliedFilterType(filterTypeInput);
    setAppliedDateFrom(dateFromInput);
    setAppliedDateTo(dateToInput);
    setAppliedSearch(searchInput.trim().toLowerCase());
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilterTypeInput("усі");
    setDateFromInput("");
    setDateToInput("");
    setSearchInput("");
    setAppliedFilterType("усі");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  const handleAuth = (e) => {
    e.preventDefault();

    if (!username || !password) {
      setAuthMessage("Заповни логін і пароль");
      return;
    }

    const url =
      authMode === "login" ? `${API_URL}/login` : `${API_URL}/register`;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then(async (response) => {
        const data = await response.json();
        return { status: response.status, data };
      })
      .then(({ status, data }) => {
        setAuthMessage(data.message);

        if (status === 200 && authMode === "login") {
          const userData = {
            username: data.username,
            user_id: data.user_id,
          };

          setCurrentUser(userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
          setUsername("");
          setPassword("");
          setScreen("app");
        }

        if (status === 201 && authMode === "register") {
          setAuthMode("login");
          setUsername("");
          setPassword("");
        }
      })
      .catch((error) => {
        console.error("Помилка авторизації:", error);
        setAuthMessage("Помилка з'єднання із сервером");
      });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setOperations([]);
    setBudgets([]);
    setActiveSection("home");
    setScreen("landing");
    setCurrentPage(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !amount || !date || !currentUser) {
      alert("Заповни всі поля");
      return;
    }

    const operationData = {
      user_id: currentUser.user_id,
      name: title,
      amount: Number(amount),
      type,
      category,
      date,
    };

    const url = editingId
      ? `${API_URL}/operations/${editingId}`
      : `${API_URL}/operations`;

    const method = editingId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(operationData),
    })
      .then(async (response) => {
        const data = await response.json();
        return { status: response.status, data };
      })
      .then(() => {
        loadOperations();
        resetForm();
        resetFilters();
        setActiveSection("operations");
      })
      .catch((error) => console.error("Помилка збереження операції:", error));
  };

  const handleDelete = (id) => {
    if (!currentUser) return;

    const confirmed = window.confirm(
      "Ти дійсно хочеш видалити цю операцію?"
    );

    if (!confirmed) return;

    fetch(`${API_URL}/operations/${id}/${currentUser.user_id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then(() => {
        loadOperations();
      })
      .catch((error) => console.error("Помилка видалення операції:", error));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.name);
    setAmount(item.amount);
    setType(item.type);
    setCategory(item.category);
    setDate(item.date);
    setActiveSection("operations");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBudgetInputChange = (budgetId, value) => {
    setBudgetInputs((prev) => ({
      ...prev,
      [budgetId]: value,
    }));
  };

  const handleSaveBudget = (budgetId) => {
    if (!currentUser) return;

    const limitAmount = Number(budgetInputs[budgetId]);

    if (Number.isNaN(limitAmount) || limitAmount < 0) {
      alert("Введи коректний ліміт");
      return;
    }

    fetch(`${API_URL}/budgets/${budgetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: currentUser.user_id,
        limit_amount: limitAmount,
      }),
    })
      .then((response) => response.json())
      .then(() => loadBudgets())
      .catch((error) => console.error("Помилка оновлення бюджету:", error));
  };

  const filteredOperations = operations.filter((item) => {
    const matchesType =
      appliedFilterType === "усі" ? true : item.type === appliedFilterType;

    const matchesDateFrom = appliedDateFrom
      ? new Date(item.date) >= new Date(appliedDateFrom)
      : true;

    const matchesDateTo = appliedDateTo
      ? new Date(item.date) <= new Date(appliedDateTo)
      : true;

    const matchesSearch = appliedSearch
      ? item.name.toLowerCase().includes(appliedSearch) ||
        item.category.toLowerCase().includes(appliedSearch)
      : true;

    return matchesType && matchesDateFrom && matchesDateTo && matchesSearch;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOperations.length / ITEMS_PER_PAGE)
  );

  const paginatedOperations = filteredOperations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const income = operations
    .filter((item) => item.type === "дохід")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = operations
    .filter((item) => item.type === "витрата")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = income - expenses;

  const getSpentByCategory = (categoryName) => {
    return operations
      .filter(
        (item) => item.type === "витрата" && item.category === categoryName
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const expenseOperations = operations.filter((item) => item.type === "витрата");
  const incomeOperations = operations.filter((item) => item.type === "дохід");

  const maxExpense =
    expenseOperations.length > 0
      ? expenseOperations.reduce((max, item) =>
          Number(item.amount) > Number(max.amount) ? item : max
        )
      : null;

  const maxIncome =
    incomeOperations.length > 0
      ? incomeOperations.reduce((max, item) =>
          Number(item.amount) > Number(max.amount) ? item : max
        )
      : null;

  const categoryTotals = expenseOperations.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});

  const topCategory =
    Object.keys(categoryTotals).length > 0
      ? Object.entries(categoryTotals).reduce((max, current) =>
          current[1] > max[1] ? current : max
        )
      : null;

  const chartData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const maxChartValue =
    chartData.length > 0 ? Math.max(...chartData.map((item) => item.value)) : 0;

  const recentOperations = operations.slice(0, 5);

  const overBudgetCategories = budgets.filter((budget) => {
    const spent = getSpentByCategory(budget.category);
    return spent > Number(budget.limit_amount);
  });

  const averageExpense =
    expenseOperations.length > 0
      ? expenseOperations.reduce((sum, item) => sum + Number(item.amount), 0) /
        expenseOperations.length
      : 0;

  const unusualExpenses = expenseOperations.filter(
    (item) => Number(item.amount) > averageExpense * 2 && averageExpense > 0
  );

  const recommendations = [];

  if (topCategory) {
    recommendations.push(
      `Найбільше коштів витрачається в категорії "${topCategory[0]}". Доцільно переглянути витрати саме в цьому напрямі.`
    );
  }

  if (overBudgetCategories.length > 0) {
    overBudgetCategories.forEach((item) => {
      const spent = getSpentByCategory(item.category);
      recommendations.push(
        `У категорії "${item.category}" перевищено бюджет. Ліміт: ${item.limit_amount} грн, фактичні витрати: ${spent} грн.`
      );
    });
  }

  if (unusualExpenses.length > 0) {
    recommendations.push(
      "Система виявила нетипово великі витрати. Варто перевірити останні великі операції та оцінити їх доцільність."
    );
  }

  if (balance < 0) {
    recommendations.push(
      "Поточний баланс є від’ємним. Доцільно зменшити необов’язкові витрати або переглянути бюджетні ліміти."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Фінансовий стан стабільний. Перевищення бюджетів не виявлено, критичних відхилень у витратах немає."
    );
  }

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthOperations = operations.filter((item) => {
      const operationDate = new Date(item.date);
      return (
        operationDate.getFullYear() === currentYear &&
        operationDate.getMonth() === currentMonth
      );
    });

    const monthIncome = monthOperations
      .filter((item) => item.type === "дохід")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const monthExpenses = monthOperations
      .filter((item) => item.type === "витрата")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      total: monthOperations.length,
      income: monthIncome,
      expenses: monthExpenses,
      balance: monthIncome - monthExpenses,
    };
  }, [operations]);

  const exportToCSV = () => {
    const rows = [
      ["ID", "Назва", "Сума", "Тип", "Категорія", "Дата"],
      ...filteredOperations.map((item) => [
        item.id,
        item.name,
        item.amount,
        item.type,
        item.category,
        item.date,
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `operations_${today}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const themeToggleText = theme === "dark" ? "Світла тема" : "Темна тема";

  if (screen === "landing") {
    return (
      <div className="page">
        <div className="top-actions">
          <button
            className="theme-button"
            onClick={() =>
              setTheme((prev) => (prev === "dark" ? "light" : "dark"))
            }
          >
            {themeToggleText}
          </button>
        </div>

        <div className="hero-card">
          <div>
            <h1 className="hero-title">Фінансовий менеджер</h1>
            <p className="hero-text">
              Вебсистема для ведення особистих фінансів, контролю витрат,
              планування бюджетів і аналізу фінансової активності.
            </p>
            <p className="hero-text">
              Сервіс допомагає зберігати доходи й витрати, працювати з
              категоріями, переглядати статистику, редагувати записи та
              відстежувати перевищення лімітів.
            </p>

            <div className="landing-actions">
              <button
                className="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthMessage("");
                  setScreen("auth");
                }}
              >
                Увійти
              </button>

              <button
                className="outline-button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthMessage("");
                  setScreen("auth");
                }}
              >
                Зареєструватися
              </button>
            </div>
          </div>
        </div>

        <div className="home-grid">
          <div className="info-card">
            <h3>Що вміє система</h3>
            <ul className="list">
              <li>облік доходів і витрат;</li>
              <li>збереження операцій у базі даних;</li>
              <li>редагування та видалення записів;</li>
              <li>фільтрація за типом, датою і пошуком;</li>
              <li>контроль бюджетів по категоріях.</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Як це працює</h3>
            <ul className="list">
              <li>користувач проходить реєстрацію та вхід;</li>
              <li>додає фінансові операції з датою та категорією;</li>
              <li>система рахує підсумки доходів і витрат;</li>
              <li>у бюджетах задаються ліміти по категоріях;</li>
              <li>в аналітиці відображається статистика, графік і рекомендації.</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Для чого потрібна система</h3>
            <p>
              Вона допомагає краще контролювати особисті фінанси, бачити
              структуру витрат, планувати бюджет та швидко оцінювати
              фінансовий стан за вибраний період.
            </p>
          </div>

          <div className="info-card">
            <h3>Інтелектуальний аналіз</h3>
            <p>
              Система аналізує історичні фінансові дані користувача, визначає
              найбільш витратні категорії, виявляє перевищення бюджетів та
              формує персональні рекомендації.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "auth" && !currentUser) {
    return (
      <div className="page">
        <div className="top-actions">
          <button
            className="theme-button"
            onClick={() =>
              setTheme((prev) => (prev === "dark" ? "light" : "dark"))
            }
          >
            {themeToggleText}
          </button>
        </div>

        <div className="card auth-card">
          <h1 className="title">Фінансовий менеджер</h1>
          <p className="subtitle">
            {authMode === "login"
              ? "Вхід до системи"
              : "Реєстрація нового користувача"}
          </p>

          <form onSubmit={handleAuth}>
            <input
              className="input"
              placeholder="Логін"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="button" type="submit">
              {authMode === "login" ? "Увійти" : "Зареєструватися"}
            </button>
          </form>

          {authMessage && <p className="auth-message">{authMessage}</p>}

          <div className="auth-bottom-actions">
            <button
              className="switch-button"
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login"
                ? "Немає акаунта? Зареєструватися"
                : "Уже є акаунт? Увійти"}
            </button>

            <button
              className="back-button"
              onClick={() => {
                setScreen("landing");
                setAuthMessage("");
              }}
            >
              Назад на головну
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-actions">
        <button
          className="theme-button"
          onClick={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
        >
          {themeToggleText}
        </button>
      </div>

      <h1 className="title">Фінансовий менеджер</h1>
      <p className="subtitle">Користувач: {currentUser.username}</p>

      <div className="top-bar">
        <div className="nav">
          <button
            className={
              activeSection === "home" ? "nav-button active" : "nav-button"
            }
            onClick={() => setActiveSection("home")}
          >
            Головна
          </button>
          <button
            className={
              activeSection === "operations" ? "nav-button active" : "nav-button"
            }
            onClick={() => setActiveSection("operations")}
          >
            Операції
          </button>
          <button
            className={
              activeSection === "budgets" ? "nav-button active" : "nav-button"
            }
            onClick={() => setActiveSection("budgets")}
          >
            Бюджети
          </button>
          <button
            className={
              activeSection === "analytics" ? "nav-button active" : "nav-button"
            }
            onClick={() => setActiveSection("analytics")}
          >
            Аналітика
          </button>
          <button
            className={
              activeSection === "recommendations"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setActiveSection("recommendations")}
          >
            Рекомендації
          </button>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Вийти
        </button>
      </div>

      {activeSection === "home" && (
        <>
          <div className="hero-card">
            <div>
              <h2 className="hero-title">
                Інформаційна система управління особистими фінансами
              </h2>
              <p className="hero-text">
                Система призначена для обліку доходів і витрат, контролю бюджету,
                аналізу фінансової активності користувача та зручного керування
                персональними фінансовими записами.
              </p>
              <p className="hero-text">
                Після входу користувач може додавати операції, змінювати їх,
                видаляти записи, переглядати підсумки, працювати з бюджетами по
                категоріях і аналізувати витрати за допомогою статистики, графіка
                та автоматичних рекомендацій.
              </p>
            </div>
          </div>

          <div className="home-grid">
            <div className="stat-card">
              <p className="stat-label">Дохід</p>
              <p className="stat-value">{income} грн</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Витрати</p>
              <p className="stat-value">{expenses} грн</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Залишок</p>
              <p className="stat-value">{balance} грн</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Кількість операцій</p>
              <p className="stat-value">{operations.length}</p>
            </div>
          </div>

          <div className="home-grid">
            <div className="info-card">
              <h3>Підсумок за поточний місяць</h3>
              <p>Операцій: {currentMonthStats.total}</p>
              <p>Доходи: {currentMonthStats.income} грн</p>
              <p>Витрати: {currentMonthStats.expenses} грн</p>
              <p>
                <strong>Результат: {currentMonthStats.balance} грн</strong>
              </p>
            </div>

            <div className="info-card">
              <h3>Попередження по бюджетах</h3>
              {overBudgetCategories.length === 0 ? (
                <p>Перевищення бюджетів не виявлено.</p>
              ) : (
                <ul className="list">
                  {overBudgetCategories.map((item) => (
                    <li key={item.id}>
                      {item.category}: ліміт {item.limit_amount} грн, витрачено{" "}
                      {getSpentByCategory(item.category)} грн
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Останні операції</h2>
            {recentOperations.length === 0 ? (
              <p>Операції ще не додані.</p>
            ) : (
              <ul className="list">
                {recentOperations.map((item) => (
                  <li key={item.id}>
                    {item.date} — {item.name} — {item.amount} грн ({item.type},{" "}
                    {item.category})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {activeSection === "operations" && (
        <>
          <div className="card">
            <h2>{editingId ? "Редагувати операцію" : "Додати операцію"}</h2>

            <form onSubmit={handleSubmit}>
              <input
                className="input"
                placeholder="Назва операції"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                className="input"
                type="number"
                placeholder="Сума"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="витрата">Витрата</option>
                <option value="дохід">Дохід</option>
              </select>

              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="продукти">Продукти</option>
                <option value="транспорт">Транспорт</option>
                <option value="розваги">Розваги</option>
                <option value="комунальні послуги">Комунальні послуги</option>
                <option value="здоров'я">Здоров'я</option>
                <option value="зарплата">Зарплата</option>
                <option value="інше">Інше</option>
              </select>

              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <div className="form-actions">
                <button className="button" type="submit">
                  {editingId ? "Оновити" : "Зберегти"}
                </button>

                {editingId && (
                  <button
                    className="cancel-button"
                    type="button"
                    onClick={resetForm}
                  >
                    Скасувати
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <div className="section-header">
              <h2>Фільтр операцій</h2>
              <button className="export-button" onClick={exportToCSV}>
                Експорт у CSV
              </button>
            </div>

            <input
              className="input"
              placeholder="Пошук за назвою або категорією"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />

            <select
              className="input"
              value={filterTypeInput}
              onChange={(e) => setFilterTypeInput(e.target.value)}
            >
              <option value="усі">Усі</option>
              <option value="дохід">Доходи</option>
              <option value="витрата">Витрати</option>
            </select>

            <input
              className="input"
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
            />

            <input
              className="input"
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
            />

            <div className="filter-actions">
              <button className="button" type="button" onClick={applyFilters}>
                Показати
              </button>

              <button
                className="reset-filter-button"
                type="button"
                onClick={resetFilters}
              >
                Скинути фільтр
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Операції</h2>
            <p>Усього записів: {operations.length}</p>
            <p>Після фільтра: {filteredOperations.length}</p>

            <ul className="list">
              {paginatedOperations.map((item) => (
                <li key={item.id} className="operation-item">
                  <span>
                    {item.date} — {item.name} — {item.amount} грн ({item.type},{" "}
                    {item.category})
                  </span>

                  <div className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(item)}
                    >
                      Редагувати
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => handleDelete(item.id)}
                    >
                      Видалити
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {filteredOperations.length === 0 && (
              <p>За вибраними умовами записів не знайдено.</p>
            )}

            {filteredOperations.length > 0 && (
              <div className="pagination">
                <button
                  className="page-button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Назад
                </button>

                <span className="page-info">
                  Сторінка {currentPage} з {totalPages}
                </span>

                <button
                  className="page-button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Далі
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === "budgets" && (
        <div className="card">
          <h2>Бюджети по категоріях</h2>

          {budgets.map((item) => {
            const spent = getSpentByCategory(item.category);
            const isOver = spent > Number(item.limit_amount);

            return (
              <div key={item.id} className="budget-edit-row">
                <div className="budget-info">
                  <p>
                    <strong>{item.category}</strong>
                  </p>
                  <p>Поточний ліміт: {item.limit_amount} грн</p>
                  <p>Витрачено: {spent} грн</p>
                  <p className={isOver ? "status-over" : "status-ok"}>
                    {isOver ? "Перевищено" : "У межах бюджету"}
                  </p>
                </div>

                <div className="budget-controls">
                  <input
                    className="input"
                    type="number"
                    value={budgetInputs[item.id] ?? ""}
                    onChange={(e) =>
                      handleBudgetInputChange(item.id, e.target.value)
                    }
                  />
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleSaveBudget(item.id)}
                  >
                    Зберегти ліміт
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSection === "analytics" && (
        <>
          <div className="card">
            <h2>Аналітика</h2>
            <p>Кількість операцій: {operations.length}</p>
            <p>
              Найбільша витрата:{" "}
              {maxExpense
                ? `${maxExpense.name} — ${maxExpense.amount} грн`
                : "немає даних"}
            </p>
            <p>
              Найбільший дохід:{" "}
              {maxIncome
                ? `${maxIncome.name} — ${maxIncome.amount} грн`
                : "немає даних"}
            </p>
            <p>
              Категорія з найбільшими витратами:{" "}
              {topCategory
                ? `${topCategory[0]} — ${topCategory[1]} грн`
                : "немає даних"}
            </p>
          </div>

          <div className="card">
            <h2>Графік витрат по категоріях</h2>

            {chartData.length === 0 ? (
              <p>Немає даних для побудови графіка.</p>
            ) : (
              <div className="chart">
                {chartData.map((item) => (
                  <div key={item.name} className="chart-row">
                    <div className="chart-label">{item.name}</div>
                    <div className="chart-bar-wrapper">
                      <div
                        className="chart-bar"
                        style={{
                          width: `${(item.value / maxChartValue) * 100}%`,
                        }}
                      >
                        {item.value} грн
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === "recommendations" && (
        <>
          <div className="card">
            <h2>Інтелектуальний аналіз і рекомендації</h2>
            <p>
              Розділ формує рекомендації на основі історичних фінансових даних,
              структури витрат, перевищення бюджетів та виявлення нетипових
              операцій.
            </p>
          </div>

          <div className="card">
            <h2>Персональні рекомендації</h2>
            <ul className="list">
              {recommendations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Додаткові спостереження</h2>
            <p>
              Середній розмір витрати:{" "}
              <strong>
                {averageExpense ? averageExpense.toFixed(2) : 0} грн
              </strong>
            </p>
            <p>
              Кількість нетипово великих витрат:{" "}
              <strong>{unusualExpenses.length}</strong>
            </p>
            <p>
              Кількість категорій із перевищенням бюджету:{" "}
              <strong>{overBudgetCategories.length}</strong>
            </p>
          </div>

          <div className="card">
            <h2>Нетипові великі витрати</h2>
            {unusualExpenses.length === 0 ? (
              <p>Нетипових витрат не виявлено.</p>
            ) : (
              <ul className="list">
                {unusualExpenses.map((item) => (
                  <li key={item.id}>
                    {item.date} — {item.name} — {item.amount} грн (
                    {item.category})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
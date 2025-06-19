document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram Web App API
    const WebApp = window.Telegram.WebApp;

    // Показываем главный заголовок приложения
    const appTitle = document.getElementById('app-title');
    const expertSelection = document.getElementById('expert-selection');
    const expertList = document.getElementById('expert-list');
    const calendarView = document.getElementById('calendar-view');
    const calendarTitle = document.getElementById('calendar-title');
    const daySelection = document.getElementById('day-selection');
    const periodSelection = document.getElementById('period-selection');
    const slotSelection = document.getElementById('slot-selection');
    const loader = document.getElementById('loader');
    const messageDiv = document.getElementById('message');

    // Админские элементы
    const adminPanel = document.getElementById('admin-panel');
    const adminExpertList = document.getElementById('admin-expert-list');
    const adminScheduleOptions = document.getElementById('admin-schedule-options');
    const adminExpertName = document.getElementById('admin-expert-name');
    const adminDaySelection = document.getElementById('admin-day-selection');
    const adminPeriodSelection = document.getElementById('admin-period-selection');
    const adminSlotSelection = document.getElementById('admin-slot-selection');

    let currentUserId;
    let isAdmin = false;
    let availableExperts = []; // Доступные эксперты для клиента
    let selectedExpert = null; // Выбранный эксперт для бронирования/администрирования
    let selectedDate = null;
    let selectedPeriod = null;
    let adminActionType = null; // 'block' или 'unblock' для админа

    // Инициализация Web App
    WebApp.ready();
    WebApp.expand(); // Разворачиваем Web App на весь экран

    function showLoader(show) {
        loader.classList.toggle('hidden', !show);
    }

    function showMessage(msg) {
        messageDiv.textContent = msg;
        messageDiv.classList.remove('hidden');
    }

    function hideAllViews() {
        expertSelection.classList.add('hidden');
        calendarView.classList.add('hidden');
        adminPanel.classList.add('hidden');
        adminScheduleOptions.classList.add('hidden');
        adminDaySelection.classList.add('hidden');
        adminPeriodSelection.classList.add('hidden');
        adminSlotSelection.classList.add('hidden');
    }

    // Парсинг initData (параметры, переданные ботом при запуске TWA)
    function parseInitData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dataParam = urlParams.get('data');
            if (dataParam) {
                const decodedData = decodeURIComponent(dataParam);
                const launchData = JSON.parse(decodedData);
                currentUserId = launchData.userId;
                isAdmin = launchData.isAdmin;
                if (!isAdmin) {
                    availableExperts = launchData.expertOptions;
                }
                console.log('Launch Data:', launchData);
                return true;
            }
        } catch (e) {
            console.error('Ошибка парсинга initData:', e);
        }
        return false;
    }

    function getSpecialtyName(spec) {
        const map = { psychologist: 'Психолог', tarot: 'Таролог', astrologer: 'Астролог' };
        return map[spec] || spec;
    }
    
    // --- Функции рендеринга для клиента ---
    function renderExpertSelection() {
        appTitle.textContent = 'Выберите специалиста';
        hideAllViews();
        expertSelection.classList.remove('hidden');
        expertList.innerHTML = '';
        if (availableExperts.length === 0) {
            expertList.innerHTML = '<p>Нет доступных экспертов.</p>';
        } else {
            availableExperts.forEach(expert => {
                const button = document.createElement('button');
                button.className = 'twa-button';
                button.textContent = `👤 ${expert.name} (${expert.specialtyName}) — осталось ${expert.freeSessions}`;
                button.onclick = () => {
                    selectedExpert = expert;
                    renderDaySelection(expert.name);
                };
                expertList.appendChild(button);
            });
        }
    }

    function renderDaySelection(expertName) {
        appTitle.textContent = `Выберите день для ${expertName}`;
        hideAllViews();
        calendarView.classList.remove('hidden');
        calendarTitle.textContent = `Выберите день для консультации с ${expertName}:`;
        daySelection.classList.remove('hidden');
        periodSelection.classList.add('hidden');
        slotSelection.classList.add('hidden');
        daySelection.innerHTML = '';

        const today = new Date();
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const button = document.createElement('button');
            button.className = 'twa-button small';
            button.textContent = `${date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}`;
            button.onclick = () => {
                selectedDate = date.toISOString().slice(0, 10);
                renderPeriodSelection();
            };
            daySelection.appendChild(button);
        }
    }

    function renderPeriodSelection() {
        appTitle.textContent = `Выберите период`;
        hideAllViews();
        calendarView.classList.remove('hidden');
        calendarTitle.textContent = `На ${new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })} выберите период:`;
        daySelection.classList.add('hidden');
        periodSelection.classList.remove('hidden');
        slotSelection.classList.add('hidden');
        periodSelection.innerHTML = '';

        const periods = [
            { key: 'morning', text: '🌅 Утро (09–12)' },
            { key: 'afternoon', text: '☀️ День (12–16)' },
            { key: 'evening', text: '🌆 Вечер (16–20)' },
            { key: 'night', text: '🌙 Ночь (20–22)' }
        ];

        periods.forEach(period => {
            const button = document.createElement('button');
            button.className = 'twa-button';
            button.textContent = period.text;
            button.onclick = () => {
                selectedPeriod = period.key;
                renderSlotSelection();
            };
            periodSelection.appendChild(button);
        });
    }

    async function renderSlotSelection() {
        appTitle.textContent = `Выберите время`;
        hideAllViews();
        calendarView.classList.remove('hidden');
        calendarTitle.textContent = `Выберите 15-минутный слот:`;
        daySelection.classList.add('hidden');
        periodSelection.classList.add('hidden');
        slotSelection.classList.remove('hidden');
        slotSelection.innerHTML = '';
        showLoader(true);

        const ranges = {
            morning: [9, 12],
            afternoon: [12, 16],
            evening: [16, 20],
            night: [20, 22]
        };

        const [startHour, endHour] = ranges[selectedPeriod];
        const date = new Date(selectedDate);
        
        // Временное решение для получения заблокированных слотов и занятых слотов
        // В реальном приложении это должен возвращать бот на запрос из TWA
        const dummyBlockedSlots = []; // Заглушка, чтобы не сломать
        const dummyBookedSlots = []; // Заглушка, чтобы не сломать

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 15) {
                const dt = new Date(date);
                dt.setHours(h, m, 0, 0);
                const isoDateTime = dt.toISOString();

                // Здесь нужно реальное API к боту, чтобы получить занятость
                // Пока просто заглушки:
                const isBooked = dummyBookedSlots.includes(isoDateTime); 
                const isBlockedByExpert = dummyBlockedSlots.includes(isoDateTime);

                const button = document.createElement('button');
                button.className = 'twa-button slot';
                button.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                if (isBooked || isBlockedByExpert) {
                    button.classList.add('disabled');
                    button.textContent += ' ❌';
                    button.disabled = true;
                } else {
                    button.textContent += ' ✅';
                    button.onclick = () => confirmBooking(isoDateTime);
                }
                slotSelection.appendChild(button);
            }
        }
        showLoader(false);
    }

    async function confirmBooking(isoDateTime) {
        if (!selectedExpert || !isoDateTime) {
            showMessage('Ошибка: не выбран эксперт или время.');
            return;
        }
        showLoader(true);
        WebApp.MainButton.setText('Бронирование...');
        WebApp.MainButton.show();
        
        // Отправляем данные боту
        WebApp.sendData(JSON.stringify({
            type: 'book',
            expertId: selectedExpert.id,
            dateTime: isoDateTime,
            specialty: selectedExpert.specialty // Передаем specialty для обновления счетчика
        }));
        // Бот сам отправит подтверждение в чат и закроет Web App
    }
    
    // --- Функции рендеринга для админа ---
    function renderAdminPanel() {
        appTitle.textContent = 'Админ-панель';
        hideAllViews();
        adminPanel.classList.remove('hidden');
        adminExpertList.innerHTML = '';
        
        // Для админа нужно получить список всех экспертов
        // В реальном приложении это должен возвращать бот на запрос из TWA
        // Или TWA запускается с этим списком
        // Пока что заглушка:
        const allExperts = [
            { id: 'expert1', name: 'Иван Петров', specialty: 'psychologist', specialtyName: 'Психолог' },
            { id: 'expert2', name: 'Мария Сидорова', specialty: 'tarot', specialtyName: 'Таролог' }
        ];

        allExperts.forEach(expert => {
            const button = document.createElement('button');
            button.className = 'twa-button';
            button.textContent = `🗓️ ${expert.name} (${expert.specialtyName})`;
            button.onclick = () => {
                selectedExpert = expert;
                renderAdminScheduleOptions();
            };
            adminExpertList.appendChild(button);
        });
    }

    function renderAdminScheduleOptions() {
        appTitle.textContent = `Управление: ${selectedExpert.name}`;
        hideAllViews();
        adminScheduleOptions.classList.remove('hidden');
        adminExpertName.textContent = selectedExpert.name;

        // Обработчики кнопок
        document.querySelector('[data-action="admin_block_slot_day_select"]').onclick = () => {
            adminActionType = 'block';
            renderAdminDaySelection();
        };
        document.querySelector('[data-action="admin_unblock_slot_day_select"]').onclick = () => {
            adminActionType = 'unblock';
            renderAdminDaySelection();
        };
        document.querySelector('[data-action="admin_view_blocked_slots"]').onclick = () => {
            renderAdminViewBlockedSlots();
        };
    }

    function renderAdminDaySelection() {
        appTitle.textContent = `${adminActionType === 'block' ? 'Заблокировать' : 'Разблокировать'} слот`;
        hideAllViews();
        adminDaySelection.classList.remove('hidden');
        adminDaySelection.innerHTML = '';

        const today = new Date();
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const button = document.createElement('button');
            button.className = 'twa-button small';
            button.textContent = `${date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}`;
            button.onclick = () => {
                selectedDate = date.toISOString().slice(0, 10);
                renderAdminPeriodSelection();
            };
            adminDaySelection.appendChild(button);
        }
    }

    function renderAdminPeriodSelection() {
        appTitle.textContent = `${adminActionType === 'block' ? 'Заблокировать' : 'Разблокировать'} слот`;
        hideAllViews();
        adminPeriodSelection.classList.remove('hidden');
        adminPeriodSelection.innerHTML = '';

        const periods = [
            { key: 'morning', text: '🌅 Утро (09–12)' },
            { key: 'afternoon', text: '☀️ День (12–16)' },
            { key: 'evening', text: '🌆 Вечер (16–20)' },
            { key: 'night', text: '🌙 Ночь (20–22)' }
        ];

        periods.forEach(period => {
            const button = document.createElement('button');
            button.className = 'twa-button';
            button.textContent = period.text;
            button.onclick = () => {
                selectedPeriod = period.key;
                renderAdminSlotSelection();
            };
            adminPeriodSelection.appendChild(button);
        });
    }

    async function renderAdminSlotSelection() {
        appTitle.textContent = `${adminActionType === 'block' ? 'Заблокировать' : 'Разблокировать'} слот`;
        hideAllViews();
        adminSlotSelection.classList.remove('hidden');
        adminSlotSelection.innerHTML = '';
        showLoader(true);

        const ranges = {
            morning: [9, 12],
            afternoon: [12, 16],
            evening: [16, 20],
            night: [20, 22]
        };

        const [startHour, endHour] = ranges[selectedPeriod];
        const date = new Date(selectedDate);
        
        // Здесь нужно получить реальные заблокированные слоты от бота
        // Пока заглушка:
        const currentBlockedSlots = []; 

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 15) {
                const dt = new Date(date);
                dt.setHours(h, m, 0, 0);
                const isoDateTime = dt.toISOString();

                const isCurrentlyBlocked = currentBlockedSlots.includes(isoDateTime);

                const button = document.createElement('button');
                button.className = 'twa-button slot';
                button.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                
                let clickable = false;
                if (adminActionType === 'block' && !isCurrentlyBlocked) {
                    button.textContent += ' ✅'; // Свободный, можно заблокировать
                    clickable = true;
                } else if (adminActionType === 'unblock' && isCurrentlyBlocked) {
                    button.textContent += ' 🚫'; // Заблокированный, можно разблокировать
                    clickable = true;
                } else {
                    button.textContent += isCurrentlyBlocked ? ' 🚫' : ' ✅'; // Заглушка, если нельзя кликнуть
                    button.classList.add('disabled');
                    button.disabled = true;
                }

                if (clickable) {
                    button.onclick = () => sendAdminSlotAction(isoDateTime);
                }
                adminSlotSelection.appendChild(button);
            }
        }
        showLoader(false);
    }

    function sendAdminSlotAction(isoDateTime) {
        showLoader(true);
        WebApp.MainButton.setText('Отправка...');
        WebApp.MainButton.show();

        WebApp.sendData(JSON.stringify({
            type: `admin_${adminActionType}`, // 'admin_block' или 'admin_unblock'
            expertId: selectedExpert.id,
            dateTime: isoDateTime
        }));
    }

    async function renderAdminViewBlockedSlots() {
        appTitle.textContent = `Заблокированные слоты ${selectedExpert.name}`;
        hideAllViews();
        adminScheduleOptions.classList.remove('hidden'); // Показываем эту секцию
        // Здесь нужно получить реальные заблокированные слоты от бота
        // Пока заглушка:
        const blockedSlots = ['2025-06-21T05:00:00.000Z', '2025-06-21T09:00:00.000Z']; 

        let message = '🚫 *Заблокированные слоты:*\n\n';
        if (blockedSlots.length === 0) {
            message = 'У этого эксперта нет заблокированных слотов.';
        } else {
            blockedSlots.forEach(slot => {
                message += `- ${new Date(slot).toLocaleString('ru-RU')}\n`;
            });
        }
        showMessage(message);
        showLoader(false);
        // Добавить кнопку "Назад"
        const backButton = document.createElement('button');
        backButton.className = 'twa-button';
        backButton.textContent = '🔙 Назад';
        backButton.onclick = renderAdminScheduleOptions; // Возвращаемся
        messageDiv.appendChild(backButton);
    }


    // --- Инициализация и роутинг ---
    function initApp() {
        if (!parseInitData()) {
            showMessage('Ошибка инициализации Web App. Попробуйте обновить.');
            return;
        }

        if (isAdmin) {
            renderAdminPanel();
        } else {
            renderExpertSelection();
        }
    }

    initApp();
});

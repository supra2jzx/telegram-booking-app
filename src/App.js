// src/App.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { db } from './firebase';
import BookingCalendar from './BookingCalendar';
import './App.css';

const WebApp = window.Telegram.WebApp;

function App() {
    const [view, setView] = useState('loading'); // 'loading', 'experts', 'calendar', 'admin'
    const [experts, setExperts] = useState([]);
    const [selectedExpert, setSelectedExpert] = useState(null);
    const [launchData, setLaunchData] = useState(null);

    useEffect(() => {
        WebApp.ready();
        
        try {
            const params = new URLSearchParams(WebApp.initData);
            const dataParam = params.get('data');
            if (dataParam) {
                const decodedData = decodeURIComponent(dataParam);
                const data = JSON.parse(decodedData);
                setLaunchData(data);
            }
        } catch (e) {
            console.error("Ошибка парсинга initData", e);
            setView('error');
        }
    }, []);

    useEffect(() => {
        if (!launchData) return;

        const fetchExperts = async () => {
            const expertsCollection = collection(db, "experts");
            const expertsSnapshot = await getDocs(expertsCollection);
            const expertsList = expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (launchData.isAdmin) {
                setExperts(expertsList);
                setView('admin');
            } else {
                // Фильтруем экспертов для клиента
                const availableForClient = expertsList.filter(expert =>
                    (launchData.expertOptions || []).some(opt => opt.id === expert.id)
                );
                setExperts(availableForClient);
                setView('experts');
            }
        };

        fetchExperts();
    }, [launchData]);
    
    const handleExpertSelect = (expert) => {
        setSelectedExpert(expert);
        setView('calendar');
    };
    
    const handleSlotSelect = (dateTime) => {
        // Отправка данных боту
        WebApp.sendData(JSON.stringify({
            type: 'book',
            expertId: selectedExpert.id,
            specialty: selectedExpert.specialty,
            dateTime: dateTime.toISOString(),
        }));
        WebApp.close();
    };

    const handleAdminSlotManage = (expert, actionType) => {
        // Логика для админки
        // Здесь можно открыть модальное окно или новый календарь для выбора слота для блокировки/разблокировки
        alert(`Действие: ${actionType} для ${expert.name}`);
        // Для простоты, пока только alert
    };

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return <div className="loader">Загрузка...</div>;
            case 'experts':
                return (
                    <div>
                        <h2>Выберите специалиста</h2>
                        <div className="expert-list">
                            {experts.map(expert => (
                                <button key={expert.id} className="expert-button" onClick={() => handleExpertSelect(expert)}>
                                    {expert.name} ({expert.specialty})
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'calendar':
                return (
                    <BookingCalendar
                        expert={selectedExpert}
                        onSlotSelect={handleSlotSelect}
                    />
                );
            case 'admin':
                return (
                    <div>
                        <h2>Админ-панель: Управление экспертами</h2>
                        <div className="admin-expert-list">
                            {experts.map(expert => (
                                <div key={expert.id} className="admin-expert-item">
                                    <p>{expert.name}</p>
                                    <button onClick={() => handleAdminSlotManage(expert, 'block')}>Заблокировать</button>
                                    <button onClick={() => handleAdminSlotManage(expert, 'unblock')}>Разблокировать</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'error':
                return <div>Произошла ошибка. Пожалуйста, перезапустите Web App.</div>
            default:
                return <div>Что-то пошло не так.</div>;
        }
    };

    return (
        <div className="App">
            {renderContent()}
        </div>
    );
}

export default App;

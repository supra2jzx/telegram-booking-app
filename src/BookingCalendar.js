// src/BookingCalendar.js
import React, { useState, useEffect } from 'react';
import { Calendar } from '@demark-pro/react-booking-calendar';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';

const BookingCalendar = ({ expert, onSlotSelect }) => {
    const [reservedSlots, setReservedSlots] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReservedSlots = async () => {
            if (!expert) return;
            setIsLoading(true);

            // Загружаем забронированные слоты
            const bookingsQuery = query(
                collection(db, "bookings"),
                where("expertId", "==", expert.id),
                where("status", "==", "booked")
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            const booked = bookingsSnap.docs.map(doc => new Date(doc.data().dateTime));

            // Загружаем заблокированные админом слоты
            // В реальном приложении это тоже нужно делать через getDoc
            const blocked = (expert.blockedSlots || []).map(slot => new Date(slot));

            setReservedSlots([...booked, ...blocked]);
            setIsLoading(false);
        };

        fetchReservedSlots();
    }, [expert]);

    const handleDateChange = (dates) => {
        if (dates.length > 0) {
            const selectedDate = dates[0];
            // Здесь можно добавить выбор времени (периоды, слоты),
            // но для простоты сразу отправляем выбранную дату и время по умолчанию (например, 12:00)
            // или открываем модальное окно с выбором времени.
            
            // Для примера, мы сразу вызываем onSlotSelect с выбранной датой
            // и временем 12:00
            const selectedDateTime = new Date(selectedDate);
            selectedDateTime.setHours(12, 0, 0, 0); // Пример
            onSlotSelect(selectedDateTime);
        }
        setSelectedDates(dates);
    };

    if (isLoading) {
        return <div className="loader">Загрузка расписания...</div>;
    }

    return (
        <div className="calendar-container">
            <h3>Доступные даты для {expert.name}</h3>
            <Calendar
                selected={selectedDates}
                reserved={reservedSlots.map(date => ({
                    startDate: date,
                    endDate: date,
                }))}
                onChange={handleDateChange}
                // Настройки для календаря
                range={false} // Выбираем только одну дату
                // Другие опции из документации библиотеки
            />
        </div>
    );
};

export default BookingCalendar;

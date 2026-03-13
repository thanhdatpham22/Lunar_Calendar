/**
 * =====================================================
 * MAIN.JS - Logic chính của ứng dụng
 * =====================================================
 */

// ========== HOLIDAYS DATA ==========

// Ngày lễ Dương lịch
const SOLAR_HOLIDAYS = {
    '1/1': 'Tết Dương Lịch',
    '14/2': 'Lễ Tình Nhân',
    '8/3': 'Quốc tế Phụ nữ',
    '30/4': 'Giải phóng miền Nam',
    '1/5': 'Quốc tế Lao động',
    '1/6': 'Quốc tế Thiếu nhi',
    '27/7': 'Thương binh Liệt sĩ',
    '2/9': 'Quốc Khánh',
    '20/10': 'Phụ nữ Việt Nam',
    '20/11': 'Nhà giáo Việt Nam',
    '22/12': 'Quân đội Nhân dân',
    '25/12': 'Giáng Sinh'
};

// Ngày lễ Âm lịch
const LUNAR_HOLIDAYS = {
    '1/1': 'Tết Nguyên Đán',
    '2/1': 'Mùng 2 Tết',
    '3/1': 'Mùng 3 Tết',
    '15/1': 'Rằm tháng Giêng',
    '10/3': 'Giỗ Tổ Hùng Vương',
    '15/4': 'Phật Đản',
    '5/5': 'Tết Đoan Ngọ',
    '15/7': 'Vu Lan',
    '15/8': 'Tết Trung Thu',
    '23/12': 'Ông Táo chầu Trời',
    '30/12': 'Tất Niên'
};

// Các ngày trong tuần
const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
// URL Web App của Google Apps Script (sẽ tạo ở bước 3.3)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzvW_JP7YvctW3boq1xUP7RlaOJt2AKN-dhGE7si6U21TtM7i9Wriwxbjy95tNA1rxg/exec'; // thay bằng URL Web App thật

// Lưu sự kiện cá nhân đã tải về: { 'YYYY-MM-DD': [ {id, date, title, description} ] }
let personalEvents = {};

// ========== GLOBAL VARIABLES ==========
let currentDate = new Date();
let selectedDate = new Date();
let viewMonth = currentDate.getMonth();
let viewYear = currentDate.getFullYear();
// Định dạng key ngày: YYYY-MM-DD (dùng để lưu vào Sheet & tra cứu)
function formatDateKey(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Định dạng key ngày từ year, month(0-based), day
function formatDateKeyFromParts(year, month0, day) {
    const m = (month0 + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
}

// Định dạng ngày tiếng Việt đơn giản: d/m/yyyy (không pad 0)
function formatDateVi(date) {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

// Hiển thị danh sách sự kiện của selectedDate
function renderDayEvents() {
    const listEl = document.getElementById('event-list');
    const dateTextEl = document.getElementById('event-date-text');
    if (!listEl || !dateTextEl) return; // phòng khi HTML chưa được thêm

    const key = formatDateKey(selectedDate);
    const events = personalEvents[key] || [];

    dateTextEl.textContent = `Sự kiện cho ngày ${formatDateVi(selectedDate)}`;

    listEl.innerHTML = '';
    if (!events.length) {
        listEl.innerHTML = '<li class="text-gray-500 text-sm">Chưa có sự kiện nào cho ngày này.</li>';
        return;
    }

    events.forEach(ev => {
        const li = document.createElement('li');
        li.className = 'p-2 bg-gray-50 rounded border border-gray-100';
        li.innerHTML = `
            <div class="font-medium">${ev.title}</div>
            ${ev.description ? `<div class="text-xs text-gray-500 mt-1">${ev.description}</div>` : ''}
        `;
        listEl.appendChild(li);
    });
}

// Gắn submit handler cho form thêm sự kiện
function setupEventForm() {
    const form = document.getElementById('event-form');
    if (!form) return;
    form.addEventListener('submit', onEventFormSubmit);
}
function toggleEventForm() {
    const form = document.getElementById('event-form');
    const section = document.getElementById('personal-events');
    if (!form) return;

    form.classList.toggle('hidden');

    // Khi mở form thì cuộn xuống khu vực sự kiện (hữu ích trên mobile)
    if (!form.classList.contains('hidden') && section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Xóa tất cả sự kiện của ngày đang chọn (chỉ trên giao diện; cần thêm API backend nếu muốn đồng bộ)
async function deleteSelectedEvents() {
    const key = formatDateKey(selectedDate);
    const statusEl = document.getElementById('event-status');
    const events = personalEvents[key] || [];

    if (!events.length) {
        if (statusEl) statusEl.textContent = 'Không có sự kiện nào để xóa cho ngày này.';
        return;
    }

    const confirmMsg = `Xóa ${events.length} sự kiện của ngày ${formatDateVi(selectedDate)}?`;
    if (!confirm(confirmMsg)) return;

    if (statusEl) statusEl.textContent = 'Đang xóa sự kiện...';

    try {
        await deletePersonalEvents(key);
        delete personalEvents[key];
        renderDayEvents();
        renderMonthCalendar();
        if (statusEl) {
            statusEl.textContent = 'Đã xóa sự kiện cho ngày này.';
        }
    } catch (err) {
        console.error(err);
        if (statusEl) {
            statusEl.textContent = 'Xóa thất bại trên server. Kiểm tra Apps Script.';
        }
    }
}
// Chuyển date từ server thành key YYYY-MM-DD theo giờ địa phương
function getEventDateKey(ev) {
    if (!ev || !ev.date) return null;

    // Nếu server trả chuỗi ISO: "2025-12-17T17:00:00.000Z"
    if (typeof ev.date === 'string') {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
            // Đổi sang ngày local rồi format "YYYY-MM-DD"
            return formatDateKey(d);
        }
        // Fallback: lấy 10 kí tự đầu "YYYY-MM-DD"
        return ev.date.slice(0, 10);
    }

    // Nếu (hiếm) là số timestamp
    if (typeof ev.date === 'number') {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
            return formatDateKey(d);
        }
    }

    return null;
}
// Tải toàn bộ sự kiện từ Google Sheet qua Apps Script
async function loadPersonalEvents() {
    if (!APPS_SCRIPT_URL) {
        console.warn('Chưa cấu hình APPS_SCRIPT_URL, bỏ qua tải sự kiện cá nhân.');
        return;
    }

    try {
        const res = await fetch(APPS_SCRIPT_URL);
        const text = await res.text();
        console.log('Apps Script GET status:', res.status);
        console.log('Apps Script GET raw response:', text);

        if (!res.ok) {
            console.warn('GET Apps Script trả về HTTP ' + res.status);
            return;
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.warn('GET Apps Script trả về không phải JSON:', e);
            return;
        }

        if (!data || !Array.isArray(data.events)) {
            console.warn('Định dạng dữ liệu sự kiện không hợp lệ', data);
            return;
        }

        personalEvents = {};
        data.events.forEach(ev => {
            const key = getEventDateKey(ev); // DÙNG KEY CHUẨN HÓA
            if (!key || !ev.title) return;
            if (!personalEvents[key]) personalEvents[key] = [];
            personalEvents[key].push(ev);
        });

        renderDayEvents();
        renderMonthCalendar();
    } catch (err) {
        console.error('Không tải được sự kiện cá nhân từ Apps Script', err);
    }
}

// Gửi sự kiện mới lên Apps Script
async function addPersonalEvent(eventData) {
    if (!APPS_SCRIPT_URL) {
        throw new Error('APPS_SCRIPT_URL chưa được cấu hình trong main.js');
    }

    // Gửi dạng form-urlencoded để tránh preflight CORS
    const body = new URLSearchParams();
    body.append('data', JSON.stringify(eventData));

    let res;
    try {
        res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body // browser tự đặt Content-Type: application/x-www-form-urlencoded
        });
    } catch (networkErr) {
        console.error('Lỗi khi gọi fetch tới Apps Script:', networkErr);
        throw new Error('Không thể kết nối tới Apps Script (lỗi mạng hoặc CORS).');
    }

    const text = await res.text();
    console.log('Apps Script response status:', res.status);
    console.log('Apps Script raw response:', text);

    if (!res.ok) {
        throw new Error('Apps Script trả về HTTP ' + res.status);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (jsonErr) {
        console.error('Lỗi parse JSON:', jsonErr);
        throw new Error('Phản hồi từ Apps Script không phải JSON hợp lệ.');
    }

    if (!data.success) {
        throw new Error(data.message || 'Lỗi khi lưu sự kiện trên Apps Script');
    }
    return data;
}

// Gửi yêu cầu xóa sự kiện của một ngày lên Apps Script
async function deletePersonalEvents(dateStr) {
    if (!APPS_SCRIPT_URL) {
        throw new Error('APPS_SCRIPT_URL chưa được cấu hình trong main.js');
    }

    const body = new URLSearchParams();
    body.append('action', 'delete');
    body.append('date', dateStr);

    let res;
    try {
        res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body
        });
    } catch (networkErr) {
        console.error('Lỗi khi gọi fetch tới Apps Script:', networkErr);
        throw new Error('Không thể kết nối tới Apps Script (lỗi mạng hoặc CORS).');
    }

    const text = await res.text();
    console.log('Apps Script delete status:', res.status);
    console.log('Apps Script delete raw response:', text);

    if (!res.ok) {
        throw new Error('Apps Script trả về HTTP ' + res.status);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (jsonErr) {
        console.error('Lỗi parse JSON:', jsonErr);
        throw new Error('Phản hồi từ Apps Script không phải JSON hợp lệ.');
    }

    if (!data.success) {
        throw new Error(data.message || 'Lỗi khi xóa sự kiện trên Apps Script');
    }
    return data;
}

// Xử lý submit form thêm sự kiện
async function onEventFormSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('event-title');
    const descInput = document.getElementById('event-description');
    const statusEl = document.getElementById('event-status');

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title) {
        statusEl.textContent = 'Vui lòng nhập tiêu đề sự kiện.';
        return;
    }

    const dateStr = formatDateKey(selectedDate);
    statusEl.textContent = 'Đang lưu sự kiện...';

    try {
        const res = await addPersonalEvent({ date: dateStr, title, description });
        const id = res.id || Date.now();

        if (!personalEvents[dateStr]) personalEvents[dateStr] = [];
        personalEvents[dateStr].push({ id, date: dateStr, title, description });

        titleInput.value = '';
        descInput.value = '';
        statusEl.textContent = 'Đã lưu sự kiện.';

        renderDayEvents();
        renderMonthCalendar();
        // Ẩn form sau khi lưu thành công
        const form = document.getElementById('event-form');
        if (form) form.classList.add('hidden');
    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Không lưu được sự kiện. Kiểm tra lại kết nối hoặc URL Apps Script.';
    }
}
// ========== INITIALIZATION ==========
function init() {
    // Khởi tạo dropdown năm (từ 1900 đến 2100)
    const yearSelect = document.getElementById('year-select');
    for (let y = 1900; y <= 2100; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = 'Năm ' + y;
        yearSelect.appendChild(option);
    }
    
    // Set giá trị mặc định
    document.getElementById('month-select').value = viewMonth;
    document.getElementById('year-select').value = viewYear;
    
    // Render lịch
    updateDayCalendar();
    renderMonthCalendar();
    renderHolidayList();
    updateWeather();

    // Thiết lập form & tải sự kiện cá nhân
    setupEventForm();
    loadPersonalEvents();

    // Hiệu ứng icon rơi theo mùa
    startSeasonalFall();
    
    // Debug: In ra kết quả để kiểm tra
    console.log('=== KIỂM TRA THUẬT TOÁN ÂM LỊCH ===');
    const testDate = new Date();
    const dd = testDate.getDate();
    const mm = testDate.getMonth() + 1;
    const yy = testDate.getFullYear();
    const lunar = LunarCalendar.solar2Lunar(dd, mm, yy);
    console.log(`Dương lịch: ${dd}/${mm}/${yy}`);
    console.log(`Âm lịch: ${lunar.day}/${lunar.month}/${lunar.year}${lunar.leap ? ' (nhuận)' : ''}`);
    console.log(`Can Chi Ngày: ${LunarCalendar.getDayCanChi(lunar.jd)}`);
    console.log(`Can Chi Năm: ${LunarCalendar.getYearCanChi(lunar.year)}`);
}

/**
 * Cập nhật phần Lịch Ngày
 */
function updateDayCalendar() {
    const dd = selectedDate.getDate();
    const mm = selectedDate.getMonth() + 1;
    const yy = selectedDate.getFullYear();
    const dayOfWeek = selectedDate.getDay();
    
    // Chuyển sang âm lịch
    const lunar = LunarCalendar.solar2Lunar(dd, mm, yy);
    
    // Cập nhật Dương lịch
    //document.getElementById('solar-day').textContent = dd.toString().padStart(2, '0');
    document.getElementById('solar-day').textContent = dd;
    document.getElementById('solar-weekday').textContent = WEEKDAYS[dayOfWeek];
    document.getElementById('solar-month-year').textContent = `Tháng ${mm} năm ${yy}`;
    
    // Cập nhật Âm lịch
    //document.getElementById('lunar-day').textContent = lunar.day.toString().padStart(2, '0');
    document.getElementById('lunar-day').textContent = lunar.day;
    const monthName = LunarCalendar.getLunarMonthName(lunar.month, lunar.leap);
    document.getElementById('lunar-month-info').textContent = `${monthName} năm ${lunar.year}`;
    
    // Cập nhật Can Chi
    document.getElementById('day-canchi').textContent = LunarCalendar.getDayCanChi(lunar.jd);
    document.getElementById('month-canchi').textContent = LunarCalendar.getMonthCanChi(lunar.month, lunar.year);
    document.getElementById('year-canchi').textContent = LunarCalendar.getYearCanChi(lunar.year);
    
    // Cập nhật năm con giáp
    const zodiac = LunarCalendar.getYearZodiac(lunar.year);
    const yearCanChi = LunarCalendar.getYearCanChi(lunar.year);
    document.getElementById('zodiac-icon').textContent = zodiac;
    document.getElementById('lunar-year-name').textContent = 'Năm ' + yearCanChi;
    // Thông tin Tiết khí & Giờ hoàng đạo
    const tietKhiEl = document.getElementById('tiet-khi');
    if (tietKhiEl && LunarCalendar.getSolarTerm) {
        const tk = LunarCalendar.getSolarTerm(lunar.jd);
        tietKhiEl.textContent = (tk ? tk.name : '—');
    } 
    // Kiểm tra ngày lễ
    const holidayInfo = document.getElementById('holiday-info');
    const solarKey = `${dd}/${mm}`;
    const lunarKey = `${lunar.day}/${lunar.month}`;
    
    let holiday = SOLAR_HOLIDAYS[solarKey] || LUNAR_HOLIDAYS[lunarKey];
    
    if (holiday) {
        holidayInfo.classList.remove('hidden');
        holidayInfo.querySelector('span').textContent = '🎉 ' + holiday;
    } else {
        holidayInfo.classList.add('hidden');
    }
    // Cập nhật danh sách sự kiện cá nhân của ngày
    renderDayEvents();
}

/**
 * Render lịch tháng
 */
function renderMonthCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Cập nhật tiêu đề
    document.getElementById('calendar-title').textContent = `Tháng ${viewMonth + 1} / ${viewYear}`;
    document.getElementById('month-select').value = viewMonth;
    document.getElementById('year-select').value = viewYear;
    
    // Tính ngày đầu tiên của tháng
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDay = firstDay.getDay(); // 0 = CN
    startDay = startDay === 0 ? 6 : startDay - 1; // Chuyển về T2 = 0
    
    // Số ngày trong tháng
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const today = new Date();

    // Hàm tạo 1 ô ngày
    function createCell({ year, monthIndex, day, isCurrentMonth }) {
        const date = new Date(year, monthIndex, day);
        const isToday = day === today.getDate() && monthIndex === today.getMonth() && year === today.getFullYear();
        const isSelected = day === selectedDate.getDate() && monthIndex === selectedDate.getMonth() && year === selectedDate.getFullYear();
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;

        const solarMonth = monthIndex + 1;
        const lunar = LunarCalendar.solar2Lunar(day, solarMonth, year);

        const solarKey = `${day}/${solarMonth}`;
        const lunarKey = `${lunar.day}/${lunar.month}`;
        const holiday = SOLAR_HOLIDAYS[solarKey] || LUNAR_HOLIDAYS[lunarKey];

        const dateKey = formatDateKeyFromParts(year, monthIndex, day);
        const dayEvents = personalEvents[dateKey] || [];

        // Style nền / chữ
        let bgClass = isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-60';
        let borderClass = 'border border-gray-100';
        let textClass = isCurrentMonth ? 'text-gray-800' : 'text-gray-400';
        let lunarTextClass = isCurrentMonth ? 'text-gray-500' : 'text-gray-400';

        if (isToday && isCurrentMonth) {
            bgClass = 'bg-sky-300 text-white';
            textClass = 'text-white';
            lunarTextClass = 'text-sky-100';
        } else if (isSunday && isCurrentMonth) {
            bgClass = 'bg-yellow-200 text-white';
            textClass = 'text-red-600';
        } else if (isSaturday && isCurrentMonth) {
            textClass = 'text-sky-500';
        }

        if (isSelected && isCurrentMonth && !isToday) {
            borderClass = 'border-2 border-sky-400';
            bgClass = 'bg-sky-100';
        }

        let lunarDisplay = lunar.day;
        if (lunar.day === 1 || lunar.day === 15) {
            lunarDisplay = `${lunar.day}/${lunar.month}`;
            lunarTextClass = (isCurrentMonth ? 'text-red-700' : 'text-red-500') + ' font-bold';
        }

        // Các chip sự kiện / ngày lễ
        let chipsHtml = '';

        // Chip ngày lễ (màu xanh lá)
        if (holiday) {
            chipsHtml += `
                <div class="mt-0.5 sm:mt-1 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] sm:text-[10px] md:text-[11px] font-medium max-w-full truncate"
                    title="${holiday}">
                    ${holiday}
                </div>
            `;
        }

        // Chip sự kiện cá nhân (màu xanh dương nhạt)
        if (dayEvents.length) {
            const maxShow = 3;

            dayEvents.slice(0, maxShow).forEach(ev => {
                const title = ev.title || '';
                chipsHtml += `
                    <div class="mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[9px] sm:text-[10px] md:text-[11px] font-medium max-w-full truncate border border-sky-200"
                        title="${title}">
                        ${title}
                    </div>
                `;
            });

            if (dayEvents.length > maxShow) {
                chipsHtml += `
                    <div class="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] text-gray-400">
                        +${dayEvents.length - maxShow} sự kiện nữa
                    </div>
                `;
            }
        }

        return `
            <div class="calendar-day p-1.5 sm:p-2 md:p-3 min-h-[90px] sm:min-h-[110px] md:min-h-[130px] rounded-xl ${bgClass} ${borderClass} cursor-pointer flex flex-col"
                onclick="selectDate(${year}, ${monthIndex}, ${day})">
                <!-- Hàng tiêu đề ngày: trên mobile dương lịch trên, âm lịch dưới -->
                <div class="flex flex-col md:flex-row md:items-baseline md:justify-between gap-0.5 md:gap-1">
                    <div class="text-sm sm:text-base md:text-lg font-semibold ${textClass} leading-none">${day}</div>
                    <div class="text-[11px] sm:text-xs ${lunarTextClass} leading-none">${lunarDisplay}</div>
                </div>

                <!-- Khu vực hiển thị chip sự kiện -->
                <div class="mt-1 sm:mt-1.5 flex-1 flex flex-col overflow-hidden">
                    ${chipsHtml}
                </div>
            </div>
        `;
    }

    // Ô tháng trước
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
        grid.innerHTML += createCell({ year: prevYear, monthIndex: prevMonthIndex, day, isCurrentMonth: false });
    }

    // Ô tháng hiện tại
    for (let day = 1; day <= daysInMonth; day++) {
        grid.innerHTML += createCell({ year: viewYear, monthIndex: viewMonth, day, isCurrentMonth: true });
    }

    // Ô tháng sau
    const totalCells = startDay + daysInMonth;
    const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;

    for (let i = 1; i <= remainingCells; i++) {
        const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        grid.innerHTML += createCell({ year: nextYear, monthIndex: nextMonthIndex, day: i, isCurrentMonth: false });
    }
}

/**
 * Render danh sách ngày lễ
 */
function renderHolidayList() {
    const container = document.getElementById('holiday-list');
    document.getElementById('holiday-year').textContent = viewYear;
    container.innerHTML = '';
    
    // Sắp xếp ngày lễ dương lịch theo thứ tự
    const sortedSolarHolidays = Object.entries(SOLAR_HOLIDAYS).sort((a, b) => {
        const [d1, m1] = a[0].split('/').map(Number);
        const [d2, m2] = b[0].split('/').map(Number);
        return m1 - m2 || d1 - d2;
    });
    
    // Ngày lễ Dương lịch
    for (const [date, name] of sortedSolarHolidays) {
        const [d, m] = date.split('/');
        container.innerHTML += `
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div class="w-12 h-12 bg-sky-100 rounded-2xl flex flex-col items-center justify-center flex-shrink-0">
                    <span class="text-[10px] text-sky-600 leading-none">T${m}</span>
                    <span class="text-xl font-bold text-sky-700 leading-none mt-0.5">${d}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-700 truncate">${name}</div>
                    <div class="text-sm text-gray-500">Dương lịch</div>
                </div>
            </div>
        `;
    }
    
    // Một số ngày lễ Âm lịch quan trọng
    const importantLunarHolidays = ['1/1', '10/3', '15/8'];
    for (const date of importantLunarHolidays) {
        const name = LUNAR_HOLIDAYS[date];
        const [d, m] = date.split('/');
        // Chuyển sang dương lịch
        const solar = LunarCalendar.lunar2Solar(parseInt(d), parseInt(m), viewYear, 0);
        if (solar[0] > 0) {
            container.innerHTML += `
                <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <div class="w-12 h-12 bg-amber-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span class="text-[10px] text-amber-600 leading-none">${d}/${m}</span>
                        <span class="text-lg font-bold text-amber-700 leading-none mt-0.5">ÂL</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-700 truncate">${name}</div>
                        <div class="text-sm text-gray-500">Âm lịch (DL: ${solar[0]}/${solar[1]}/${solar[2]})</div>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * ========== SEASONAL FALLING ICONS ==========
 */
function startSeasonalFall() {
    const containerId = 'falling-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'falling-container';
        document.body.appendChild(container);
    }

    const month = new Date().getMonth() + 1; // 1-12
    const season = getSeasonForMonth(month);
    const iconSet = getIconSetForSeason(season);
    const maxIcons = 50;

    // helper: tạo một icon rơi
    const spawnIcon = () => {
        if (!iconSet.length) return;
        if (container.childElementCount > maxIcons) {
            container.removeChild(container.firstChild);
        }

        const el = document.createElement('span');
        el.className = 'falling-icon';
        el.textContent = iconSet[Math.floor(Math.random() * iconSet.length)];

        const startX = Math.random() * 100; // vw
        const duration = 8 + Math.random() * 6; // 8-14s
        const delay = Math.random() * 3; // 0-3s
        const size = 14 + Math.random() * 12; // px
        const drift = (Math.random() * 30 - 15).toFixed(1); // -15..15 deg

        el.style.left = `${startX}vw`;
        el.style.fontSize = `${size}px`;
        el.style.animationDuration = `${duration}s`;
        el.style.animationDelay = `${delay}s`;
        el.style.transform = `rotate(${drift}deg)`;

        container.appendChild(el);

        // cleanup sau khi rơi xong
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, (duration + delay) * 1000);
    };

    // sinh đều đặn
    spawnIcon();
    setInterval(spawnIcon, 300);
}

function getSeasonForMonth(month) {
    // Dễ chỉnh: cập nhật mốc tháng cho 4 mùa Việt Nam
    // Xuân: 1-3 (Tết), Hạ: 4-6, Thu: 7-9, Đông: 10-12
    if (month >= 1 && month <= 3) return 'spring';
    if (month >= 4 && month <= 6) return 'summer';
    if (month >= 7 && month <= 9) return 'autumn';
    return 'winter';
}

function getIconSetForSeason(season) {
    // Có thể thay emoji tại đây
    const map = {
        spring: ['🌸', '🌼', '🌺', '💮'], // hoa đào/mai tượng trưng
        summer: ['🍃', '🌿', '☘️'],
        autumn: ['🍂', '🍁', '🍂'],
        winter: ['❄️', '❅', '❆']
    };
    return map[season] || [];
}

/**
 * Chọn một ngày cụ thể
 */
function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    viewMonth = month;
    viewYear = year;
    updateDayCalendar();
    renderMonthCalendar();
}

/**
 * Chuyển ngày (phần Lịch Ngày)
 */
function changeDay(delta) {
    selectedDate.setDate(selectedDate.getDate() + delta);
    viewMonth = selectedDate.getMonth();
    viewYear = selectedDate.getFullYear();
    updateDayCalendar();
    renderMonthCalendar();
}

/**
 * Chuyển tháng (phần Lịch Tháng)
 */
function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    } else if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    }
    renderMonthCalendar();
    renderHolidayList();
}

/**
 * Xử lý khi thay đổi dropdown tháng/năm
 */
function onMonthYearChange() {
    viewMonth = parseInt(document.getElementById('month-select').value);
    viewYear = parseInt(document.getElementById('year-select').value);
    renderMonthCalendar();
    renderHolidayList();
}

/**
 * Quay về ngày hôm nay
 */
function goToToday() {
    selectedDate = new Date();
    viewMonth = selectedDate.getMonth();
    viewYear = selectedDate.getFullYear();
    updateDayCalendar();
    renderMonthCalendar();
    renderHolidayList();
}

/**
 * Cập nhật thời tiết (placeholder)
 */
function setWeatherDisplay(text, icon = '☁️') {
    const iconEl = document.getElementById('weather-icon');
    const textEl = document.getElementById('weather-text');
    if (!iconEl || !textEl) return;
    iconEl.textContent = icon;
    textEl.textContent = text;
}

let currentWeatherInfo = null; // lưu kết quả mới nhất

function mapAqiToStatus(aqi) {
    if (aqi == null || isNaN(aqi)) {
        return {
            label: 'Không có dữ liệu',
            color: 'text-gray-600',
            bg: 'bg-gray-100',
            emoji: '🌫'
        };
    }
    if (aqi <= 50) {
        return { label: 'Tốt',       color: 'text-green-700',  bg: 'bg-green-100',  emoji: '🟢' };
    }
    if (aqi <= 100) {
        return { label: 'Trung bình',color: 'text-yellow-700', bg: 'bg-yellow-100', emoji: '🟡' };
    }
    if (aqi <= 150) {
        return { label: 'Kém',       color: 'text-orange-700', bg: 'bg-orange-100', emoji: '🟠' };
    }
    if (aqi <= 200) {
        return { label: 'Xấu',       color: 'text-red-700',    bg: 'bg-red-100',    emoji: '🔴' };
    }
    return { label: 'Rất xấu',       color: 'text-purple-700', bg: 'bg-purple-100', emoji: '🟣' };
}

// Map mã thời tiết của Open-Meteo sang icon
function getWeatherIconFromCode(code) {
    if (code === 0) return '☀️';                      // Trời quang
    if (code === 1 || code === 2) return '🌤️';        // Ít mây
    if (code === 3) return '☁️';                      // Nhiều mây
    if (code >= 45 && code <= 48) return '🌫️';        // Sương mù
    if (code >= 51 && code <= 67) return '🌦️';        // Mưa phùn / mưa nhẹ
    if (code >= 71 && code <= 77) return '❄️';        // Tuyết
    if (code >= 80 && code <= 82) return '🌧️';        // Mưa rào
    if (code >= 95) return '⛈️';                      // Dông bão
    return '🌤️';
}

function updateWeather() {
    if (!navigator.geolocation) {
        const locEl = document.getElementById('weather-location');
        if (locEl) locEl.textContent = 'Trình duyệt không hỗ trợ định vị';
        return;
    }

    const locEl = document.getElementById('weather-location');
    if (locEl) locEl.textContent = 'Đang lấy vị trí...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            fetchWeatherAndAirQuality(lat, lon);
        },
        (err) => {
            console.error('Lỗi geolocation', err);
            const locEl2 = document.getElementById('weather-location');
            if (locEl2) {
                locEl2.textContent =
                    err.code === err.PERMISSION_DENIED
                        ? 'Bạn đã từ chối quyền vị trí'
                        : 'Không truy cập được vị trí';
            }
        },
        { enableHighAccuracy: false, timeout: 10000 }
    );
}

async function fetchWeatherAndAirQuality(lat, lon) {
    try {
        // WEATHER
        const weatherUrl =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}&longitude=${lon}` +
            `&current_weather=true` +
            `&hourly=relativehumidity_2m,precipitation_probability` +
            `&timezone=auto`;

        console.log('Weather URL:', weatherUrl);

        const weatherRes = await fetch(weatherUrl);
        const weatherText = await weatherRes.text();
        console.log('Weather status:', weatherRes.status);
        console.log('Weather raw body:', weatherText);

        if (!weatherRes.ok) {
            throw new Error('Weather HTTP ' + weatherRes.status);
        }

        const weatherData = JSON.parse(weatherText);
        const current = weatherData.current_weather;
        if (!current) throw new Error('No current_weather in response');

        const temp  = Math.round(current.temperature);
        const icon  = getWeatherIconFromCode(current.weathercode);
        const wind  = current.windspeed != null ? Math.round(current.windspeed) : null;

        // Độ ẩm + xác suất mưa: tìm giờ gần với current.time
        let humidity = null;
        let rainProb = null;
        try {
            const times  = weatherData.hourly.time;
            const hums   = weatherData.hourly.relativehumidity_2m;
            const rains  = weatherData.hourly.precipitation_probability || [];

            const nowMs = Date.parse(current.time);
            let bestIdx = 0;
            let bestDiff = Infinity;
            for (let i = 0; i < times.length; i++) {
                const tMs = Date.parse(times[i]);
                const diff = Math.abs(nowMs - tMs);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
            humidity = hums[bestIdx];
            rainProb = rains[bestIdx] != null ? rains[bestIdx] : null;
        } catch (e) {
            console.warn('Không lấy được độ ẩm/khả năng mưa chính xác:', e);
        }

        // AQI
        let aqi = null;
        let aqiInfo = mapAqiToStatus(null);
        try {
            const airUrl =
                `https://air-quality-api.open-meteo.com/v1/air-quality` +
                `?latitude=${lat}&longitude=${lon}` +
                `&hourly=us_aqi` +
                `&timezone=auto`;

            console.log('Air URL:', airUrl);
            const airRes = await fetch(airUrl);
            const airText = await airRes.text();
            console.log('Air status:', airRes.status);
            console.log('Air raw body:', airText);

            if (airRes.ok) {
                const airData = JSON.parse(airText);
                if (airData.hourly && Array.isArray(airData.hourly.us_aqi)) {
                    const arr = airData.hourly.us_aqi.filter(v => v != null);
                    if (arr.length) {
                        aqi = Math.round(arr[arr.length - 1]);
                        aqiInfo = mapAqiToStatus(aqi);
                    }
                }
            } else {
                console.warn('Air HTTP', airRes.status);
            }
        } catch (e) {
            console.warn('AQI fetch error:', e);
        }

        // TÊN THÀNH PHỐ: BigDataCloud (có CORS, không cần key)
        let city = 'Vị trí của bạn';
        try {
            const geoUrl =
                `https://api.bigdatacloud.net/data/reverse-geocode-client` +
                `?latitude=${lat}&longitude=${lon}&localityLanguage=vi`;

            console.log('Geo URL:', geoUrl);
            const geoRes = await fetch(geoUrl);
            const geoText = await geoRes.text();
            console.log('Geo status:', geoRes.status);
            console.log('Geo raw body:', geoText);

            if (geoRes.ok) {
                const geoData = JSON.parse(geoText);
                city = geoData.city ||
                       geoData.locality ||
                       geoData.principalSubdivision ||
                       city;
            }
        } catch (e) {
            console.warn('Geo fetch error:', e);
        }

        currentWeatherInfo = { city, temp, humidity, wind, rainProb, aqi, aqiInfo, icon };
        renderWeatherUI();
    } catch (err) {
        console.error('Weather error:', err);
        const locEl = document.getElementById('weather-location');
        if (locEl) {
            locEl.textContent = 'Không lấy được thời tiết (mở Console để xem lỗi)';
        }
    }
}

function renderWeatherUI() {
    if (!currentWeatherInfo) return;
    const { city, temp, humidity, wind, rainProb, aqi, aqiInfo, icon } = currentWeatherInfo;

    const tempStr = temp != null ? `${temp}°C` : '--°C';
    const humStr  = humidity != null ? `${humidity}%` : '--%';
    const windStr = wind != null ? `${wind} km/h` : '-- km/h';
    const rainStr = rainProb != null ? `${rainProb}%` : '--%';

    // Mini block trong Lịch Ngày
    const iconEl   = document.getElementById('weather-icon');
    const locEl    = document.getElementById('weather-location');
    const tempEl   = document.getElementById('weather-temp');
    const humEl    = document.getElementById('weather-humidity');
    const windEl   = document.getElementById('weather-wind');
    const rainEl   = document.getElementById('weather-rain');
    const aqiMini  = document.getElementById('weather-aqi-mini');

    if (iconEl) iconEl.textContent = icon || '☁️';
    if (locEl)  locEl.textContent  = city || 'Vị trí của bạn';
    if (tempEl) tempEl.textContent = `🌡 ${tempStr}`;
    if (humEl)  humEl.textContent  = `💧 ${humStr}`;
    if (windEl) windEl.textContent = `🍃 ${windStr}`;
    if (rainEl) rainEl.textContent = `🌧 ${rainStr}`;
    if (aqiMini) {
        const text = aqi != null
            ? `${aqiInfo.emoji} AQI ${aqi} – ${aqiInfo.label}`
            : '🌫 AQI -- – Không có dữ liệu';
        aqiMini.textContent = text;
        aqiMini.className = 'mt-0.5 text-[11px] ' + (aqiInfo.color || 'text-gray-600');
    }

    // Block chi tiết bên dưới Sự kiện cá nhân
    const dLoc   = document.getElementById('weather-detail-location');
    const dTemp  = document.getElementById('weather-detail-temp');
    const dHum   = document.getElementById('weather-detail-humidity');
    const dWind  = document.getElementById('weather-detail-wind');
    const dRain  = document.getElementById('weather-detail-rain');
    const dAqi   = document.getElementById('weather-detail-aqi');
    const dDesc  = document.getElementById('weather-detail-desc');

    if (dLoc)  dLoc.textContent  = city || 'Vị trí của bạn';
    if (dTemp) dTemp.textContent = `🌡 Nhiệt độ: ${tempStr}`;
    if (dHum)  dHum.textContent  = `💧 Độ ẩm: ${humStr}`;
    if (dWind) dWind.textContent = `🍃 Gió: ${windStr}`;
    if (dRain) dRain.textContent = `🌧 Khả năng mưa: ${rainStr}`;

    if (dAqi) {
        const text = aqi != null
            ? `${aqiInfo.emoji} AQI ${aqi} – ${aqiInfo.label}`
            : '🌫 AQI -- – Không có dữ liệu';
        dAqi.textContent = text;
        dAqi.className =
            'mt-2 inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ' +
            (aqiInfo.bg || 'bg-gray-100') + ' ' +
            (aqiInfo.color || 'text-gray-700');
    }
    if (dDesc) {
        dDesc.textContent = 'Dữ liệu Open‑Meteo (dự báo gần thời điểm hiện tại).';
    }
}

// Khởi chạy khi trang load xong
document.addEventListener('DOMContentLoaded', init);

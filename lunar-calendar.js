/**
 * =====================================================
 * LUNAR-CALENDAR.JS - Thư viện chuyển đổi Âm Dương lịch
 * =====================================================
 * Thuật toán dựa trên công trình của Hồ Ngọc Đức
 * Tham khảo: https://www.informatik.uni-leipzig.de/~duc/amlich/
 * Tính toán theo múi giờ Việt Nam (GMT+7)
 */

const LunarCalendar = (function() {
    'use strict';
    
    // ========== CONSTANTS ==========
    const PI = Math.PI;
    const TIMEZONE = 7.0; // Múi giờ Việt Nam
    
    // Thiên Can
    const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
    
    // Địa Chi  
    const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    // 24 tiết khí (theo kinh độ mặt trời, mỗi tiết 15 độ)
    const SOLAR_TERMS = [
        'Xuân phân','Thanh minh','Cốc vũ','Lập hạ','Tiểu mãn','Mang chủng',
        'Hạ chí','Tiểu thử','Đại thử','Lập thu','Xử thử','Bạch lộ',
        'Thu phân','Hàn lộ','Sương giáng','Lập đông','Tiểu tuyết','Đại tuyết',
        'Đông chí','Tiểu hàn','Đại hàn','Lập xuân','Vũ Thủy','Kinh Trập'
    ];
    // Con giáp
    const ZODIAC = ['🐀', '🐂', '🐅', '🐈', '🐉', '🐍', '🐴', '🐐', '🐵', '🐔', '🐕', '🐷'];
    
    // Tên tháng âm
    const LUNAR_MONTHS = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'];

    // ========== CORE FUNCTIONS ==========
    
    /**
     * Chuyển ngày dương lịch sang Julian Day Number
     * Công thức chuẩn theo lịch Gregory
     */
    function jdFromDate(dd, mm, yy) {
        const a = Math.floor((14 - mm) / 12);
        const y = yy + 4800 - a;
        const m = mm + 12 * a - 3;
        let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        if (jd < 2299161) {
            jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
        }
        return jd;
    }

    /**
     * Chuyển Julian Day Number sang ngày dương lịch
     */
    function jdToDate(jd) {
        let a, b, c, d, e, m, day, month, year;
        if (jd > 2299160) {
            a = jd + 32044;
            b = Math.floor((4 * a + 3) / 146097);
            c = a - Math.floor((b * 146097) / 4);
        } else {
            b = 0;
            c = jd + 32082;
        }
        d = Math.floor((4 * c + 3) / 1461);
        e = c - Math.floor((1461 * d) / 4);
        m = Math.floor((5 * e + 2) / 153);
        day = e - Math.floor((153 * m + 2) / 5) + 1;
        month = m + 3 - 12 * Math.floor(m / 10);
        year = b * 100 + d - 4800 + Math.floor(m / 10);
        return [day, month, year];
    }

    /**
     * Tính thời điểm Sóc (New Moon) thứ k
     * k = 0 tại 1900-01-06 00:14 GMT
     * Thuật toán: Astronomical Algorithms - Jean Meeus
     */
    function newMoon(k) {
        const T = k / 1236.85; // Time in Julian centuries from 1900 January 0.5
        const T2 = T * T;
        const T3 = T2 * T;
        const dr = PI / 180;
        
        // Mean new moon
        let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr); // Solar term
        
        // Sun's mean anomaly
        const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        // Moon's mean anomaly
        const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        // Moon's argument of latitude
        const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        
        // Corrections
        let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
        C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
        C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
        C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
        C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
        C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
        C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
        
        // Delta T correction
        let deltat;
        if (T < -11) {
            deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
        } else {
            deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
        }
        
        return Jd1 + C1 - deltat;
    }

    /**
     * Tính Kinh độ Mặt Trời (Sun Longitude) tại thời điểm Julian Day
     * Trả về số nguyên 0-11 (12 cung hoàng đạo, mỗi cung 30 độ)
     */
    function sunLongitude(jdn) {
        const T = (jdn - 2451545.0) / 36525; // Time in Julian centuries from J2000.0
        const T2 = T * T;
        const dr = PI / 180;
        
        // Mean longitude of the Sun
        const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
        // Mean anomaly of the Sun
        const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
        
        // Equation of center
        const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
        const C1 = (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr);
        const C2 = 0.000289 * Math.sin(3 * M * dr);
        
        // Sun's true longitude
        let theta = L0 + C + C1 + C2;
        
        // Normalize to 0-360
        theta = theta - 360 * Math.floor(theta / 360);
        
        // Return the zodiac index (0-11)
        return Math.floor(theta / 30);
    }

    /**
     * Tính Kinh độ Mặt Trời chính xác hơn (độ)
     */
    function sunLongitudeExact(jdn) {
        const T = (jdn - 2451545.0) / 36525;
        const T2 = T * T;
        const dr = PI / 180;
        
        const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
        const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
        
        const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
        const C1 = (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr);
        const C2 = 0.000289 * Math.sin(3 * M * dr);
        
        let theta = L0 + C + C1 + C2;
        theta = theta - 360 * Math.floor(theta / 360);
        
        return theta;
    }

    /**
     * Tìm ngày Sóc bắt đầu tháng 11 âm lịch (tháng chứa Đông Chí)
     */
    function getLunarMonth11(yy, timeZone) {
        // Đông chí thường xảy ra vào khoảng 21-22/12
        const off = jdFromDate(31, 12, yy) - 2415021;
        let k = Math.floor(off / 29.530588853);
        let nm = newMoon(k);
        const sunLong = sunLongitude(nm + 0.5 + timeZone / 24);
        
        // Tháng 11 âm phải chứa Đông Chí (kinh độ Mặt Trời = 270 độ, tức cung số 9)
        if (sunLong >= 9) {
            nm = newMoon(k - 1);
        }
        return Math.floor(nm + 0.5 + timeZone / 24);
    }

    /**
     * Xác định vị trí tháng nhuận trong năm âm lịch
     * Trả về offset của tháng nhuận (1-13), hoặc 0 nếu không có
     */
    function getLeapMonthOffset(a11, timeZone) {
        const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        let last = 0;
        let i = 1;
        let arc = sunLongitude(newMoon(k + i) + 0.5 + timeZone / 24);
        
        do {
            last = arc;
            i++;
            arc = sunLongitude(newMoon(k + i) + 0.5 + timeZone / 24);
        } while (arc !== last && i < 14);
        
        return i - 1;
    }

    /**
     * ========================================
     * CHUYỂN ĐỔI DƯƠNG LỊCH SANG ÂM LỊCH
     * ========================================
     * @param {number} dd - Ngày dương
     * @param {number} mm - Tháng dương (1-12)
     * @param {number} yy - Năm dương
     * @returns {Object} {day, month, year, leap, jd}
     */
    function solar2Lunar(dd, mm, yy) {
        const timeZone = TIMEZONE;
        const dayNumber = jdFromDate(dd, mm, yy);
        
        // Tìm tháng Sóc (đầu tháng âm) chứa ngày này
        const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
        let monthStart = Math.floor(newMoon(k + 1) + 0.5 + timeZone / 24);
        
        if (monthStart > dayNumber) {
            monthStart = Math.floor(newMoon(k) + 0.5 + timeZone / 24);
        }
        
        // Tìm tháng 11 âm của năm trước và năm này
        let a11 = getLunarMonth11(yy, timeZone);
        let b11 = a11;
        let lunarYear;
        
        if (a11 >= monthStart) {
            lunarYear = yy;
            a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
            lunarYear = yy + 1;
            b11 = getLunarMonth11(yy + 1, timeZone);
        }
        
        // Tính ngày âm
        const lunarDay = dayNumber - monthStart + 1;
        
        // Tính tháng âm
        const diff = Math.floor((monthStart - a11) / 29);
        let lunarLeap = 0;
        let lunarMonth = diff + 11;
        
        // Xử lý năm có tháng nhuận
        if (b11 - a11 > 365) {
            const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff === leapMonthDiff) {
                    lunarLeap = 1;
                }
            }
        }
        
        if (lunarMonth > 12) {
            lunarMonth = lunarMonth - 12;
        }
        
        if (lunarMonth >= 11 && diff < 4) {
            lunarYear -= 1;
        }
        
        return {
            day: lunarDay,
            month: lunarMonth,
            year: lunarYear,
            leap: lunarLeap,
            jd: dayNumber
        };
    }

    /**
     * ========================================
     * CHUYỂN ĐỔI ÂM LỊCH SANG DƯƠNG LỊCH
     * ========================================
     */
    function lunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap) {
        const timeZone = TIMEZONE;
        let a11, b11;
        
        if (lunarMonth < 11) {
            a11 = getLunarMonth11(lunarYear - 1, timeZone);
            b11 = getLunarMonth11(lunarYear, timeZone);
        } else {
            a11 = getLunarMonth11(lunarYear, timeZone);
            b11 = getLunarMonth11(lunarYear + 1, timeZone);
        }
        
        const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        let off = lunarMonth - 11;
        if (off < 0) {
            off += 12;
        }
        
        if (b11 - a11 > 365) {
            const leapOff = getLeapMonthOffset(a11, timeZone);
            let leapMonth = leapOff - 2;
            if (leapMonth < 0) {
                leapMonth += 12;
            }
            if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
                return [0, 0, 0];
            } else if (lunarLeap !== 0 || off >= leapOff) {
                off += 1;
            }
        }
        
        const monthStart = Math.floor(newMoon(k + off) + 0.5 + timeZone / 24);
        return jdToDate(monthStart + lunarDay - 1);
    }

    // ========== CAN CHI FUNCTIONS ==========

    /**
     * Tính Can Chi của ngày
     */
    function getDayCanChi(jd) {
        const stem = (jd + 9) % 10;
        const branch = (jd + 1) % 12;
        return CAN[stem] + ' ' + CHI[branch];
    }

    /**
     * Tính Can Chi của tháng
     * Can tháng phụ thuộc Can năm
     */
    function getMonthCanChi(lunarMonth, lunarYear) {
        // Công thức: Can tháng = (Can năm * 2 + Tháng) % 10
        const yearStem = (lunarYear + 6) % 10;
        const monthStem = (yearStem * 2 + lunarMonth + 1) % 10;
        const monthBranch = (lunarMonth + 1) % 12;
        return CAN[monthStem] + ' ' + CHI[monthBranch];
    }

    /**
     * Tính Can Chi của năm
     */
    function getYearCanChi(lunarYear) {
        const stem = (lunarYear + 6) % 10;
        const branch = (lunarYear + 8) % 12;
        return CAN[stem] + ' ' + CHI[branch];
    }

    /**
     * Lấy con giáp của năm
     */
    function getYearZodiac(lunarYear) {
        const branch = (lunarYear + 8) % 12;
        return ZODIAC[branch];
    }

    /**
     * Lấy tên tháng âm lịch
     */
    function getLunarMonthName(month, leap) {
        return (leap ? 'Nhuận ' : '') + 'Tháng ' + LUNAR_MONTHS[month - 1];
    }
    function getSolarTerm(jd) {
        const timeZone = TIMEZONE;
        const lon = sunLongitudeExact(jd + 0.5 - timeZone / 24); // kinh độ mặt trời (độ)
        let idx = Math.floor(lon / 15) % 24;
        if (idx < 0) idx += 24;
        return {
            index: idx,
            name: SOLAR_TERMS[idx],
            degree: lon
        };
    }

    // ========== PUBLIC API ==========
    return {
        solar2Lunar,
        lunar2Solar,
        getDayCanChi,
        getMonthCanChi,
        getYearCanChi,
        getYearZodiac,
        getLunarMonthName,
        getSolarTerm,
        SOLAR_TERMS,
        jdFromDate,
        jdToDate,
        CAN,
        CHI,
        ZODIAC,
        LUNAR_MONTHS
    };
})();
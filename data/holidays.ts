
import { CalendarEvent } from '../types2';

export interface Holiday {
    name: string;
    // Date in MM-DD format
    date: string; 
    emoji: string;
}

export const holidaysByCountry: Record<string, Holiday[]> = {
    "Japan": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Coming of Age Day", date: "01-13", emoji: "🧑" },
        { name: "Foundation Day", date: "02-11", emoji: "🇯🇵" },
        { name: "Shōwa Day", date: "04-29", emoji: "📜" },
        { name: "Golden Week Start", date: "04-29", emoji: "🌟" },
        { name: "Constitution Memorial Day", date: "05-03", emoji: "⚖️" },
        { name: "Greenery Day", date: "05-04", emoji: "🌳" },
        { name: "Children's Day", date: "05-05", emoji: "🎏" },
        { name: "Marine Day", date: "07-21", emoji: "🌊" },
        { name: "Mountain Day", date: "08-11", emoji: "⛰️" },
        { name: "Respect for the Aged Day", date: "09-15", emoji: "👴👵" },
        { name: "Autumnal Equinox Day", date: "09-22", emoji: "🍂" },
        { name: "Health and Sports Day", date: "10-13", emoji: "🏃‍♀️" },
        { name: "Culture Day", date: "11-03", emoji: "🎨" },
        { name: "Labor Thanksgiving Day", date: "11-23", emoji: "👨‍🏭" }
    ],
    "The UK": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Easter Monday", date: "04-21", emoji: "🐰" },
        { name: "Early May Bank Holiday", date: "05-05", emoji: "🌸" },
        { name: "Spring Bank Holiday", date: "05-26", emoji: "☀️" },
        { name: "Summer Bank Holiday", date: "08-25", emoji: "🍦" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" },
        { name: "Boxing Day", date: "12-26", emoji: "🎁" }
    ],
    "Brazil": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Carnival", date: "03-03", emoji: "🎭" },
        { name: "Carnival", date: "03-04", emoji: "🎭" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Tiradentes Day", date: "04-21", emoji: "🇧🇷" },
        { name: "Labour Day", date: "05-01", emoji: "👨‍🔧" },
        { name: "Corpus Christi", date: "06-19", emoji: "⛪" },
        { name: "Independence Day", date: "09-07", emoji: "🇧🇷" },
        { name: "Our Lady of Aparecida", date: "10-12", emoji: "🙏" },
        { name: "All Souls' Day", date: "11-02", emoji: "🕯️" },
        { name: "Republic Proclamation Day", date: "11-15", emoji: "📜" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ],
    "USA": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Martin Luther King, Jr. Day", date: "01-20", emoji: "✊" },
        { name: "Presidents' Day", date: "02-17", emoji: "🇺🇸" },
        { name: "Memorial Day", date: "05-26", emoji: "🎖️" },
        { name: "Juneteenth", date: "06-19", emoji: "⛓️" },
        { name: "Independence Day", date: "07-04", emoji: "🎆" },
        { name: "Labor Day", date: "09-01", emoji: "👨‍🏭" },
        { name: "Veterans Day", date: "11-11", emoji: "🇺🇸" },
        { name: "Thanksgiving Day", date: "11-27", emoji: "🦃" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ],
    "Canada": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Family Day", date: "02-17", emoji: "👨‍👩‍👧‍👦" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Victoria Day", date: "05-19", emoji: "👑" },
        { name: "Canada Day", date: "07-01", emoji: "🇨🇦" },
        { name: "Labour Day", date: "09-01", emoji: "👨‍🏭" },
        { name: "Thanksgiving", date: "10-13", emoji: "🦃" },
        { name: "Remembrance Day", date: "11-11", emoji: "🌺" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" },
        { name: "Boxing Day", date: "12-26", emoji: "🎁" }
    ],
    "Australia": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Australia Day", date: "01-26", emoji: "🇦🇺" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Easter Monday", date: "04-21", emoji: "🐰" },
        { name: "Anzac Day", date: "04-25", emoji: "🎖️" },
        { name: "Queen's Birthday", date: "06-09", emoji: "👑" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" },
        { name: "Boxing Day", date: "12-26", emoji: "🎁" }
    ],
    "Germany": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Easter Monday", date: "04-21", emoji: "🐰" },
        { name: "Labour Day", date: "05-01", emoji: "👨‍🏭" },
        { name: "Ascension Day", date: "05-29", emoji: "⛪" },
        { name: "Whit Monday", date: "06-09", emoji: "🕊️" },
        { name: "German Unity Day", date: "10-03", emoji: "🇩🇪" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" },
        { name: "St. Stephen's Day", date: "12-26", emoji: "🎁" }
    ],
    "France": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Easter Monday", date: "04-21", emoji: "🐰" },
        { name: "Labour Day", date: "05-01", emoji: "👨‍🏭" },
        { name: "Victory in Europe Day", date: "05-08", emoji: "🕊️" },
        { name: "Ascension Day", date: "05-29", emoji: "⛪" },
        { name: "Whit Monday", date: "06-09", emoji: "🕊️" },
        { name: "Bastille Day", date: "07-14", emoji: "🇫🇷" },
        { name: "Assumption Day", date: "08-15", emoji: "🙏" },
        { name: "All Saints' Day", date: "11-01", emoji: "🕯️" },
        { name: "Armistice Day", date: "11-11", emoji: "🌺" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ],
    "Spain": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Epiphany", date: "01-06", emoji: "👑" },
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Labour Day", date: "05-01", emoji: "👨‍🏭" },
        { name: "Assumption Day", date: "08-15", emoji: "🙏" },
        { name: "Hispanic Day", date: "10-12", emoji: "🇪🇸" },
        { name: "All Saints' Day", date: "11-01", emoji: "🕯️" },
        { name: "Constitution Day", date: "12-06", emoji: "📜" },
        { name: "Immaculate Conception", date: "12-08", emoji: "🙏" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ],
    "India": [
        { name: "Republic Day", date: "01-26", emoji: "🇮🇳" },
        { name: "Holi", date: "03-17", emoji: "🎨" }, // Varies
        { name: "Good Friday", date: "04-18", emoji: "✝️" },
        { name: "Independence Day", date: "08-15", emoji: "🇮🇳" },
        { name: "Gandhi Jayanti", date: "10-02", emoji: "🕊️" },
        { name: "Diwali", date: "10-23", emoji: "🪔" }, // Varies
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ],
    "China": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Chinese New Year", date: "01-31", emoji: "🧧" }, // Varies
        { name: "Qingming Festival", date: "04-05", emoji: "🙏" },
        { name: "Labour Day", date: "05-01", emoji: "👨‍🏭" },
        { name: "Dragon Boat Festival", date: "06-02", emoji: "🐉" }, // Varies
        { name: "Mid-Autumn Festival", date: "09-08", emoji: "🌕" }, // Varies
        { name: "National Day", date: "10-01", emoji: "🇨🇳" }
    ],
    "South Korea": [
        { name: "New Year's Day", date: "01-01", emoji: "🎉" },
        { name: "Korean New Year", date: "01-31", emoji: "🧧" }, // Varies
        { name: "Independence Movement Day", date: "03-01", emoji: "🇰🇷" },
        { name: "Children's Day", date: "05-05", emoji: "👦👧" },
        { name: "Buddha's Birthday", date: "05-06", emoji: "🙏" }, // Varies
        { name: "Memorial Day", date: "06-06", emoji: "🌺" },
        { name: "Liberation Day", date: "08-15", emoji: "🇰🇷" },
        { name: "Chuseok", date: "09-07", emoji: "🌕" }, // Varies
        { name: "National Foundation Day", date: "10-03", emoji: "🇰🇷" },
        { name: "Hangul Day", date: "10-09", emoji: "📜" },
        { name: "Christmas Day", date: "12-25", emoji: "🎄" }
    ]
};

export const getHolidaysForYear = (country: string, year: number): CalendarEvent[] => {
    const countryHolidays = holidaysByCountry[country] || [];
    return countryHolidays.map(holiday => ({
        id: `holiday-${country.replace(/\s/g, '')}-${holiday.name.replace(/\s/g, '')}-${year}`,
        title: `${holiday.emoji} ${holiday.name}`,
        date: `${year}-${holiday.date}`,
        color: '#10b981', // A consistent green for holidays
        emoji: holiday.emoji,
    }));
};

// A simplified map of country names to ISO 3166-1 alpha-2 codes
// In a real app, you'd use a more comprehensive library or a search-based API
const countryCodeMap: { [key: string]: string } = {
    'USA': 'US',
    'United States': 'US',
    'Spain': 'ES',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'France': 'FR',
    'Germany': 'DE',
    'Japan': 'JP',
    'Australia': 'AU',
    'Brazil': 'BR',
    'India': 'IN',
    'China': 'CN',
};

// Function to convert an ISO 3166-1 alpha-2 code to a flag emoji
const getEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

export const getFlagEmoji = (countryName: string): string => {
    if (!countryName) return '🏳️';
    const code = countryCodeMap[countryName] || Object.values(countryCodeMap).find(c => c === countryName.toUpperCase());
    return getEmoji(code || '');
};

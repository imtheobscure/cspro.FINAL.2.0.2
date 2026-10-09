
export const generateHash = (username: string): string => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and take first 8 chars. 
    // If hash is small, pad it? User said 5-8 letters.
    // toString(16) gives hex.
    return Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
};

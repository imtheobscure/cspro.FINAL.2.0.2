
export const fixJson = (jsonString: string): string => {
    if (!jsonString) return "";
    
    let fixed = jsonString.trim();

    // Remove markdown code blocks if present (robust regex)
    const jsonBlockMatch = fixed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch) {
        fixed = jsonBlockMatch[1].trim();
    } else {
        // Fallback for simple backticks without newlines or language
        if (fixed.startsWith('```')) fixed = fixed.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
    }
    
    fixed = fixed.trim();

    const startObj = fixed.indexOf('{');
    const startArr = fixed.indexOf('[');
    
    let startIdx = startObj;
    if (startArr !== -1 && (startObj === -1 || startArr < startObj)) {
        startIdx = startArr;
    }

    const endObj = fixed.lastIndexOf('}');
    const endArr = fixed.lastIndexOf(']');
    
    let endIdx = endObj;
    if (endArr !== -1 && (endObj === -1 || endArr > endObj)) {
        endIdx = endArr;
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        fixed = fixed.substring(startIdx, endIdx + 1);
    }

    return fixed.trim();
};

export const validateJson = (jsonString: string): { isValid: boolean; error?: string; parsed?: any } => {
    // 1. Try parsing the original string first (after basic cleanup)
    let cleaned = fixJson(jsonString);

    try {
        const parsed = JSON.parse(cleaned);
        return { isValid: true, parsed };
    } catch (e1) {
        // 2. Attempt to fix trailing commas (simple regex, might be risky but worth a try as fallback)
        const fixed = cleaned.replace(/,(\s*[}\]])/g, '$1');
        try {
            const parsed = JSON.parse(fixed);
            return { isValid: true, parsed };
        } catch (e2) {
             return { isValid: false, error: e1 instanceof Error ? e1.message : String(e1) };
        }
    }
};

export const formatJson = (jsonString: string): string => {
    const { isValid, parsed, error } = validateJson(jsonString);
    if (isValid) {
        return JSON.stringify(parsed, null, 2);
    }
    return jsonString; // Return original if invalid, maybe user wants to see it
};

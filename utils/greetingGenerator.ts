export const generateLocalGreetings = (name: string, interests: string, facts: string[]): string[] => {
    const cleanInterests = interests && interests.trim() ? interests : "exploring new things and developing your English skills";
    const cleanFact = facts && facts.length > 0 && facts[0] ? facts[0].replace(/^\[.*?\]\s*/, '') : "you are highly dedicated to self-improvement and learning";

    return [
        `Hey there, ${name}! I am absolutely thrilled to welcome you back to our learning space today. I was just thinking about how awesome it is that you're pursuing your interest in ${cleanInterests}, which is seriously impressive. Also, knowing that ${cleanFact}, it is clear you bring such a unique and wonderful background to our conversations. Let's dive in and have an amazing session filled with breakthroughs!`,
        `Hello, ${name}. It is a pleasure to connect with you again for today's lesson. As we continue to develop your fluency, we will keep your passion for ${cleanInterests} in mind to make our practice highly relevant. Your background, particularly your experience with ${cleanFact}, is an asset that helps us build sophisticated language skills. I look forward to our focused work today.`,
        `Hey ${name}, so good to see you today! I hope you've had a wonderful week. I'm really excited to chat with you today, especially since we can explore more about your love for ${cleanInterests}. Plus, I'm always super inspired by the fact that ${cleanFact}, which is just so cool. Grab a comfortable drink, settle in, and let's have a really relaxed, supportive conversation!`,
        `Welcome back, ${name}, the absolute legend of our virtual classroom! My virtual brain cells are throwing a tiny party because you are here. We are going to conquer the English language today, matching your stellar energy for ${cleanInterests}. I promise we'll keep things highly entertaining, especially since you are the person who ${cleanFact}, which gives you automatic elite status in my books. Let's make magic happen!`
    ];
};

export const generateLocalGoodbyes = (name: string, interests: string, facts: string[]): string[] => {
    const cleanInterests = interests && interests.trim() ? interests : "exploring new things and developing your English skills";
    const cleanFact = facts && facts.length > 0 && facts[0] ? facts[0].replace(/^\[.*?\]\s*/, '') : "you are highly dedicated to self-improvement and learning";

    return [
        `What an incredible effort you put in today, ${name}! You should be so proud of how far you've come. As you go about your day, try to connect what we learned with your interest in ${cleanInterests}. Keep remembering that ${cleanFact} is proof of your amazing ability to learn and adapt. Keep that momentum going, and I cannot wait to see you shine in our next session!`,
        `Fantastic session today, ${name}! Your commitment to expanding your vocabulary is highly commendable. To practice before our next meeting, I highly recommend reflecting on how today's grammar applies to your daily life, perhaps thinking about ${cleanFact}. It's these small, consistent steps that lead to massive fluency gains. Have a wonderful rest of your day, and take care!`,
        `Awesome job today, ${name}! We covered a lot of ground, and your conversation skills are sounding smoother every single time we meet. I hope you get some time to relax today and maybe enjoy a bit of ${cleanInterests}. Don't forget that you are doing fantastic work, especially given how cool it is that ${cleanFact}. Have an amazing week, and I'll catch you later!`,
        `Thank you for such a thoughtful and engaging session today, ${name}. Your insights on ${cleanInterests} really added a wonderful depth to our language exercises. It's clear that your unique perspective, especially regarding ${cleanFact}, allows you to express complex ideas beautifully. For a little post-class reflection, think about how you can use today's phrases in your next conversation. Until next time, keep exploring!`
    ];
};

export const categorizeFact = (factText: string): string => {
    const clean = factText.trim();
    // Check if it already has a category prefix like [Category]
    if (/^\[[a-zA-Z\s&]+\]/i.test(clean)) {
        return clean;
    }

    const lower = clean.toLowerCase();

    // Dates category check
    if (
        lower.includes("born in 19") ||
        lower.includes("born in 20") ||
        lower.includes("born on") ||
        lower.includes("birthday") ||
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(lower) ||
        /\b(19\d\d|20\d\d)\b/.test(lower) ||
        lower.includes("years old") ||
        lower.includes("age is") ||
        lower.includes("age:")
    ) {
        return `[Dates] ${clean}`;
    }

    // Likes & Dislikes check
    if (
        lower.includes("like ") ||
        lower.includes("likes ") ||
        lower.includes("love ") ||
        lower.includes("loves ") ||
        lower.includes("hate ") ||
        lower.includes("hates ") ||
        lower.includes("dislike") ||
        lower.includes("enjoy") ||
        lower.includes("passion") ||
        lower.includes("fond of") ||
        lower.includes("fan of") ||
        lower.includes("interested in")
    ) {
        return `[Likes & Dislikes] ${clean}`;
    }

    // Work check
    if (
        lower.includes("work") ||
        lower.includes("job") ||
        lower.includes("career") ||
        lower.includes("company") ||
        lower.includes("boss") ||
        lower.includes("office") ||
        lower.includes("engineer") ||
        lower.includes("designer") ||
        lower.includes("developer") ||
        lower.includes("teacher") ||
        lower.includes("doctor") ||
        lower.includes("manager") ||
        lower.includes("profession") ||
        lower.includes("employed") ||
        lower.includes("business")
    ) {
        return `[Work] ${clean}`;
    }

    // Places check
    if (
        lower.includes("live") ||
        lower.includes("lives") ||
        lower.includes("living") ||
        lower.includes("visit") ||
        lower.includes("travel") ||
        lower.includes("from ") ||
        lower.includes("country") ||
        lower.includes("city") ||
        lower.includes("town") ||
        lower.includes("apartment") ||
        lower.includes("house") ||
        lower.includes("chicago") ||
        lower.includes("london") ||
        lower.includes("paris") ||
        lower.includes("tokyo")
    ) {
        return `[Places] ${clean}`;
    }

    // People check
    if (
        lower.includes("brother") ||
        lower.includes("sister") ||
        lower.includes("mother") ||
        lower.includes("father") ||
        lower.includes("son") ||
        lower.includes("daughter") ||
        lower.includes("wife") ||
        lower.includes("husband") ||
        lower.includes("friend") ||
        lower.includes("colleague") ||
        lower.includes("partner") ||
        lower.includes("kid") ||
        lower.includes("child") ||
        lower.includes("mom") ||
        lower.includes("dad") ||
        lower.includes("parents") ||
        lower.includes("family") ||
        lower.includes("relative") ||
        lower.includes("cousin")
    ) {
        return `[People] ${clean}`;
    }

    // Things check
    if (
        lower.includes("car ") ||
        lower.includes("computer") ||
        lower.includes("phone") ||
        lower.includes("object") ||
        lower.includes("item") ||
        lower.includes("possess") ||
        lower.includes("owns ") ||
        lower.includes("has a ") ||
        lower.includes("bought") ||
        lower.includes("toy") ||
        lower.includes("gadget")
    ) {
        return `[Things] ${clean}`;
    }

    // Life check
    if (
        lower.includes("dog") ||
        lower.includes("cat") ||
        lower.includes("pet") ||
        lower.includes("habit") ||
        lower.includes("routine") ||
        lower.includes("health") ||
        lower.includes("hobby") ||
        lower.includes("hobbies") ||
        lower.includes("exercise") ||
        lower.includes("weekend") ||
        lower.includes("morning") ||
        lower.includes("night") ||
        lower.includes("sport")
    ) {
        return `[Life] ${clean}`;
    }

    return `[Other] ${clean}`;
};


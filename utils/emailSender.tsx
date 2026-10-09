import { Learner } from '../types2';
import { generateSingleAIChatMessage } from '../services/geminiService2';
import { useLearnerStore } from '../store/useLearnerStore';

const openEmailClient = (to: string, subject: string, body: string) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
};

interface EmailPayload {
    learner: Learner;
    topic: string; // e.g., "Your Progress Report"
    subject: string;
    bodyContent: string;
}

export const sendEmailWithAIGreeting = async ({ learner, topic, subject, bodyContent }: EmailPayload): Promise<void> => {
    if (!learner.email) {
        alert("This learner does not have an email address set in their profile.");
        return;
    }

    try {
        const greeting = await generateSingleAIChatMessage({ learner, topic });
        
        if (greeting) {
            // Use the action from the store to add the message to the latest session's chat log
            useLearnerStore.getState().addChatMessageToLearner(learner.id, greeting);
            
            const fullBody = `${greeting}\n\n---\n\n${bodyContent}`;
            openEmailClient(learner.email, subject, fullBody);
        } else {
            // Fallback if AI fails to generate a message
            const fullBody = `Hi ${learner.name},\n\nHere is your ${topic}:\n\n---\n\n${bodyContent}`;
            openEmailClient(learner.email, subject, fullBody);
        }
    } catch (error) {
        console.error("Failed to send email with AI greeting:", error);
        alert("An error occurred while preparing the email. Sending without a custom greeting.");
        // Fallback to a simple email on any error
        const fullBody = `Hi ${learner.name},\n\nHere is your ${topic}:\n\n---\n\n${bodyContent}`;
        openEmailClient(learner.email, subject, fullBody);
    }
};

/**
 * Interactive Lesson mock — "Load Mock Data" for the 🎓 Interactive Lesson type
 * in Lessons > Lesson Creator, and the source for the pre-generated
 * Gallery sample (built via `npx tsx tools/build_interactive_lesson.ts`).
 *
 * Schema matches utils/interactiveLessonHtmlGenerator.ts (InteractiveLessonData).
 * HTML fragments follow the Duolingo class contract from
 * utils/manual_prompts/interactive_lesson.ts — no <script>, no inline handlers:
 * the player wires all interactions itself.
 */

export const buildInteractiveLessonMock = (learnerName?: string, level?: string) => ({
    title: 'Daily Routines — Present Simple',
    unit: 'Unit 3',
    learner: {
        name: learnerName || 'David',
        level: level || 'A2-B1',
        nativeLanguage: 'Spanish',
        xp: 120,
        streak: 5,
        gems: 50,
    },
    studyHtml: `
<div>
  <div class="callout callout-objective"><strong>🎯 Learning Objective</strong><br>By the end of this lesson, you will be able to talk about daily routines using the Present Simple tense with correct adverbs of frequency.</div>
  <div class="callout callout-success"><strong>🏆 Success Criteria</strong><br>✅ I can use the Present Simple to describe habits and routines<br>✅ I can correctly place adverbs of frequency in sentences<br>✅ I can ask and answer questions about daily routines</div>
  <h1>Unit 3: Daily Routines 🌅</h1>
  <div class="callout callout-idea"><strong>💡 Key Idea</strong><br>We use the <strong>Present Simple</strong> tense to talk about things that happen <em>regularly</em>, <em>always</em>, or are <em>generally true</em>.<br><br><strong>Examples:</strong> I <u>wake up</u> at 7 AM. She <u>drinks</u> coffee every morning.</div>
  <h2>🔍 Vocabulary: Daily Routine Actions</h2>
  <div class="callout callout-vocab"><strong>🔍 Vocabulary Spotlight</strong><br>
    <table><tr><th>Word</th><th>Meaning</th><th>Example</th><th>🔊</th></tr>
    <tr><td><strong>wake up</strong></td><td>to stop sleeping</td><td data-tts="true">I wake up at 6:30 AM.</td><td><button class="speaker-btn" data-speak="wake up">🔊</button></td></tr>
    <tr><td><strong>get dressed</strong></td><td>to put on clothes</td><td data-tts="true">She gets dressed quickly.</td><td><button class="speaker-btn" data-speak="get dressed">🔊</button></td></tr>
    <tr><td><strong>have breakfast</strong></td><td>to eat the morning meal</td><td data-tts="true">We have breakfast at 7 AM.</td><td><button class="speaker-btn" data-speak="have breakfast">🔊</button></td></tr>
    <tr><td><strong>commute</strong></td><td>to travel to work/school</td><td data-tts="true">He commutes by train.</td><td><button class="speaker-btn" data-speak="commute">🔊</button></td></tr>
    <tr><td><strong>take a shower</strong></td><td>to wash yourself</td><td data-tts="true">I take a shower every morning.</td><td><button class="speaker-btn" data-speak="take a shower">🔊</button></td></tr>
    <tr><td><strong>go to bed</strong></td><td>to go sleep</td><td data-tts="true">I go to bed at 10 PM.</td><td><button class="speaker-btn" data-speak="go to bed">🔊</button></td></tr>
    </table></div>
  <div class="callout callout-pronunciation"><strong>🗣️ Pronunciation Tip</strong><br><strong>"breakfast"</strong> = /ˈbrek.fəst/<br>The "ea" sounds like "e" in "bed". Say it: <button class="speaker-btn" data-speak="breakfast, breakfast, I have breakfast at seven">🔊 Practice</button></div>
  <div class="activity">
    <h3>📝 Activity 1: Match the Vocabulary</h3><p>Click the correct meaning for each word:</p>
    <div style="margin:12px 0"><p><strong>1. "commute"</strong></p>
      <div data-answer="travel" data-correct="true" data-activity="vocab_1" data-category="vocab" data-feedback="Correct! 'Commute' means to travel regularly between home and work or school." class="option">a) to travel to work/school regularly</div>
      <div data-answer="eat" data-correct="false" data-activity="vocab_1" data-category="vocab" data-feedback="Not quite! 'Commute' means to travel to work/school. The morning meal is 'have breakfast'." class="option">b) to eat a meal</div>
      <div data-answer="sleep" data-correct="false" data-activity="vocab_1" data-category="vocab" data-feedback="Not right! 'Commute' means to travel. 'Go to bed' means to go sleep." class="option">c) to go to sleep</div>
    </div>
    <div style="margin:12px 0"><p><strong>2. "get dressed"</strong></p>
      <div data-answer="clothes" data-correct="true" data-activity="vocab_2" data-category="vocab" data-feedback="Yes! 'Get dressed' means to put on your clothes." class="option">a) to put on clothes</div>
      <div data-answer="takeoff" data-correct="false" data-activity="vocab_2" data-category="vocab" data-feedback="That's the opposite! Taking clothes OFF is 'get undressed'." class="option">b) to take off clothes</div>
    </div>
  </div>
  <div class="activity" data-activity-id="gaps-a">
    <h3>✍️ Activity 2: Complete the Sentences</h3><p>Type the correct form, then press Enter or Check:</p>
    <p>1. She <input class="gap-input" data-correct-answer="wakes" data-activity="gap_1" placeholder="(wake)"> up at 6 AM every day.</p>
    <p>2. They <input class="gap-input" data-correct-answer="don't eat" data-activity="gap_2" placeholder="(not eat)"> breakfast on weekdays.</p>
    <p>3. <input class="gap-input" data-correct-answer="Does" data-activity="gap_3" placeholder="(?)"> he take the bus to work?</p>
    <button class="btn btn-primary" data-check-activity="gaps-a">✅ Check All Answers</button>
  </div>
  <div class="callout callout-grammar"><strong>📐 Grammar Focus</strong><br><strong>Affirmative:</strong> I/You/We/They + verb → "I wake up at 7." &nbsp;|&nbsp; He/She/It + verb+s → "She wakes up."<br><strong>Negative:</strong> don't / doesn't + verb<br><strong>Question:</strong> Do / Does + subject + verb?</div>
  <div class="callout callout-warning"><strong>⚠️ Language Warning</strong><br>❌ "She don't like coffee." → ✅ "She <strong>doesn't</strong> like coffee." — He/She/It always uses doesn't!</div>
  <div class="callout callout-question"><strong>❓ Quick Question</strong><br>Which is correct: "She go to school" or "She goes to school"?<div class="reveal">✅ "She <strong>goes</strong> to school" — He/She/It needs the -s ending!</div></div>
  <div class="activity">
    <h3>🧠 Activity 3: Choose the Correct Answer</h3>
    <p><strong>1. Maria _____ to work by bus every day.</strong></p>
    <div data-answer="go" data-correct="false" data-activity="mc_1" data-category="grammar" data-feedback="Remember: Maria is 'she', so we need the -s form: goes." class="option">a) go</div>
    <div data-answer="goes" data-correct="true" data-activity="mc_1" data-category="grammar" data-feedback="Excellent! 'Maria' = she, so we add -es: 'goes'." class="option">b) goes</div>
    <div data-answer="going" data-correct="false" data-activity="mc_1" data-category="grammar" data-feedback="'Going' is the -ing form. For routines, use Present Simple: goes." class="option">c) going</div>
    <p><strong>2. He _____ coffee. He prefers tea.</strong></p>
    <div data-answer="dont" data-correct="false" data-activity="mc_2" data-category="grammar" data-feedback="'He' needs 'doesn't'. Don't = I/you/we/they." class="option">a) don't drink</div>
    <div data-answer="doesnt-s" data-correct="false" data-activity="mc_2" data-category="grammar" data-feedback="Almost! After 'doesn't', use the BASE form: doesn't drink (no -s!)." class="option">b) doesn't drinks</div>
    <div data-answer="doesnt" data-correct="true" data-activity="mc_2" data-category="grammar" data-feedback="Perfect! 'He doesn't drink coffee.'" class="option">c) doesn't drink</div>
  </div>
  <div class="callout callout-story" data-tts="true"><strong>📖 Story Box — Maria's Day</strong><br>Hi! My name is Maria. I <strong>usually wake up</strong> at 6:30 AM. First, I <strong>take a shower</strong> and <strong>get dressed</strong>. I <strong>always have</strong> breakfast — usually cereal and orange juice. I <strong>commute</strong> to university by metro. <button class="speaker-btn" data-speak="Hi! My name is Maria. I usually wake up at 6:30 AM. First, I take a shower and get dressed. I always have breakfast.">🔊</button></div>
  <div class="activity">
    <h3>📖 Activity 4: Reading Comprehension</h3>
    <p><strong>1. What time does Maria wake up?</strong></p>
    <div data-answer="630" data-correct="true" data-activity="read_1" data-category="reading" data-feedback="Correct! The text says 'I usually wake up at 6:30 AM.'" class="option">a) 6:30 AM</div>
    <div data-answer="700" data-correct="false" data-activity="read_1" data-category="reading" data-feedback="Look again! The text says 6:30, not 7:00." class="option">b) 7:00 AM</div>
    <p><strong>2. How does Maria commute?</strong></p>
    <div data-answer="metro" data-correct="true" data-activity="read_2" data-category="reading" data-feedback="That's right! 'I commute to university by metro.'" class="option">a) By metro</div>
    <div data-answer="bus" data-correct="false" data-activity="read_2" data-category="reading" data-feedback="Look again! Maria commutes by metro, not bus." class="option">b) By bus</div>
  </div>
</div>`,
    speakHtml: `
<div>
  <h1>🗣️ Speaking Activities</h1>
  <div class="callout callout-objective"><strong>🎯 Speaking Goal</strong><br>Practice talking about daily routines fluently and naturally. Use Present Simple and adverbs of frequency.</div>
  <div class="activity">
    <h3>⏱️ One-Minute Challenge: My Morning Routine</h3>
    <p>Talk for <strong>one minute</strong> about your morning routine. Use these prompts:</p>
    <ul><li>What time do you wake up?</li><li>Do you take a shower in the morning or at night?</li><li>What do you have for breakfast?</li><li>How do you commute to school or work?</li></ul>
    <div data-answer="fluent" data-correct="true" data-activity="speak_1min" data-category="speaking" data-feedback="Great self-assessment! Keep practicing!" class="option">🌟 I spoke fluently</div>
    <div data-answer="ok" data-correct="true" data-activity="speak_1min_ok" data-category="speaking" data-feedback="Good awareness! The more you practice, the smoother it gets!" class="option">👍 I managed but paused a lot</div>
  </div>
  <div class="activity">
    <h3>👂 Shadowing Practice — with Real-Time Feedback</h3>
    <p>Listen to each sentence, then tap 🎙️ Shadow and say it immediately. Your speech is compared word-by-word!</p>
    <div id="il-shadowing"></div>
    <div data-shadowing="I usually wake up at seven o'clock.|She always has breakfast before school.|They don't often go to bed late.|Does he sometimes take the train to work?|We never skip breakfast on weekends."></div>
  </div>
</div>`,
    practiceHtml: `
<div>
  <h1>🏋️ Practice Zone</h1>
  <div class="callout callout-challenge"><strong>⚔️ Boss Challenge</strong><br>Complete all four practice rounds to beat the Daily Routines boss!</div>
  <div class="activity">
    <h3>🎧 Round 1: Dictation — Listen &amp; Type</h3>
    <p>Listen, then type exactly what you hear:</p>
    <div id="il-dictation"></div>
    <div data-dictation="I usually wake up at seven o'clock in the morning.|She always has breakfast before she goes to school.|They don't often go to bed late on weekdays.|Does he sometimes take the train to work?"></div>
  </div>
  <div class="activity" data-activity-id="scr">
    <h3>🔀 Round 2: Unscramble the Sentence</h3>
    <p><strong>1.</strong> breakfast / has / always / She</p>
    <p>She <input class="gap-input" data-correct-answer="always has breakfast" data-activity="scr_1" placeholder="? ? ?">.</p>
    <p><strong>2.</strong> to / does / How / work / go / he</p>
    <p><input class="gap-input" data-correct-answer="How does he go to work" data-activity="scr_2" placeholder="? ? ? ? ? ?">?</p>
    <button class="btn btn-primary" data-check-activity="scr">✅ Check Answers</button>
  </div>
  <div class="activity">
    <h3>❓ Round 3: Grammar Boss Battle</h3>
    <p><strong>1. My sister _____ TV every evening.</strong></p>
    <div data-answer="watch" data-correct="false" data-activity="prac_1" data-category="grammar" data-feedback="'My sister' is she — she watches!" class="option">a) watch</div>
    <div data-answer="watches" data-correct="true" data-activity="prac_1" data-category="grammar" data-feedback="Correct! watch ends in -ch, so we add -es: watches." class="option">b) watches</div>
    <div data-answer="watching" data-correct="false" data-activity="prac_1" data-category="grammar" data-feedback="'Watching' is -ing. For routines use: watches." class="option">c) watching</div>
    <p><strong>2. _____ they play football on Saturdays?</strong></p>
    <div data-answer="do" data-correct="true" data-activity="prac_2" data-category="grammar" data-feedback="Correct! They + do = 'Do they play...?'" class="option">a) Do</div>
    <div data-answer="does" data-correct="false" data-activity="prac_2" data-category="grammar" data-feedback="'Does' is for he/she/it. 'They' needs Do." class="option">b) Does</div>
  </div>
  <div class="activity">
    <h3>🏆 Round 4: Final Review — Your Routine</h3>
    <p>Write 3 sentences about <strong>your</strong> routine. Use at least one adverb (always, usually, never).</p>
    <p>1. I <input class="gap-input" data-correct-answer="*" data-activity="free_1" placeholder="usually...">.</p>
    <p>2. I <input class="gap-input" data-correct-answer="*" data-activity="free_2" placeholder="never...">.</p>
    <p>3. I <input class="gap-input" data-correct-answer="*" data-activity="free_3" placeholder="always...">.</p>
    <div class="callout callout-teacher"><strong>💡 Note</strong><br>The star (*) accepts any answer — this round is about producing your own sentences!</div>
  </div>
</div>`,
});

export const buildInteractiveLessonMockJson = (learner?: { name?: string; cefrLevel?: string }): string =>
    JSON.stringify(
        buildInteractiveLessonMock(learner?.name, learner?.cefrLevel),
        null,
        2,
    );

const defaultLessonData = {
  topic: "The Digital Age: Navigating Modern Technology",
  level: "B1",
  theme: "Technology & Society",

  warmup: [
    {
      question: "Do you use your smartphone more than 4 hours a day?",
      answer: "Most adults globally spend 4–6 hours daily on their phones. This is equivalent to over 60 days per year! Research shows that excessive screen time can reduce sleep quality and attention span.",
      emoji: "📱"
    },
    {
      question: "Can you name three things you did this week that required the internet?",
      answer: "Common answers include: online shopping, video calls with family, streaming music or TV, reading news, using navigation apps, and sending messages. The internet has become essential to modern daily life.",
      emoji: "🌐"
    },
    {
      question: "What would you do if you had no internet for one entire week?",
      answer: "Interesting thought experiment! You might read physical books, spend more time outdoors, cook new recipes, or have face-to-face conversations. Many people report feeling initially anxious but later peaceful without constant connectivity.",
      emoji: "🤔"
    },
    {
      question: "Is technology making humans more connected or more isolated?",
      answer: "Both perspectives are valid! Technology connects us globally but can create local disconnection. Studies show that while social media increases weak social ties, it may reduce the quality of close relationships if overused.",
      emoji: "🔗"
    }
  ],

  keywords: [
    { term: "digital literacy", definition: "The ability to use digital technology effectively and safely", example: "Digital literacy is now considered as important as reading and writing.", level: "B1" },
    { term: "algorithm", definition: "A set of rules a computer follows to solve a problem or make decisions", example: "The social media algorithm decided which posts you see first.", level: "B1" },
    { term: "screen time", definition: "The amount of time spent using a device with a screen", example: "Doctors recommend limiting screen time for children under 12.", level: "B1" },
    { term: "connectivity", definition: "The state of being connected, especially to the internet", example: "Poor connectivity in rural areas is a growing concern.", level: "B1" },
    { term: "bandwidth", definition: "The maximum rate of data transfer across a network", example: "Streaming HD videos requires high bandwidth.", level: "B1" },
    { term: "cybersecurity", definition: "Protection of computer systems from digital attacks", example: "Companies invest millions in cybersecurity to protect customer data.", level: "B1" },
    { term: "cloud storage", definition: "Saving files on remote servers accessible via the internet", example: "I back up my photos to cloud storage automatically.", level: "B1" },
    { term: "artificial intelligence", definition: "Computer systems that can perform tasks that normally require human intelligence", example: "Artificial intelligence is used to detect fraud in banking.", level: "B1" },
    { term: "social media fatigue", definition: "Exhaustion caused by excessive use of social networking sites", example: "Many people take social media breaks due to social media fatigue.", level: "B1" },
    { term: "digital footprint", definition: "The trail of data you leave when using the internet", example: "Your digital footprint includes every website you have ever visited.", level: "B2" },
    { term: "tech-savvy", definition: "Well-informed about and able to use modern technology", example: "Being tech-savvy is a major advantage in today's job market.", level: "B1" },
    { term: "obsolete", definition: "No longer produced or used; out of date", example: "Fax machines have become largely obsolete in most offices.", level: "B2" },
    { term: "seamless integration", definition: "When different systems work together smoothly without friction", example: "The app offers seamless integration with your calendar and email.", level: "B2" },
    { term: "disruptive technology", definition: "Innovation that significantly alters or replaces an existing market", example: "Smartphones were a disruptive technology that replaced cameras and maps.", level: "B2" },
    { term: "misinformation", definition: "False or inaccurate information, especially spread online", example: "Misinformation about health topics spreads rapidly on social networks.", level: "B1" },
    { term: "echo chamber", definition: "An environment where a person only encounters beliefs similar to their own", example: "Social media algorithms can create echo chambers that reinforce existing views.", level: "B2" },
    { term: "multitasking", definition: "Performing multiple tasks simultaneously", example: "Contrary to belief, multitasking often reduces overall productivity.", level: "B1" },
    { term: "plug in / unplug", definition: "To connect to / disconnect from technology (literal and figurative)", example: "She decided to unplug for the weekend and left her phone at home.", level: "B1" },
    { term: "go viral", definition: "To spread rapidly and widely on the internet", example: "The video went viral overnight, reaching 50 million views.", level: "B1" },
    { term: "at the touch of a button", definition: "Very easily; with minimal effort", example: "You can now order groceries at the touch of a button.", level: "B1" },
    { term: "keep up with the times", definition: "To stay current with changes and developments", example: "Small businesses must keep up with the times by embracing digital tools.", level: "B1" },
    { term: "double-edged sword", definition: "Something that has both advantages and disadvantages", example: "Social media is a double-edged sword — it connects but also distracts.", level: "B2" }
  ],

  dialogue: {
    title: "A Coffee Shop Conversation",
    speakers: ["Maya", "James"],
    lines: [
      { speaker: "Maya", text: "James, I noticed you have not touched your phone in the last hour. Is everything okay?", emotion: "curious" },
      { speaker: "James", text: "Actually, I am trying something new. I am doing a digital detox this weekend.", emotion: "calm" },
      { speaker: "Maya", text: "A digital detox? You mean no phone at all? How do you even survive?", emotion: "surprised" },
      { speaker: "James", text: "It sounds extreme, I know. But honestly, I was spending about six hours a day on my phone. That is more than I sleep!", emotion: "reflective" },
      { speaker: "Maya", text: "Wow. When you put it that way, it does sound like a lot. What made you decide to do this?", emotion: "thoughtful" },
      { speaker: "James", text: "I read an article about how the algorithm on social media is literally designed to keep you scrolling. It felt manipulative.", emotion: "concerned" },
      { speaker: "Maya", text: "I read something similar. The app developers actually hire psychologists to make the experience more addictive.", emotion: "serious" },
      { speaker: "James", text: "Exactly. And I realised my attention span has gotten much shorter. I cannot even read a book for twenty minutes without checking my phone.", emotion: "honest" },
      { speaker: "Maya", text: "I feel that too. So what are you doing with all the extra time?", emotion: "curious" },
      { speaker: "James", text: "I went for a long walk this morning and actually noticed things I normally ignore. A beautiful old building on my street. The sound of birds. It was refreshing.", emotion: "happy" },
      { speaker: "Maya", text: "That sounds lovely. Maybe I should try it too. Just for a day though. I am not sure I could manage a whole weekend!", emotion: "amused" },
      { speaker: "James", text: "Start small. Even two hours without your phone can make a difference. You will be surprised how much more present you feel.", emotion: "encouraging" }
    ]
  },

  reading: {
    basic: {
      title: "How Technology Changed Our Lives",
      content: `<h3>Technology Is Everywhere</h3>
<p>Today, technology is a big part of our daily lives. We use phones, computers, and tablets every day. These tools help us do many things quickly and easily. We can send messages, watch videos, and find information <b>at the touch of a button</b>.</p>

<h3>The Good Things About Technology</h3>
<p>Technology has many benefits. We can stay connected with family and friends who live far away. Video calls allow us to see people's faces even when they are on the other side of the world. Online shopping saves us time because we do not need to go to a physical store.</p>
<p>Education has also changed. Students can now learn from teachers in other countries. Free online courses make knowledge available to everyone. A person in a small village can learn the same things as someone in a big city.</p>

<h3>Some Problems With Technology</h3>
<p>However, technology also brings problems. Many people spend too much time on their phones. This is called excessive <b>screen time</b>. Too much screen time can affect our sleep and make us feel tired. Some people feel anxious when they do not have their phone with them.</p>
<p>Another problem is <b>misinformation</b>. This means false information that spreads online. It can be hard to know what is true and what is not. We need to check information carefully before we share it.</p>

<h3>Finding a Balance</h3>
<p>The key is to find a good balance. Technology should help us, not control us. We can set limits on our screen time. We can also spend time doing things without technology, like reading books, going for walks, or talking to people face to face.</p>
<p>Being <b>tech-savvy</b> does not only mean knowing how to use devices. It also means knowing when NOT to use them. That is real digital wisdom.</p>`
    },
    intermediate: {
      title: "The Digital Age: Navigating Modern Technology",
      content: `<h3>A World Transformed</h3>
<p>We are living through one of the most significant transformations in human history. The rise of digital technology has fundamentally altered how we communicate, work, learn, and even think. From the moment we wake up to the time we fall asleep, technology mediates almost every aspect of modern life. While this brings extraordinary benefits, it also presents challenges that society is only beginning to understand.</p>

<h3>The Promise of Connectivity</h3>
<p>At its best, technology fulfils an ancient human dream: true global <b>connectivity</b>. A student in rural Kenya can access the same educational resources as one at Harvard University. A small business owner in Vietnam can reach customers in Canada. Families separated by oceans can share meals virtually. The internet has democratised access to information in ways that previous generations could only imagine.</p>
<p>Furthermore, <b>artificial intelligence</b> is beginning to personalise these experiences. Learning apps adapt to individual progress. Medical diagnostics are becoming faster and more accurate. Agricultural tools help farmers predict weather patterns and optimise crops. Technology, used wisely, can be a powerful force for human advancement.</p>

<h3>The Hidden Costs</h3>
<p>However, this transformation comes with significant hidden costs. The <b>algorithm</b>-driven design of social media platforms is engineered to maximise engagement, often at the expense of user wellbeing. Research from leading universities has linked excessive social media use with increased rates of anxiety, depression, and loneliness — particularly among adolescents.</p>
<p>The concept of the <b>echo chamber</b> is particularly alarming. When platforms show us only content that aligns with our existing beliefs, they reinforce and amplify those views. This makes productive conversation between people with different perspectives increasingly difficult. <b>Misinformation</b> thrives in these environments, spreading faster than verified facts.</p>
<p>There is also the issue of our <b>digital footprint</b>. Every click, search, and purchase leaves a permanent data trail. This information is collected by corporations and can be used in ways we have never explicitly agreed to. Privacy, once considered a basic right, has become a luxury in the digital age.</p>

<h3>Reclaiming Control</h3>
<p>Growing numbers of people are pushing back. The concept of a "digital detox" — deliberately disconnecting from technology for a period — has become a mainstream wellness practice. Studies show that even short breaks from social media improve mood and reduce anxiety. People are recognising that being <b>tech-savvy</b> means more than knowing how to use devices; it means understanding their power and choosing how to engage with them.</p>
<p>Schools are incorporating <b>digital literacy</b> into their curricula, teaching children not just how to use technology, but how to think critically about it. Legislation is catching up, with new privacy laws in Europe and California giving users more control over their data.</p>

<h3>Looking Ahead</h3>
<p>The relationship between humans and technology is not fixed — it is something we collectively shape through our choices. The devices we use, the platforms we support, and the time we invest all send signals to the technology industry about what we value. A future where technology genuinely serves human flourishing is possible, but it requires active participation, not passive consumption.</p>
<p>Technology is neither a villain nor a saviour. Like all powerful tools, it reflects the intentions and values of those who wield it. The challenge of our generation is to develop the wisdom — individually and collectively — to use it well.</p>`
    },
    advanced: {
      title: "The Anthropology of the Digital Self: Technology, Identity, and Society",
      content: `<h3>The Mediated Self</h3>
<p>The philosophical implications of our digital existence deserve far more serious examination than the breathless techno-optimism of Silicon Valley or the reflexive Luddism of its critics. We are not merely users of technology; we have become co-constituted with it. The <b>digital footprint</b> we leave is not a shadow of the self — it is increasingly part of the self. Our identities, social relationships, and cognitive patterns are being restructured by the environments we inhabit, and those environments are now predominantly digital.</p>
<p>The anthropologist Marshall McLuhan famously observed that "the medium is the message." He could not have anticipated the prescience of this insight in an era of <b>algorithmic</b> content curation. The medium is no longer merely television or radio — it is a personalised, adaptive, behaviorally-engineered information environment that has no historical precedent.</p>

<h3>The Architecture of Attention</h3>
<p>Contemporary digital platforms are sophisticated attention-capture systems. Their designers, many trained in behavioural psychology and neuroscience, employ techniques derived from operant conditioning: variable reward schedules, social validation metrics, and infinite scroll mechanisms that eliminate natural stopping points. The result is not engagement but compulsion. The distinction between the two is morally significant.</p>
<p>The consequences for cognitive architecture are profound. Neuroscientific research suggests that habitual digital multitasking is associated with reduced grey matter density in the anterior cingulate cortex — the brain region responsible for impulse control and emotional regulation. We are, in a very literal sense, reshaping our neurology through our technological habits. <b>Screen time</b> is not merely a lifestyle choice; it is a neurological intervention.</p>

<h3>The Epistemological Crisis</h3>
<p>Perhaps the most dangerous consequence of algorithmic <b>echo chambers</b> is not political polarisation, though that is serious enough, but the epistemological fragmentation of shared reality. When different segments of society inhabit entirely different information ecosystems, the possibility of democratic deliberation — which requires some common ground of agreed facts — becomes structurally compromised.</p>
<p><b>Misinformation</b> exploits this fragmentation brilliantly. False narratives do not spread despite being false; they often spread because their falseness is irrelevant to their function. They serve as identity markers, tribal signals, and emotional outlets. Debunking alone cannot counter this dynamic because the problem is not primarily epistemic — it is psychological and sociological.</p>

<h3>The Political Economy of Attention</h3>
<p>The surveillance capitalism model — in which human attention and behavioural data constitute the primary commodity — creates structural incentives that are fundamentally misaligned with user wellbeing. <b>Connectivity</b> is not sold; it is the bait. The actual product is the modification of human behaviour for advertisers. As Shoshana Zuboff has argued, this represents a new form of power that operates "above and beyond" traditional market and state power.</p>
<p><b>Cybersecurity</b> in this context extends beyond protecting systems from intrusion. The more urgent challenge is protecting human cognitive autonomy from sophisticated behavioural engineering. This requires not merely technical solutions but regulatory frameworks, educational interventions, and cultural norms that have yet to fully emerge.</p>

<h3>Toward Digital Wisdom</h3>
<p>The concept of <b>digital literacy</b> must be radically expanded. Technical competency — knowing how to use devices and platforms — is necessary but grossly insufficient. What is required is a deeper form of critical engagement: understanding the political economies that structure digital environments, recognising the psychological mechanisms being exploited, and developing the metacognitive capacity to observe one's own technologically-mediated behaviour.</p>
<p>This is not a counsel of despair but a call for agency. Technology is neither inherently oppressive nor liberatory. The same <b>artificial intelligence</b> systems that enable algorithmic manipulation can be redirected toward genuine educational personalisation. The same connectivity that creates echo chambers can bridge cultural divides. The question is not whether to engage with technology but how — and on whose terms.</p>
<p>The generation that masters this question will not merely be tech-savvy in the conventional sense. They will have developed something more valuable: the wisdom to remain fully human in an increasingly posthuman landscape.</p>`
    }
  },

  grammarSlides: [
    { level: "A2/B1", structure: "Present Perfect vs. Simple Past", example: "I have used social media for years. / I used Twitter in 2015.", meaning: "Present perfect connects past to now; simple past describes a finished action.", mistake: "Saying 'I have went online yesterday' — never use present perfect with finished time markers like 'yesterday'.", alternatives: ["'I've been using...' (continuous)", "'I used to use...' (past habit)"] },
    { level: "A2/B1", structure: "Passive Voice with Technology", example: "The data is collected by the algorithm.", meaning: "Used when the action is more important than who does it, or the agent is unknown/obvious.", mistake: "Overusing passive voice makes writing impersonal and harder to read.", alternatives: ["Active: 'The algorithm collects the data'", "Focus shift: 'Your data gets collected automatically'"] },
    { level: "A2/B1", structure: "Modal Verbs for Advice (should/ought to)", example: "You should limit your screen time. / We ought to check sources carefully.", meaning: "Express recommendations, not obligations. Softer than 'must'.", mistake: "Confusing 'should' (advice) with 'must' (obligation) or 'shall' (formal future).", alternatives: ["'It would be wise to...'", "'I'd recommend...'", "'You might want to...'"] },
    { level: "B1/B2", structure: "Conditional Type 2 (Hypothetical)", example: "If I deleted social media, I would feel more present.", meaning: "Describes an imaginary present/future situation and its result.", mistake: "Writing 'If I would delete...' — never use 'would' in the 'if' clause.", alternatives: ["'Were I to delete...' (formal)", "'Supposing I deleted...'", "'Should I delete...'"] },
    { level: "B1/B2", structure: "Relative Clauses (Defining/Non-defining)", example: "The algorithm that shows you ads is based on your behaviour. / Mark Zuckerberg, who founded Facebook, is one of the world's richest people.", meaning: "Defining: identifies which one. Non-defining: adds extra information (use commas).", mistake: "Using 'which' for people or 'who' for things in defining clauses.", alternatives: ["'The person whose data was leaked...'", "'The app, which I find addictive, ...'"] },
    { level: "B1/B2", structure: "Gerunds vs. Infinitives After Verbs", example: "I enjoy scrolling through feeds. / I decided to take a digital detox.", meaning: "Some verbs take gerunds (enjoy, avoid, consider), others take infinitives (decide, want, choose).", mistake: "Saying 'I enjoy to scroll' or 'I decided taking' — these are very common B1 errors.", alternatives: ["'I can't help scrolling...'", "'I managed to disconnect...'"] },
    { level: "B2/C1", structure: "Inversion for Emphasis", example: "Not only does social media distract us, but it also shapes our beliefs.", meaning: "Starting with a negative/restrictive expression triggers subject-verb inversion. Creates strong emphasis.", mistake: "Forgetting to invert after 'not only,' 'rarely,' 'never have I,' etc.", alternatives: ["'Rarely do we question...'", "'Never before has technology...'", "'Only when we disconnect...'"] },
    { level: "B2/C1", structure: "Noun Clauses as Subjects", example: "What concerns researchers most is the long-term effect on attention spans.", meaning: "A whole clause acts as the subject. Creates sophisticated, academic-style sentence structure.", mistake: "Using a pronoun where a noun clause is needed: 'It concerns researchers' removes the specificity.", alternatives: ["'The fact that... is concerning'", "'That algorithms manipulate us is well documented'"] },
    { level: "B2/C1", structure: "Advanced Hedging Language", example: "This might suggest that prolonged use could potentially alter cognitive patterns.", meaning: "Hedging (might, could, potentially, arguably) is essential in academic writing to avoid overgeneralisation.", mistake: "Making absolute statements: 'Social media destroys concentration' — unqualified and defensible claims.", alternatives: ["'Evidence suggests...'", "'It appears that...'", "'There is reason to believe...'"] }
  ],

  radioDrama: {
    title: "The Disconnected",
    setting: "A kitchen table. Morning. The Okafor family.",
    cast: ["Narrator", "Mom (Adaeze)", "Dad (Emeka)", "Teen (Zoe)"],
    lines: [
      { character: "Narrator", text: "It is a Sunday morning in the Okafor household. Adaeze is making tea. Emeka reads the news on his tablet. Zoe sits across from them, headphones on, completely absorbed in her phone.", emotion: "neutral" },
      { character: "Mom (Adaeze)", text: "Zoe. Zoe! Take those headphones off, please. We are having breakfast as a family.", emotion: "firm" },
      { character: "Teen (Zoe)", text: "One second, Mum! I am literally in the middle of a video.", emotion: "annoyed" },
      { character: "Dad (Emeka)", text: "You said one second twenty minutes ago. And I notice I am also guilty — let me put this down too.", emotion: "self-aware" },
      { character: "Narrator", text: "Emeka sets his tablet face-down on the table. It is a small gesture, but Zoe notices.", emotion: "neutral" },
      { character: "Teen (Zoe)", text: "Okay, okay. I am off. See? Completely unplugged. Are you happy?", emotion: "sarcastic" },
      { character: "Mom (Adaeze)", text: "I am not trying to make you unhappy. I just miss talking to you. Actually talking — not through a screen.", emotion: "sincere" },
      { character: "Teen (Zoe)", text: "But Mum, all my friends are on there. It is where we communicate. It is how my generation works.", emotion: "defensive" },
      { character: "Dad (Emeka)", text: "I understand that, Zoe. I really do. But here is a question — when did you last have a conversation so good that you forgot to check your phone?", emotion: "curious" },
      { character: "Teen (Zoe)", text: "I... that is a weird question. I do not know. Maybe... actually, when we went camping last summer? We had no signal.", emotion: "thoughtful" },
      { character: "Mom (Adaeze)", text: "And what was that weekend like?", emotion: "gentle" },
      { character: "Teen (Zoe)", text: "It was actually really nice. We talked properly. I felt... present, I think. Is that the word?", emotion: "realising" },
      { character: "Dad (Emeka)", text: "That is exactly the word. The algorithm never gives you that feeling. Only real moments do.", emotion: "wise" },
      { character: "Narrator", text: "There is a long silence. Not an uncomfortable one — the kind that is full of something. Zoe slides her phone into her pocket.", emotion: "neutral" },
      { character: "Teen (Zoe)", text: "Alright. What do you want to talk about? Actually talk about.", emotion: "open" },
      { character: "Mom (Adaeze)", text: "Tell me something that surprised you this week. Something you learned.", emotion: "warm" },
      { character: "Teen (Zoe)", text: "Okay... I read that the average person touches their phone over two thousand six hundred times a day. I could not believe it. But then I started counting and I think I might be above average.", emotion: "amused" },
      { character: "Dad (Emeka)", text: "That is a genuinely alarming statistic. And you read that online, of course.", emotion: "amused" },
      { character: "Teen (Zoe)", text: "Oh, the irony is not lost on me, Dad.", emotion: "laughing" },
      { character: "Narrator", text: "And for the first time in a long while, the Okafor kitchen fills with real laughter — the kind that no algorithm can manufacture.", emotion: "warm" }
    ],
    ambientSound: "kitchen",
    comprehensionQuestions: [
      {
        question: "What is Zoe doing at the beginning of the scene?",
        options: ["Making breakfast", "Scrolling on her phone with headphones on", "Talking to her parents", "Reading a book"],
        correct: 1,
        explanation: "The narrator describes Zoe sitting with headphones on, completely absorbed in her phone."
      },
      {
        question: "What does Dad (Emeka) do that catches Zoe's attention?",
        options: ["Takes away her phone", "Raises his voice", "Puts his own tablet face-down", "Leaves the room"],
        correct: 2,
        explanation: "Emeka models the behavior he wants to see by putting his own device down first, rather than demanding Zoe do so."
      },
      {
        question: "When did Zoe last feel 'present' according to the conversation?",
        options: ["Last week at school", "During the camping trip with no signal", "At a birthday party", "She never has"],
        correct: 1,
        explanation: "Zoe recalls feeling genuinely present during a camping trip last summer when there was no phone signal."
      },
      {
        question: "What surprising statistic does Zoe mention?",
        options: ["People sleep 6 hours on average", "The average person touches their phone 2,600 times daily", "80% of teens are addicted to phones", "Screen time reduces sleep by 2 hours"],
        correct: 1,
        explanation: "Zoe mentions reading that the average person touches their phone over 2,600 times per day."
      }
    ]
  },

  dictation: {
    sentences: [
      "The algorithm decides which posts appear at the top of your feed based on your previous behaviour.",
      "Digital literacy is becoming as important as traditional reading and writing skills in the modern world.",
      "Social media platforms are designed to maximise engagement, sometimes at the expense of user wellbeing.",
      "A growing number of people are choosing to take regular digital detox breaks to improve their mental health.",
      "Misinformation spreads rapidly online because false stories often trigger stronger emotional reactions than factual ones."
    ]
  },

  discussion: {
    topic: "Is technology making us smarter or more dependent?",
    post: "I think technology is a double-edged sword. Sure, we have access to incredible information, but are we actually becoming more intelligent, or just better at finding answers without understanding them? When was the last time you memorised a phone number? I used to know thirty. Now I know three. — Posted by @TechWatcher",
    comments: [
      {
        character: "Chad",
        avatar: "😎",
        text: "Honestly? Technology is making us SMARTER. We offload boring memorisation to machines so our brains can focus on creativity and problem-solving. Why remember a phone number when you can think about bigger ideas?",
        isCorrect: false,
        feedback: "Chad makes a valid point about cognitive offloading, but he oversimplifies. While we do free up some cognitive resources, studies show passive reliance on technology can weaken certain cognitive muscles. His argument lacks nuance about what 'smarter' actually means.",
        catFeedback: "Chad's got confidence, but his answer is a bit too simple. The reality is more complicated than that! Cognitive offloading is real, but it's not the whole story."
      },
      {
        character: "Brittany",
        avatar: "💁‍♀️",
        text: "It depends entirely on HOW you use it. Technology used passively makes us dependent. Technology used actively — for creating, learning, and connecting ideas — genuinely enhances intelligence. The tool is neutral; the user is not.",
        isCorrect: true,
        feedback: "Excellent insight! Brittany identifies the crucial distinction between passive consumption and active engagement. This reflects real research on technology use and cognitive outcomes. She avoids blanket statements and acknowledges context — a hallmark of B2+ critical thinking.",
        catFeedback: "Purr-fect answer! Brittany nailed it. The key is HOW you use technology, not just that you use it. That's exactly the kind of nuanced thinking we need!"
      },
      {
        character: "Mr. Worthington",
        avatar: "🧐",
        text: "In my forty years of teaching, I have watched students go from encyclopaedias to search engines. Each generation said the new technology would ruin young minds. Each generation was wrong. Children adapt. Stop worrying.",
        isCorrect: false,
        feedback: "Mr. Worthington commits an appeal to tradition fallacy. The fact that previous technologies did not cause lasting harm does not mean current ones won't — particularly given the engineered addictive properties of modern platforms, which have no historical precedent.",
        catFeedback: "Hmm, Mr. Worthington is wise but a bit too comfortable with the past. Just because old worries were wrong doesn't mean new ones are!"
      },
      {
        character: "Kevin",
        avatar: "🙄",
        text: "Who cares? Everything is online anyway. If I need to know something, I Google it. If I need to think about something, I'll ask ChatGPT. Intelligence is overrated. Efficiency is what matters now.",
        isCorrect: false,
        feedback: "Kevin's comment, while humorously blunt, confuses information retrieval with understanding. Efficiency without comprehension creates brittle knowledge that breaks under novel circumstances. He raises the important question of what we value — but does not engage with it.",
        catFeedback: "Oh Kevin... I love the honesty, but mixing up 'finding information' with 'being intelligent' is like saying you can cook because you have a menu. Nice try though!"
      }
    ]
  },

  quiz: [
    {
      question: "Based on the reading, what does 'echo chamber' primarily refer to in the context of social media?",
      options: ["A soundproof room for recording podcasts", "A digital environment that reinforces existing beliefs", "A device that amplifies voices on video calls", "A marketing strategy for audio content"],
      correct: 1,
      explanation: "An echo chamber is a digital environment where algorithms show content that aligns with existing views, reinforcing and amplifying those beliefs."
    },
    {
      question: "The dialogue uses the phrase 'at the touch of a button.' This is best described as a:",
      options: ["Technical term for touchscreen technology", "Formal expression for device operation", "Colloquial idiom meaning 'very easily'", "Metaphor for digital addiction"],
      correct: 2,
      explanation: "At the touch of a button is an idiomatic expression meaning something can be done very easily with minimal effort."
    },
    {
      question: "Which grammar structure does James use when he says 'I was spending about six hours a day on my phone'?",
      options: ["Present Perfect Continuous", "Past Simple", "Past Continuous", "Present Simple"],
      correct: 2,
      explanation: "Past Continuous (was + -ing) describes an ongoing action in the past, emphasising the duration and continuity of the behaviour."
    },
    {
      question: "In the Radio Drama, what causes Zoe to begin engaging more genuinely?",
      options: ["Her mother threatens to take her phone away", "Her father puts down his own device first", "She receives a notification that distracts her", "The internet connection is lost"],
      correct: 1,
      explanation: "Emeka's act of putting his own tablet face-down is what Zoe notices — modelling the behaviour rather than demanding it creates genuine engagement."
    },
    {
      question: "The term 'digital footprint' most accurately means:",
      options: ["The size of a computer screen in pixels", "A physical USB connection to a device", "The data trail left by internet activity", "Software that tracks step counts"],
      correct: 2,
      explanation: "A digital footprint is the trail of data — clicks, searches, purchases — that you leave when using the internet."
    },
    {
      question: "Which comment in the Discussion Corner is considered most insightful, and why?",
      options: ["Chad's, because he mentions creativity and problem-solving", "Brittany's, because she distinguishes between active and passive use", "Mr. Worthington's, because he has historical perspective", "Kevin's, because he is the most honest about modern habits"],
      correct: 1,
      explanation: "Brittany's comment is most insightful because she avoids absolute statements and acknowledges that the impact of technology depends on HOW it is used — reflecting nuanced critical thinking."
    },
    {
      question: "The advanced reading describes 'surveillance capitalism.' Based on context clues, this term most likely means:",
      options: ["Government monitoring of stock markets", "A business model based on collecting and monetising user data", "A political system that controls communication technology", "Software used by police to monitor criminals"],
      correct: 1,
      explanation: "Surveillance capitalism, as described by Shoshana Zuboff, is a business model in which human attention and behavioural data are commodified for commercial purposes."
    },
    {
      question: "What type of conditional is used in: 'If I deleted social media, I would feel more present'?",
      options: ["Zero Conditional (universal truths)", "First Conditional (real possibility)", "Second Conditional (hypothetical/unlikely)", "Third Conditional (past regret)"],
      correct: 2,
      explanation: "The Second Conditional (If + past simple, would + infinitive) describes an imaginary or hypothetical present/future scenario."
    },
    {
      question: "The lesson argues that true digital literacy involves:",
      options: ["Typing speed and knowing keyboard shortcuts", "Using the latest devices and software", "Critical understanding of how and why to engage with technology", "Having multiple social media accounts"],
      correct: 2,
      explanation: "The lesson consistently argues that real digital literacy goes beyond technical skill to include critical thinking about purpose, design, and impact."
    },
    {
      question: "Which sentence uses hedging language correctly, as described in the Grammar Slides?",
      options: ["Social media destroys concentration completely.", "I am certain that algorithms make everyone anxious.", "This might suggest that prolonged use could potentially alter thinking patterns.", "Technology definitely causes depression in teenagers."],
      correct: 2,
      explanation: "Hedging uses words like 'might,' 'could,' and 'potentially' to avoid overgeneralisation — essential in academic and professional writing."
    }
  ],

  secretCode: "DGTL-B1-2025-MASTER",

  conversationGame: {
    title: "The Tech Job Interview",
    description: "You are interviewing for a position at a tech startup. Navigate the conversation carefully — your digital literacy and communication skills are being tested!",
    characters: [
      { name: "Sarah Chen", role: "HR Manager", avatar: "👩‍💼", personality: "Professional but warm" },
      { name: "Marcus Rivera", role: "Tech Lead", avatar: "👨‍💻", personality: "Direct and technical" }
    ],
    nodes: {
      start: {
        id: "start",
        speaker: "Sarah Chen",
        text: "Welcome! We are excited to meet you. Before we dive in, I'd like to understand your relationship with technology. How would you describe your digital literacy?",
        emotion: "cheerful",
        choices: [
          { text: "I am extremely tech-savvy. I spend 8+ hours online daily and know every new app.", next: "overclaim", catNote: "Overconfidence alert! Quality over quantity..." },
          { text: "I am comfortable with technology and try to use it critically and purposefully.", next: "good_start", catNote: "Excellent! Thoughtful and balanced!" },
          { text: "To be honest, I am still learning. Technology moves very fast.", next: "humble", catNote: "Honest humility is always appreciated!" },
          { text: "I prefer not to use technology much. I am more of a people person.", next: "red_flag", catNote: "Hmm, for a tech job? Maybe not the best angle..." }
        ]
      },
      good_start: {
        id: "good_start",
        speaker: "Sarah Chen",
        text: "That is exactly the mindset we value here. Now, Marcus would like to ask you something about our industry. Marcus?",
        emotion: "cheerful",
        choices: [
          { text: "Of course, I am happy to answer any technical questions.", next: "security_correct", catNote: "Confident and ready! Great attitude!" },
          { text: "Sure — although I am still developing my technical knowledge.", next: "humble", catNote: "Honest and open to learning!" }
        ]
      },
      overclaim: {
        id: "overclaim",
        speaker: "Sarah Chen",
        text: "Interesting... but we actually worry about candidates who are online all day without purpose. Could you tell me about a time you chose NOT to use technology to solve a problem?",
        emotion: "dramatic",
        choices: [
          { text: "I cannot think of any. Technology always has the answer.", next: "lose_overclaim", catNote: "Oh no, that's not the right answer here..." },
          { text: "Actually, I once resolved a team conflict through face-to-face conversation rather than email chains.", next: "recover", catNote: "Great recovery! Face-to-face wins sometimes!" }
        ]
      },
      humble: {
        id: "humble",
        speaker: "Marcus Rivera",
        text: "I appreciate the honesty. We like learners here. Tell me — if you encountered a cybersecurity threat at work, what would your first step be?",
        emotion: "cheerful",
        choices: [
          { text: "I would immediately try to fix it myself by looking it up online.", next: "lose_security", catNote: "Hmm, going solo on security threats is risky..." },
          { text: "I would disconnect the affected system and notify the IT security team immediately.", next: "security_correct", catNote: "Purrfect! That's exactly right!" }
        ]
      },
      red_flag: {
        id: "red_flag",
        speaker: "Marcus Rivera",
        text: "This is a technology company. We need people who embrace digital tools thoughtfully. I am afraid this might not be the right fit. Thank you for coming in.",
        emotion: "angry",
        choices: [],
        isEnd: true,
        isWin: false,
        endMessage: "The interview ends early. The tech company needed someone more comfortable with digital tools. Remember: being 'a people person' and being tech-savvy are NOT opposites!"
      },
      lose_overclaim: {
        id: "lose_overclaim",
        speaker: "Sarah Chen",
        text: "We actually value human judgment over digital automation. Someone who relies entirely on technology is a liability here. Thank you for your time.",
        emotion: "dramatic",
        choices: [],
        isEnd: true,
        isWin: false,
        endMessage: "The interview ends. Being unable to disconnect from technology when needed is seen as a weakness. True digital literacy means knowing WHEN not to use technology."
      },
      recover: {
        id: "recover",
        speaker: "Sarah Chen",
        text: "Excellent example! That shows real emotional intelligence. Now, Marcus has a technical question for you.",
        emotion: "cheerful",
        choices: [
          { text: "I am ready. What would you like to know?", next: "security_correct", catNote: "Confident! Let's hear the question." },
          { text: "I will do my best to answer honestly.", next: "humble", catNote: "Humble but willing — nice approach!" }
        ]
      },
      lose_security: {
        id: "lose_security",
        speaker: "Marcus Rivera",
        text: "That is actually the worst thing you could do — searching online about a security breach could alert the attacker or spread the problem. We need people who follow protocol. Thank you for your time.",
        emotion: "angry",
        choices: [],
        isEnd: true,
        isWin: false,
        endMessage: "Cybersecurity incident response requires protocol, not improvisation. The correct first step is always: isolate and report."
      },
      security_correct: {
        id: "security_correct",
        speaker: "Marcus Rivera",
        text: "Perfect response. You clearly understand that protocol matters more than heroics. One final question — how do you feel about digital detox policies at work?",
        emotion: "cheerful",
        choices: [
          { text: "I think they are unnecessary. We should always be reachable.", next: "lose_detox", catNote: "Always reachable? That's a recipe for burnout..." },
          { text: "I support them. Research shows boundaries improve productivity and creativity.", next: "win", catNote: "Wonderful! You understand work-life balance!" },
          { text: "I would comply but I personally disagree with them.", next: "lose_disagree", catNote: "Almost! But expressing disagreement with company values is tricky..." }
        ]
      },
      lose_detox: {
        id: "lose_detox",
        speaker: "Sarah Chen",
        text: "We have found that always-on culture leads to burnout and poor quality work. We are looking for someone who models healthy digital habits. Thank you.",
        emotion: "dramatic",
        choices: [],
        isEnd: true,
        isWin: false,
        endMessage: "Always-on culture is recognised as harmful. Companies that prioritise wellbeing produce better results. Understanding boundaries is a professional skill."
      },
      lose_disagree: {
        id: "lose_disagree",
        speaker: "Sarah Chen",
        text: "We appreciate the honesty, but we need team members who genuinely believe in our culture, not just comply with it. We will keep your CV on file.",
        emotion: "secretive",
        choices: [],
        isEnd: true,
        isWin: false,
        endMessage: "Cultural alignment matters in hiring. Expressing disagreement with core company values — even politely — signals a potential mismatch."
      },
      win: {
        id: "win",
        speaker: "Sarah Chen",
        text: "That is exactly our philosophy. You have demonstrated digital literacy, critical thinking, emotional intelligence, and alignment with our values. We would love to have you join our team. Welcome aboard!",
        emotion: "cheerful",
        choices: [],
        isEnd: true,
        isWin: true,
        endMessage: "Congratulations! You navigated the interview perfectly. You demonstrated that true digital literacy means using technology purposefully, knowing its limits, following security protocols, and supporting healthy digital habits."
      }
    },
    keywords: {
      "digital literacy": "The ability to use digital technology effectively, critically, and safely",
      "tech-savvy": "Well-informed about and comfortable using modern technology",
      "cybersecurity": "Protection of computer systems and networks from digital attacks",
      "protocol": "An established set of rules or procedures to follow in a given situation",
      "digital detox": "A period of time during which a person refrains from using digital devices",
      "emotional intelligence": "The ability to recognise and manage one's own emotions and those of others",
      "burnout": "Physical or mental collapse caused by overwork or stress",
      "cultural alignment": "Sharing the same values and working style as an organisation"
    },
    discussionQuestions: [
      "What would you do if you were asked to be available by phone 24 hours a day for your job?",
      "How do you personally balance technology use in your daily life?",
      "Do you think companies have a responsibility to protect employees from digital overload?",
      "What is one digital habit you would like to change, and how would you do it?"
    ]
  },

  guessThePlace: {
    name: "Kyoto, Japan",
    coordinates: { lat: 35.0116, lng: 135.7681 },
    clue: `This extraordinary city is one of the most carefully preserved urban spaces on the planet. Walking through its ancient districts feels like stepping backward through time, yet the city itself is entirely alive and modern. In the older neighbourhoods, the streets narrow to paths barely wide enough for two people to walk side by side. Traditional wooden buildings line these lanes, their dark timber facades blackened by centuries of seasons. Paper lanterns cast warm amber light in the evenings, and the air carries the faint scent of cedar and incense.

The city is home to hundreds of shrines and temples, each with its own distinct character. Some are grand and imposing, set against forested hillsides and approached through long corridors of towering red gates that seem to multiply endlessly. Others are intimate and hidden, discovered suddenly at the end of an unmarked alley.

Seasonal change is experienced here with unusual intensity. When spring arrives, every street becomes briefly magical as blossoms drift from ancient trees, carpeting the ground in pale pink. Autumn brings an equally theatrical transformation — the hillsides burn in shades of crimson, amber, and deep gold.

The local cuisine reflects the same philosophy of careful refinement. Small portions, exquisite presentation, seasonal ingredients. There is a particular multi-course dining tradition here that has been practised for centuries and is considered one of the world's great culinary arts.

Women in colourful traditional dress can still be seen walking between the old tea house districts, though today many are visitors enjoying a cultural experience rather than professional practitioners. The city has managed the rare achievement of being both a living community and a world heritage site simultaneously.`,
    tooltipWords: {
      "facades": "The front faces of buildings",
      "incense": "A substance burned to produce a fragrant smell, often used in religious ceremonies",
      "intimate": "Small, private, and cosy",
      "theatrical": "Very dramatic and visually impressive",
      "culinary": "Related to cooking or the kitchen",
      "refinement": "The quality of being cultured and having good taste",
      "heritage site": "A place recognised as having special cultural, historical, or natural importance"
    },
    hints: [
      "This place is located in an island nation in East Asia, known for its unique blend of ancient tradition and cutting-edge technology.",
      "This is the second-largest city in its country's Kansai region, and served as the nation's imperial capital for over a thousand years.",
      "The city's name means 'Capital City' in the local language. It begins with the letter K."
    ],
    images: [
      { label: "Aerial View", emoji: "🛩️", description: "Ancient temple complexes nestled in forested hills" },
      { label: "Street Level", emoji: "🏮", description: "Narrow lanes with traditional wooden buildings" },
      { label: "Local Food", emoji: "🍱", description: "Exquisite multi-course traditional cuisine" },
      { label: "Cultural Detail", emoji: "⛩️", description: "Iconic vermillion gates stretching through forest" }
    ],
    funFacts: [
      "Kyoto has over 1,600 Buddhist temples and 400 Shinto shrines within city limits.",
      "It was deliberately spared from bombing in World War II partly due to its immense cultural significance.",
      "The city inspired the design of several animated films, including works by Studio Ghibli.",
      "Kyoto's geisha district, Gion, is one of the last places where the geisha tradition is still authentically practised.",
      "The famous Arashiyama Bamboo Grove is so tall and dense that it blocks out direct sunlight at midday."
    ],
    cultureNotes: [
      "Always walk on the left side of temple pathways — it's respectful and traditional.",
      "Photography of geiko (Kyoto geisha) without permission is considered deeply disrespectful.",
      "Many high-end restaurants require reservations months in advance — even in Japan, Kyoto's dining culture is considered elite.",
      "Remove your shoes before entering any traditional building, and many temple areas require complete silence."
    ],
    thingsToAvoid: [
      "Do not eat or drink while walking — it's considered rude in traditional areas.",
      "Avoid loud conversations near temple and shrine grounds.",
      "Do not touch the moss or sacred objects in garden areas.",
      "Avoid pointing at people or using large gestures in formal spaces."
    ],
    country: "Japan",
    language: "Japanese",
    languageCode: "ja",
    survivalPhrases: [
      { phrase: "こんにちは", pronunciation: "Konnichiwa", translation: "Hello / Good afternoon", context: "General greeting during daytime" },
      { phrase: "ありがとうございます", pronunciation: "Arigatou gozaimasu", translation: "Thank you very much", context: "Polite way to thank someone" },
      { phrase: "すみません", pronunciation: "Sumimasen", translation: "Excuse me / Sorry", context: "Getting attention or apologizing" },
      { phrase: "お願いします", pronunciation: "Onegaishimasu", translation: "Please", context: "When making a request" },
      { phrase: "いくらですか？", pronunciation: "Ikura desu ka?", translation: "How much is it?", context: "Asking the price when shopping" },
      { phrase: "どこですか？", pronunciation: "Doko desu ka?", translation: "Where is...?", context: "Asking for directions" },
      { phrase: "トイレはどこですか？", pronunciation: "Toire wa doko desu ka?", translation: "Where is the toilet?", context: "Essential for finding restrooms" },
      { phrase: "英語を話せますか？", pronunciation: "Eigo wo hanasemasu ka?", translation: "Do you speak English?", context: "Asking if someone speaks English" },
      { phrase: "助けてください", pronunciation: "Tasukete kudasai", translation: "Please help me", context: "Emergency situations" },
      { phrase: "美味しいです", pronunciation: "Oishii desu", translation: "It's delicious", context: "Complimenting food" }
    ],
    audioTour: {
      lines: [
        { speaker: "Tourist Guide", text: "Welcome to one of the world's most beautifully preserved ancient cities. I'm so glad you could join us today." },
        { speaker: "Tourist", text: "Thank you! I have to say, the moment we arrived, I felt like I had stepped into another century. Everything is so different from what I expected." },
        { speaker: "Tourist Guide", text: "That reaction is very common here. The city has managed something quite rare — genuine continuity with the past. These wooden buildings in the district we're walking through date back several centuries." },
        { speaker: "Tourist", text: "And people actually live in them? They're not just museums?" },
        { speaker: "Tourist Guide", text: "Yes, many are family homes that have been passed down for generations. That is precisely what makes this place alive rather than simply preserved. It's a community, not a display case." },
        { speaker: "Tourist", text: "What are those amazing gates we saw earlier? The red ones that seemed to go on forever?" },
        { speaker: "Tourist Guide", text: "Those are called torii gates. Each one is a donation from an individual or company, offered to the shrine as an act of gratitude or prayer. There are thousands of them, and they create this extraordinary tunnel effect as you walk through." },
        { speaker: "Tourist", text: "It was genuinely breathtaking. And the light coming through the trees made it feel almost spiritual." },
        { speaker: "Tourist Guide", text: "That's intentional. The experience of approaching a sacred space was designed to gradually shift your state of mind — from the ordinary world to something more reflective. Architecture as transformation, you might say." },
        { speaker: "Tourist", text: "That's beautiful. I'd love to come back in spring, when I heard the blossoms are extraordinary." },
        { speaker: "Tourist Guide", text: "Spring here is unlike anywhere else on earth. For about two weeks, the entire city is in bloom. The petals fall like gentle snow. It is impermanent and perfect — which, interestingly, is a central concept in the local philosophy of beauty." },
        { speaker: "Tourist", text: "Finding beauty in things that don't last. I think we could all learn something from that." },
        { speaker: "Tourist Guide", text: "Indeed. And that, perhaps, is the greatest lesson this remarkable place has to offer." }
      ]
    }
  },

  catFeedback: {
    correct: [
      "Purrr-fect! That's exactly right! You're really getting the hang of this!",
      "Meow-nificent! Correct answer! You're on fire today!",
      "Yes! Yes! Yes! You got it! I'm so proud of you right now!",
      "That's my human! Absolutely correct! Keep up this amazing work!",
      "Brilliant! You nailed that one! I might just purr all day now!"
    ],
    incorrect: [
      "Oh no, not quite... Don't worry, every mistake is a lesson in disguise!",
      "Hmm, that wasn't it. Let me help you think through this one...",
      "Close, but not quite! The right answer might surprise you. Read the explanation!",
      "Oops! Even cats miss sometimes. The important thing is we keep going!",
      "Not this time! But the explanation below will make it crystal clear."
    ],
    idle: [
      "Psst! I'm watching over your lesson progress. You're doing great!",
      "Did you know? Reading aloud improves language retention by up to 40%!",
      "Take it step by step. Consistency beats intensity every time!",
      "I noticed you're working hard today. That dedication is what makes learners succeed!",
      "Fun fact: The word 'algorithm' comes from the name of a 9th-century Persian mathematician!"
    ],
    lessonIntro: "Welcome to today's lesson on Digital Technology! I'll be your guide throughout. We're exploring how technology shapes our lives — a topic that's incredibly relevant at B1 level and beyond. Ready? Let's dive in!",
    moduleIntro: {
      lesson: "Time for the Daily English Lesson! We have 10 exciting steps to work through together. I'll be here to cheer you on and help explain anything that's tricky.",
      conversation: "Now for the Conversation Game! You'll be navigating a real-world job interview scenario. Listen carefully to what the characters say — the right path is logical but you need to think it through!",
      place: "Ooh, the Place Guessing Game! This is one of my favourites. Read the description carefully and use the clues wisely. I believe in you!"
    }
  },

  stepImages: {
    warmup: "diverse students brainstorming discussion classroom",
    keywords: "vocabulary flashcards language learning books",
    listen: "people having conversation coffee shop casual",
    reading: "person reading digital tablet modern library",
    speaking: "person speaking microphone podcast recording",
    grammar: "language grammar book study education",
    drama: "radio studio microphone broadcast vintage",
    dictation: "person writing notebook listening headphones study",
    discussion: "social media comments discussion online",
    quiz: "student taking test exam classroom education"
  },

  keywordTranslations: {
    es: { "digital literacy": "alfabetización digital", "algorithm": "algoritmo", "screen time": "tiempo de pantalla", "connectivity": "conectividad", "cybersecurity": "ciberseguridad" },
    fr: { "digital literacy": "littératie numérique", "algorithm": "algorithme", "screen time": "temps d'écran", "connectivity": "connectivité", "cybersecurity": "cybersécurité" },
    de: { "digital literacy": "digitale Kompetenz", "algorithm": "Algorithmus", "screen time": "Bildschirmzeit", "connectivity": "Konnektivität", "cybersecurity": "Cybersicherheit" },
    ja: { "digital literacy": "デジタルリテラシー", "algorithm": "アルゴリズム", "screen time": "スクリーンタイム", "connectivity": "接続性", "cybersecurity": "サイバーセキュリティ" },
    zh: { "digital literacy": "数字素养", "algorithm": "算法", "screen time": "屏幕时间", "connectivity": "连接性", "cybersecurity": "网络安全" },
    ar: { "digital literacy": "المعرفة الرقمية", "algorithm": "خوارزمية", "screen time": "وقت الشاشة", "connectivity": "الاتصال", "cybersecurity": "الأمن السيبراني" },
    pt: { "digital literacy": "literacia digital", "algorithm": "algoritmo", "screen time": "tempo de tela", "connectivity": "conectividade", "cybersecurity": "cibersegurança" },
    ko: { "digital literacy": "디지털 리터러시", "algorithm": "알고리즘", "screen time": "스크린 타임", "connectivity": "연결성", "cybersecurity": "사이버 보안" }
  }
};

/**
 * Daily Lesson — mock data (ported from the Daily_Lesson app's lessonData).
 * The canonical sample is "The Digital Age" B1 lesson with all 10 steps plus
 * the Conversation Game, Guess the Place and cat mascot feedback.
 */
import type { DailyLessonData } from '../pages/daily/dailyTypes';

const sampleDailyLessonRaw = defaultLessonData as unknown as DailyLessonData;

/** Build a fresh copy of the mock lesson data. */
export const buildDailyLessonMock = (): DailyLessonData =>
  JSON.parse(JSON.stringify(sampleDailyLessonRaw));

/** Build the JSON string shown in the Manual Creator's JSON editor. */
export const buildDailyLessonMockJson = (learner?: any): string =>
  JSON.stringify({
    learnerName: learner?.name || 'Demo Learner',
    lesson: buildDailyLessonMock(),
  }, null, 2);

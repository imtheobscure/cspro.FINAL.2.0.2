/** Social deduction banks. Nothing in a statement names a role: every line fits at least two people. */

export type Suspect = { name: string; seed: string; job: string; alibi: string };
export type AlibiCase = {
  id: string;
  scene: string;
  crime: string;
  facts: string[];
  suspects: Suspect[];
  liar: number;
  contradiction: string;
  language: string;
  questions: string[];
};

export const ALIBI_CASES: AlibiCase[] = [
  { id: "al1", scene: "The Grand Meridian Hotel, 23:40", crime: "Someone emptied the mini-bar fridge in room 402 and left a boarding pass behind.",
    facts: ["The lift was out of service from 23:00.", "Reception closes at 23:00 and the keypad code is texted at 22:00.", "It rained heavily from 23:15 until midnight.", "Room 402 is on the fourth floor."],
    language: "Past continuous, past perfect, prepositions of time",
    questions: ["Where exactly were you between eleven and midnight?", "Who saw you?", "How did you get to your floor?", "What were you wearing when you came in?"],
    suspects: [
      { name: "Bea Oyelaran", seed: "Bea", job: "Night auditor", alibi: "I was balancing the till from eleven until well past midnight. The printer jammed twice, so the receipts have timestamps all over them. I never left the desk, and I heard the rain hammering the glass doors the whole time." },
      { name: "Colin Vance", seed: "Colin", job: "Travelling salesman", alibi: "I got back soaked at about twenty past eleven, took the lift straight up to the fourth floor and went to bed. I'd been at a dinner across the square, and I'd already texted my wife that I'd be late." },
      { name: "Marta Reiss", seed: "Marta", job: "Wedding guest", alibi: "I was in the bar downstairs until closing with two cousins, then we stood under the awning outside because the rain was ridiculous. I came up the stairs at about half past midnight, laughing too loudly, I'm afraid." },
      { name: "Dan Ferris", seed: "Dan", job: "Kitchen porter", alibi: "I finished at eleven and I'd been cleaning the fryers since nine. I walked home in the rain and my flatmate was still awake watching the football, so he'll tell you what time I came through the door." },
      { name: "Priya Kaul", seed: "Priya", job: "Airline crew", alibi: "My crew landed at ten and we checked in together just before eleven. I took the stairs because the lift was already taped off, and I was asleep before the rain started." },
    ],
    liar: 1,
    contradiction: "Colin says he 'took the lift straight up' at 11:20, but the lift was out of service from 23:00 — Priya even found it taped off. He also lost a boarding pass he claims he never needed." },

  { id: "al2", scene: "Northgate Office, Monday 08:55", crime: "The quarterly figures were changed overnight from a locked meeting room.",
    facts: ["The building's badge system logs every door after 18:00.", "The cleaners work between 19:00 and 21:00 on Sundays.", "The meeting-room screen was left showing a spreadsheet at 07:00.", "The car park barrier was broken all weekend, so no car was recorded."],
    language: "Past perfect, modals of deduction, reported speech",
    questions: ["What did you badge into on Sunday?", "Who else was in the building?", "When did you last open that file?", "How did you get in and out?"],
    suspects: [
      { name: "Tomas Berg", seed: "Tomas", job: "Finance analyst", alibi: "I was at my sister's christening all Sunday and didn't touch a laptop. I'd sent the final version on Friday night, and honestly I assumed nobody would look at it until Tuesday." },
      { name: "Rachel Nowak", seed: "Rachel", job: "Office manager", alibi: "I came in around eight on Sunday evening to let the cleaners out, badged in at the side door, and left with them. I never went past the kitchen, and I'd have noticed the screen because that corridor is glass." },
      { name: "Ade Mensah", seed: "Ade", job: "IT support", alibi: "I was on call but I worked remotely. I pushed an update at half nine and went to bed. If anyone had badged in after the cleaners, my dashboard would have pinged me, and it stayed quiet." },
      { name: "Elena Costa", seed: "Elena", job: "Sales lead", alibi: "I drove over about eleven at night to pick up a charger. The barrier was broken so I parked right outside, ran up, grabbed it and left — two minutes, no more. I didn't badge anything because the side door was still on the latch." },
      { name: "Gareth Shaw", seed: "Gareth", job: "Facilities", alibi: "I was in Cardiff until Monday morning. My train ticket is in my jacket and I arrived at the office at ten to nine, which is when I found the screen still on." },
    ],
    liar: 3,
    contradiction: "Elena says the side door was 'still on the latch' at 23:00, but Rachel locked it when she left with the cleaners at 21:00, and every door after 18:00 is logged — there is no entry for Elena because she propped it open earlier." },

  { id: "al3", scene: "Platform 3, 06:02 service to Manchester", crime: "A laptop bag vanished from the luggage rack between two stations.",
    facts: ["The train stopped only once, at Stockport, for four minutes.", "The buffet trolley ran from coach C to coach A after Stockport.", "Coach B's doors were faulty and did not open at Stockport.", "It was still dark until 07:10."],
    language: "Past simple vs past continuous, prepositions of place",
    questions: ["Which coach were you in?", "Did you move during the journey?", "What did you see at Stockport?", "Who was standing near the rack?"],
    suspects: [
      { name: "Nils Haugen", seed: "Nils", job: "Consultant", alibi: "I was in coach B the entire time, working on a deck with my headphones on. I remember being annoyed because the doors didn't open at Stockport and I wanted a coffee from the platform." },
      { name: "Sadie Cross", seed: "Sadie", job: "Nurse", alibi: "I'd just come off a night shift, so I slept from the moment we pulled out. The trolley woke me somewhere after Stockport and I bought a tea. I never stood up before that." },
      { name: "Owen Pryce", seed: "Owen", job: "Student", alibi: "I got on at Stockport into coach B, found a seat by the rack and stayed there. The platform was freezing and pitch black, so I was glad to get in quickly." },
      { name: "Ivy Chen", seed: "Ivy", job: "Photographer", alibi: "I was in coach A shooting the sunrise through the window, which is why I know it was still dark at Stockport. I didn't move until the trolley came past me last." },
      { name: "Robert Adeyemi", seed: "Robert", job: "Train manager", alibi: "I walked the train twice, checking tickets from A to C and back. I reported the faulty doors in coach B at Stockport and asked passengers to use coach A or C." },
    ],
    liar: 2,
    contradiction: "Owen claims he boarded 'at Stockport into coach B', but coach B's doors never opened there — the train manager reported the fault and redirected everyone to coaches A and C." },

  { id: "al4", scene: "Lakeside Language School, end-of-term party", crime: "Someone read the final exam paper from the staffroom printer.",
    facts: ["The printer only releases a job when a staff card is tapped.", "The staffroom window was painted shut last summer.", "The party ran from 19:00 to 23:00 in the hall, two floors below.", "The exam was printed at 21:14."],
    language: "Causative, passive voice, present perfect",
    questions: ["Where were you at quarter past nine?", "Whose card did you use?", "Who left the hall and when?", "Did you hear the printer?"],
    suspects: [
      { name: "Hannah Okoro", seed: "Hannah", job: "Teacher", alibi: "I was pouring drinks from nine until the music stopped. I'd had my card replaced that morning because the old one snapped, and the new one hadn't been activated yet." },
      { name: "Luca Ferretti", seed: "Luca", job: "Caretaker", alibi: "I was fixing the fuse in the hall cupboard around nine. I came up once, about ten, to open the staffroom window for some air, then went straight back down." },
      { name: "Meera Rao", seed: "Meera", job: "Exams officer", alibi: "I printed the reading paper on Thursday and locked it away. On the night I was on the door taking coats until half ten, and about forty people can confirm that." },
      { name: "Sam Whitlock", seed: "Sam", job: "Trainee", alibi: "I went up to the staffroom just after nine to get my coat. I didn't tap anything — the printer was already humming when I walked in, so I assumed someone had beaten me to it." },
      { name: "Dr Fadi Haddad", seed: "Fadi", job: "Director", alibi: "I made a speech at nine and stayed in the hall until the end. My card has been in my desk drawer since I lost my lanyard in April." },
    ],
    liar: 1,
    contradiction: "Luca says he 'opened the staffroom window for some air' — but the window was painted shut last summer, which is exactly the job he signed off himself." },

  { id: "al5", scene: "Harbour Café, Saturday lunchtime", crime: "The takings from the till disappeared during a twenty-minute power cut.",
    facts: ["The power cut ran from 13:10 to 13:30 and the card machine was dead.", "The back door sets off a chime that runs on a battery.", "The café only takes cash when the card machine is down.", "CCTV lost power with everything else."],
    language: "Past continuous, quantifiers, there is/are",
    questions: ["What were you doing when the lights went out?", "Did anyone go through the back?", "How much cash was taken that day?", "Who was behind the counter?"],
    suspects: [
      { name: "Grace Bello", seed: "Grace", job: "Barista", alibi: "I was calming a queue of about fifteen people with a torch on my phone. We took cash and I wrote every order on a napkin, which is still behind the counter." },
      { name: "Teddy Marsh", seed: "Teddy", job: "Regular customer", alibi: "I was sitting by the window the whole time doing the crossword. I paid by card at one, just before everything died, and I stayed until the lights came back." },
      { name: "Nina Silva", seed: "Nina", job: "Delivery rider", alibi: "I came in for a pickup at quarter past one and left through the back because the front was jammed with people. I didn't hear the chime — it must be broken." },
      { name: "Callum Doyle", seed: "Callum", job: "Kitchen assistant", alibi: "I was plating three brunches in the dark and burnt my hand on the pass. I never went near the till; Grace had the only key on a string round her neck." },
      { name: "Wendy Park", seed: "Wendy", job: "Owner", alibi: "I was at the cash and carry and got back at two to find the door propped open. The float was short by about two hundred." },
    ],
    liar: 2,
    contradiction: "Nina claims she left by the back door and 'didn't hear the chime' because it must be broken — but the chime runs on a battery, so it was the one thing the power cut could not silence. Teddy also paid by card at 13:00, proving the outage started after she arrived." },
];

export type SpyRole = { role: string; prompt: string };
export type SpyLocation = { id: string; name: string; emoji: string; roles: SpyRole[]; starters: string[] };

export const SPY_LOCATIONS: SpyLocation[] = [
  { id: "sp1", name: "Long-haul flight", emoji: "✈️",
    roles: [
      { role: "Cabin crew member", prompt: "You have done this route 200 times." },
      { role: "Nervous first-time flyer", prompt: "You count every noise." },
      { role: "Air marshal", prompt: "You are watching everyone quietly." },
      { role: "Business traveller", prompt: "You care only about the wifi." },
      { role: "Parent with a toddler", prompt: "You have not sat down yet." },
      { role: "Off-duty pilot", prompt: "You know exactly what that sound was." },
      { role: "Food-allergy passenger", prompt: "You asked three times about the meal." },
      { role: "Influencer", prompt: "You need the window for content." }],
    starters: ["How long have you been doing this?", "Would you sit here again?", "What's the worst part of the night?"] },
  { id: "sp2", name: "Hospital night shift", emoji: "🏥",
    roles: [
      { role: "Senior nurse", prompt: "You run the floor." },
      { role: "Exhausted junior doctor", prompt: "Hour fourteen." },
      { role: "Worried relative", prompt: "You are not supposed to be here." },
      { role: "Cleaner", prompt: "You know every corridor." },
      { role: "Ambulance driver", prompt: "You are waiting for a handover." },
      { role: "Pharmacist", prompt: "You count things twice." },
      { role: "Security guard", prompt: "You watch the doors." },
      { role: "Patient who can't sleep", prompt: "You hear everything." }],
    starters: ["When does it get quiet here?", "Who do you call when it goes wrong?", "How many coffees so far?"] },
  { id: "sp3", name: "Wedding reception", emoji: "💒",
    roles: [
      { role: "Best man", prompt: "Your speech is in your pocket." },
      { role: "Caterer", prompt: "You are counting plates." },
      { role: "Ex of the bride", prompt: "You were invited by mistake." },
      { role: "Wedding photographer", prompt: "You need everyone outside in ten minutes." },
      { role: "Grandmother", prompt: "You have opinions about the music." },
      { role: "DJ", prompt: "Nobody is dancing yet." },
      { role: "Child guest", prompt: "You are under the table." },
      { role: "Venue manager", prompt: "The bar closes at midnight, whatever they say." }],
    starters: ["How do you know the couple?", "Which side are you on?", "What time do you think this ends?"] },
  { id: "sp4", name: "Tech startup office", emoji: "💻",
    roles: [
      { role: "Founder", prompt: "You are always pitching." },
      { role: "Intern", prompt: "You don't know what anyone does." },
      { role: "Investor on a visit", prompt: "You are doing the maths." },
      { role: "Burnt-out developer", prompt: "You have been here since Thursday." },
      { role: "Office dog owner", prompt: "The dog outranks you." },
      { role: "HR consultant", prompt: "You are here about an incident." },
      { role: "Designer", prompt: "Nobody reads your documents." },
      { role: "Cleaner", prompt: "You move their cables and they panic." }],
    starters: ["What are we shipping this week?", "Who actually decides here?", "How long have you been with us?"] },
  { id: "sp5", name: "Cruise ship at sea", emoji: "🛳️",
    roles: [
      { role: "Captain", prompt: "You never look worried." },
      { role: "Entertainer", prompt: "Three shows a night." },
      { role: "Honeymooner", prompt: "You have not left the balcony." },
      { role: "Engineer", prompt: "You live below the waterline." },
      { role: "Sea-sick passenger", prompt: "You regret everything." },
      { role: "Casino dealer", prompt: "You see who is losing." },
      { role: "Kids' club leader", prompt: "You are hoarse." },
      { role: "Retired couple on their 30th cruise", prompt: "You know the menu by heart." }],
    starters: ["What deck are you on?", "Have you seen the weather forecast?", "Is it always this busy?"] },
  { id: "sp6", name: "Film set", emoji: "🎬",
    roles: [
      { role: "Director", prompt: "You are two days behind." },
      { role: "Stunt double", prompt: "You are padded under the costume." },
      { role: "Extra", prompt: "You have one line and you're nervous." },
      { role: "Sound engineer", prompt: "Everyone ruins your take." },
      { role: "Lead actor's assistant", prompt: "You carry three phones." },
      { role: "Caterer", prompt: "You feed 120 people at once." },
      { role: "Location owner", prompt: "This is your house." },
      { role: "Journalist on a set visit", prompt: "You are looking for a story." }],
    starters: ["How many takes so far?", "Who's the hardest person here?", "When do we wrap?"] },
];

export type MafiaChar = { n: string; seed: string; role: string; s: string; tell?: string; rank?: 1 | 2 | 3 };
export type MafiaCast = { id: string; title: string; flavour: string; hidden: string; cast: MafiaChar[]; culprits: number[]; report: string };

export const MAFIA_CASTS: MafiaCast[] = [
  { id: "mf1", title: "The Village of Thornwood", hidden: "Werewolf", flavour: "Two of the eight howl at night. Nothing in a statement names a role.",
    cast: [
      { n: "Alder", seed: "Alder", role: "Baker", s: "I was up before anyone, as usual. If the mud outside had been disturbed, my ovens would have told me — the cold comes straight through that door." },
      { n: "Bramble", seed: "Bramble", role: "Werewolf", s: "I sleep badly and I walk it off. Last night I went as far as the treeline and came back with nothing but wet boots and a headache.", tell: "'as far as the treeline' — nobody else admits to leaving the village, and the treeline is exactly where the tracks stop.", rank: 1 },
      { n: "Cedar", seed: "Cedar", role: "Watchman", s: "My job is to notice, and I noticed nothing, which bothers me more than if I had. Somebody moved quietly enough to teach me something." },
      { n: "Dove", seed: "Dove", role: "Herbalist", s: "I was mixing until late; the smell sticks to your hands for days. If you want to accuse me, smell my sleeves first." },
      { n: "Elm", seed: "Elm", role: "Blacksmith", s: "I hammer until my arms give out, then I sleep like a stone. I'd not hear a cart go through my own kitchen." },
      { n: "Fern", seed: "Fern", role: "Werewolf", s: "We should be calm about this. Panic makes people accuse the quiet ones, and the quiet ones are usually just tired.", tell: "'the quiet ones are usually just tired' — a defence offered before anyone had been accused.", rank: 2 },
      { n: "Gorse", seed: "Gorse", role: "Innkeeper", s: "My door was bolted at eleven and I counted the tankards twice. Three were missing, which tells you somebody drank somewhere they shouldn't." },
      { n: "Hazel", seed: "Hazel", role: "Hunter", s: "I read tracks for a living, and this morning the ones near the treeline were wrong — too deep, too long a stride.", tell: "'too deep, too long a stride' — a genuine clue that points at whoever admits to walking that way.", rank: 3 }],
    culprits: [1, 5],
    report: "Bramble placed himself at the treeline where Hazel found the deep tracks — the only overlap between an alibi and evidence. Fern defended the quiet before anyone attacked them, a classic pre-emptive shield. Every other line fits two or more roles: Cedar's 'I noticed nothing' works equally for a watchman and a heavy sleeper." },

  { id: "mf2", title: "The Midnight Newsroom", hidden: "Mafia", flavour: "A leaked story, eight staff, two on the payroll of someone else.",
    cast: [
      { n: "Rosa", seed: "Rosa", role: "Night editor", s: "I signed off the front page at one and went home. If something changed after that, it changed without my initials on it." },
      { n: "Victor", seed: "Victor", role: "Mafia", s: "I was chasing a second source until late. You can check my call log — although half those numbers won't answer for anyone but me.", tell: "'won't answer for anyone but me' — an alibi built so that nobody else can verify it.", rank: 1 },
      { n: "Anita", seed: "Anita", role: "Sub-editor", s: "I read every word twice. The paragraph everyone is arguing about wasn't there at midnight, and I'd swear to that in front of the owner." },
      { n: "Jonah", seed: "Jonah", role: "Photographer", s: "I was in the darkroom, which is exactly as convenient as it sounds. Nobody saw me, and I saw nobody, and that's the job." },
      { n: "Delphine", seed: "Delphine", role: "Mafia", s: "Let's not turn on each other over one paragraph. Newsrooms leak; that's practically what they're for.", tell: "'that's practically what they're for' — normalising the crime is a way of closing the investigation.", rank: 2 },
      { n: "Sam", seed: "Sam", role: "Intern", s: "I fetched coffee and I read over shoulders. I know the story changed, because the screen I was standing behind had a different second line at half past twelve.", tell: "'a different second line at half past twelve' — narrows the edit window to after Rosa signed off.", rank: 3 },
      { n: "Ifeoma", seed: "Ifeoma", role: "Legal adviser", s: "I flagged three risks and I was ignored on two of them. If you want to know who wanted this printed, ask who argued with me." },
      { n: "Bruno", seed: "Bruno", role: "Print manager", s: "The presses ran at two. Whatever was in the file at two is what's on doorsteps now, and nobody on this floor can change that afterwards." }],
    culprits: [1, 4],
    report: "Sam's timing evidence puts the edit after Rosa's sign-off, and Victor is the only person who claims to be working then with an unverifiable alibi. Delphine never defends herself — she defends leaking itself, which is the tell teams miss most often." },

  { id: "mf3", title: "The Research Station, Antarctica", hidden: "Saboteur", flavour: "The generator failed twice. Eight scientists, two saboteurs, one radio.",
    cast: [
      { n: "Dr Ng", seed: "Ng", role: "Station chief", s: "I ration everything, including trust. Last night I did my rounds at two and every door was where I left it." },
      { n: "Marek", seed: "Marek", role: "Saboteur", s: "I was in the generator room, obviously — I'm there most nights. If I'd wanted it to fail, it would have failed properly the first time.", tell: "'it would have failed properly' — describing how to break it well is knowledge nobody else volunteers.", rank: 1 },
      { n: "Sofia", seed: "Sofia", role: "Biologist", s: "My samples need a steady temperature, so the outage cost me eleven days of work. I've been awake since the alarm and I'm furious about it." },
      { n: "Luis", seed: "Luis", role: "Medic", s: "I treat frostbite and boredom, roughly in that order. I was with Sofia when the lights went, and neither of us moved." },
      { n: "Anke", seed: "Anke", role: "Saboteur", s: "Could we please stop talking about who was where? The generator is forty years old. Sometimes a machine is just a machine.", tell: "'sometimes a machine is just a machine' — the only person arguing that no crime happened.", rank: 2 },
      { n: "Tomás", seed: "Tomas", role: "Radio operator", s: "I logged a transmission at 01:52 that wasn't scheduled. Eight seconds, no voice. I've put it in the book.", tell: "An unscheduled transmission minutes before the second failure.", rank: 3 },
      { n: "Grete", seed: "Grete", role: "Engineer", s: "I rebuilt that generator last winter and I know its noises. What I heard last night was not a fault; it was a sequence." },
      { n: "Owen", seed: "Owen", role: "Cook", s: "I'm up at four whatever happens. The kitchen was dark and the freezer alarm never sounded, which means the power came back faster than they're telling you." }],
    culprits: [1, 4],
    report: "Grete heard 'a sequence', Tomás logged an unscheduled 8-second transmission, and Marek was the only person with hands on the machine — plus he explained how he would have done it better. Anke's insistence that nothing happened is the second tell." },

  { id: "mf4", title: "The Boarding School, Founders' Night", hidden: "Prankster", flavour: "The clock tower chimed thirty-seven times. Two pupils are responsible.",
    cast: [
      { n: "Ivy", seed: "IvyS", role: "Head girl", s: "I was checking dorms until eleven and I signed the register. Whoever did this planned it well, and I'd almost admire them if I didn't have to write the report." },
      { n: "Felix", seed: "Felix", role: "Prankster", s: "I was in the music room practising scales. The acoustics up there are terrible, so nobody could tell you which notes I actually played.", tell: "'nobody could tell you which notes I actually played' — an alibi that deliberately erases itself.", rank: 1 },
      { n: "Nadia", seed: "Nadia", role: "Scholarship student", s: "I can't afford trouble, so I was in the library until it closed. The librarian will remember me because I asked her twice about the tower's history." },
      { n: "Otis", seed: "Otis", role: "Groundskeeper's son", s: "I know where every key is kept, which is why everyone's looking at me. Knowing where a key is isn't the same as using it." },
      { n: "Bea", seed: "BeaB", role: "Prankster", s: "Honestly, it's harmless. In twenty years this will be the only thing anybody remembers about Founders' Night.", tell: "'it's harmless' — the only person arguing the outcome, not their whereabouts.", rank: 2 },
      { n: "Hugo", seed: "Hugo", role: "Prefect", s: "I heard footsteps on the east stair at about ten past ten, two sets, going up. I assumed it was staff and went back to bed.", tell: "Two sets of footsteps: confirmation that the culprits worked in a pair.", rank: 3 },
      { n: "Priya", seed: "PriyaS", role: "Choir lead", s: "We rehearsed until half nine in the chapel, then I took the west corridor back. The tower door was shut when I passed it." },
      { n: "Callum", seed: "CallumS", role: "New boy", s: "I've been here three weeks and I still get lost. I was in the wrong building for most of the evening, which apparently isn't an alibi." }],
    culprits: [1, 4],
    report: "Hugo heard two sets of footsteps on the east stair; Felix's alibi is unverifiable by design and the music room is on that stair. Bea never says where she was — she argues the prank was harmless, which only the guilty bother to do." },

  { id: "mf5", title: "The Airport Ground Crew", hidden: "Smuggler", flavour: "A bag that was never checked in reached the hold. Two people made it possible.",
    cast: [
      { n: "Dee", seed: "Dee", role: "Loader", s: "I load what the belt gives me. If there was a bag without a tag, it didn't pass my scanner, and my scanner logs every beep." },
      { n: "Radu", seed: "Radu", role: "Smuggler", s: "I was covering two stands at once because we were short-handed. Half the shift can tell you I was nowhere, which is the same as everywhere.", tell: "'nowhere, which is the same as everywhere' — mobility across stands with no fixed witness.", rank: 1 },
      { n: "Halima", seed: "Halima", role: "Gate agent", s: "My count matched the manifest at the gate. If an extra bag went down there, it didn't come through a passenger I scanned." },
      { n: "Pete", seed: "Pete", role: "Push-back driver", s: "I was in the cab with the radio on. The only thing I saw was a trolley by stand 14 that didn't belong to anyone I recognised.", tell: "An unclaimed trolley at stand 14 — physical evidence pinned to a place.", rank: 3 },
      { n: "Ana", seed: "Ana", role: "Smuggler", s: "Airports lose bags every day. We're standing here accusing each other over paperwork that goes wrong a hundred times a week.", tell: "Reframing a security breach as routine paperwork keeps the group from looking closely.", rank: 2 },
      { n: "Jaz", seed: "Jaz", role: "Security officer", s: "I ran the late sweep and the seal on the hold was intact when I checked at 04:10. That means it went in before four." },
      { n: "Bruno", seed: "BrunoA", role: "Supervisor", s: "I signed the short-staffing form myself, and I'd sign it again. We were two people down and that is a management failure, not a crime." },
      { n: "Mel", seed: "Mel", role: "Dispatcher", s: "Stand 14 was reassigned at 03:40 and I told everyone on channel two. If somebody was still working the old stand, they weren't listening to me." }],
    culprits: [1, 4],
    report: "Mel reassigned stand 14 at 03:40, Pete saw an unclaimed trolley there, and Radu is the only person who admits moving between stands without a witness. Ana's line minimises the breach instead of explaining her own movements — the second tell, and the one most classes miss." },
];

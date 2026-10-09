/**
 * Built-in content for the two mode-games that need a whole cast to work:
 * **Spyfall** and **Alibi Puzzle**.
 *
 * Why this file exists: those two games are not question cards. Spyfall needs a
 * location, a job and six people who each say something; Alibi needs a situation
 * and five suspects who each tell a long story. Until now the only source of that
 * was the AI content JSON — and the Copy-AI prompt is best-effort: when a lesson
 * came back without `spyfallData` or without `suspects`, picking either tile from
 * the menu ended in "No data found for this mode" (Spyfall) or an empty row of
 * suspects (Alibi). The engine now falls back to this library, so both games are
 * playable on every lesson, including a hand-written one.
 *
 * Two conventions the voice layer depends on, so they are not optional:
 *  · every character carries `gender` ('male' | 'female'), which the game uses to
 *    pick a read-aloud voice that matches the character — a class should never
 *    hear a woman speaking in a man's voice, or eight people sounding like one
 *    person;
 *  · nothing here names a role, the location or the guilty suspect outright. The
 *    gameplay is entirely in what the class notices, so a giveaway is a bug.
 */

export interface BuiltinSuspect {
    name: string;
    gender: 'male' | 'female';
    alibi: string;
    isGuilty: boolean;
}

export interface BuiltinAlibiRound {
    id: string;
    /** The situation the class reads before interrogating (100+ words). */
    context: string;
    question: string;
    suspects: BuiltinSuspect[];
}

export interface BuiltinSpyPlayer {
    name: string;
    gender: 'male' | 'female';
    avatarSeed: string;
    statement: string;
    isSpy: boolean;
}

export interface BuiltinSpyRound {
    id: string;
    location: string;
    job: string;
    players: BuiltinSpyPlayer[];
}

/* ------------------------------------------------------------------ ALIBI ---- */

export const BUILTIN_ALIBI: BuiltinAlibiRound[] = [
    {
        id: 'alibi_builtin_laptop',
        context:
            'The lesson laptop went missing from the staff room during the fifteen-minute break. The room was locked, but the door is old and sticks unless you lift the handle, so anyone who uses it often knows the trick. ' +
            'The break started at 10:30 and the bell went at 10:45. Three people were seen in the corridor during that time: the receptionist, who was carrying a tray, a student who was looking for the music room, and a teacher who says he was photocopying. ' +
            'The photocopier log shows one job at 10:38: forty copies of a grammar worksheet. The cleaner had already finished and left at 10:25, and the caretaker was outside fixing the gate the whole time — the gate camera shows his van at the main gate at 10:20 and again at 10:50, and he did not come back through reception until after the bell. ' +
            'The laptop was on the desk next to the window, plugged in, with a blue sticker on the lid. When the class came back at 10:47, the charger was still in the wall but the laptop was gone. Nobody heard the door or saw anyone carry anything out. ' +
            'Your job is to find the one person whose account cannot be true, by asking about times, places and what they could see from where they were standing.',
        question: 'Who took the laptop?',
        suspects: [
            {
                name: 'Marta Reyes',
                gender: 'female',
                alibi:
                    'I was in the staff room for the whole break, marking vocabulary tests at the long table by the door. I only stood up once, to refill my water bottle from the cooler in the corner. I saw the receptionist walk past with a tray of cups and I heard the photocopier start up, which is why I looked at the clock: it was about ten thirty-eight. I never went near the window desk, and I certainly did not touch the laptop, because it belongs to the school and I already have one at home. If the door was opened I would have noticed, because it sticks and makes a loud click.',
                isGuilty: false,
            },
            {
                name: 'Tomas Brandt',
                gender: 'male',
                alibi:
                    'I was at the photocopier for most of the break, running off a worksheet for my eleven o clock class. The machine jammed twice, so I was standing right next to it, feeding the tray and waiting. I could see the corridor through the glass panel in the door but I was not watching it closely. I did walk back past the staff room on my way to the classroom, but I was carrying a stack of paper, so I used my shoulder against the door instead of my hands. I did not go in. Nobody asked me for help with anything.',
                isGuilty: false,
            },
            {
                name: 'Amina Haddad',
                gender: 'female',
                alibi:
                    'The break is my busiest fifteen minutes: I was behind the reception desk the whole time, printing attendance sheets and answering the phone to a parent who wanted to change a pick-up time. I did carry a tray of cups to the staff room, but only as far as the door, because my hands were full and the door sticks. I left the tray on the shelf outside and went straight back to the desk. From reception I can see the corridor, and I saw a student heading towards the music room and the caretaker going out of the front door with his toolbox. I did not enter the staff room at any point.',
                isGuilty: true,
            },
            {
                name: 'Peter Novak',
                gender: 'male',
                alibi:
                    'I was outside on the gate, which had dropped on its hinges and would not close properly. I was there from about ten twenty-five until the bell, kneeling in the cold with a spanner in my hand. I could hear the photocopier through the open window, which tells you someone was inside, but I could not see the corridor from where I was. I did not come in at all, because my hands were black with grease; I sent one of the students to fetch a longer screwdriver from the cupboard by reception for me. Ask him, he will remember.',
                isGuilty: false,
            },
            {
                name: 'Sofia Lindqvist',
                gender: 'female',
                alibi:
                    'I had a free period, so I took my coffee to the small room next to the library to look at some exam papers. It is quiet there and the door closes properly. I heard the bell go and I came out with my mug, which is when I saw that the staff room door was open and the desk under the window was empty. I told the head of department straight away, before anyone else noticed. I did not go into the staff room during the break at all, and I did not even know the laptop was there until this morning.',
                isGuilty: false,
            },
        ],
    },
    {
        id: 'alibi_builtin_window',
        context:
            'A window in the school greenhouse was broken at some point on Thursday afternoon. The gardener found it at six o clock and called the caretaker. Nothing was taken: the tools, the seed trays and the locked cupboard were all untouched. ' +
            'The greenhouse stands at the end of the sports field, next to the changing rooms, and the broken pane is on the side that faces the running track. Two people had a reason to be in that corner of the field during the afternoon: a tennis group, whose lesson ran from two until three, and the athletics club, which starts at half past three. ' +
            'There was a football match in the hall because of the rain, so most of the school was indoors. The snow on the ground had started to melt, and there were footprints on the path between the track and the greenhouse, but they were partly rained away by five o clock. ' +
            'Two facts were checked and are not in dispute. First, the pane broke outwards, as if something hit it from inside, and a red tennis ball was found on the grass a metre from the wall. Second, the caretaker walked the path past the greenhouse at 15:05 and the glass was whole then, and a seed tray was the only thing out of place inside — the floor of the greenhouse was swept and clean, with no broken pot and no glass in it. Your job is to find the person whose story does not fit those two facts.',
        question: 'Who broke the greenhouse window?',
        suspects: [
            {
                name: 'Daniel Okafor',
                gender: 'male',
                alibi:
                    'I was on the field with the tennis group until about three, and afterwards I stayed behind to pick up the cones and the basket of balls, which is part of my job. I had that basket with me the whole time, so if a ball ended up near the greenhouse it came from my basket rather than from anything I threw. I noticed the broken pane when I was walking back to the storeroom, and I told the head of sport immediately, which is how it got into the report so quickly. I did not go right up to the greenhouse, because the door was locked.',
                isGuilty: false,
            },
            {
                name: 'Hannah Weiss',
                gender: 'female',
                alibi:
                    'I finished my marking at half past three and walked across the field to the car park, because I live on the other side of town. I took the path along the running track so I would not walk through the puddles, which is the route anyone would take in that weather. I did not stop and I did not see anybody near the greenhouse, though I would say the light was already poor. I heard glass moving under my shoes, but that was on the path, and I thought it was ice rather than anything else. I did not look at the window at all.',
                isGuilty: false,
            },
            {
                name: 'Oliver Grant',
                gender: 'male',
                alibi:
                    'The football match kept everyone in the hall until four, so I was coaching indoors with forty students and two other teachers, all of whom can confirm it. When we finished I went to the equipment room to sort out the bibs, which took me about twenty minutes. I only walked outside to lock the side door, and by then it was almost dark. I did not go anywhere near the greenhouses and I had no ball with me at that point, because everything was packed away in the store. Ask the other two teachers if you like.',
                isGuilty: false,
            },
            {
                name: 'Priya Nair',
                gender: 'female',
                alibi:
                    'I had permission to use the greenhouse for the biology club at four o clock, and I was there early, from about twenty past three, because I wanted to check that the seedlings had survived the frost. I opened both doors to let the air in and I moved a tray of pots down off the high shelf. I did knock one pot over, but it broke on the floor and I swept it up. I was the one who noticed the cracked pane and I told the gardener on my way out, so it seems strange to be asked about it now. I was carrying the tray, not a ball.',
                isGuilty: true,
            },
            {
                name: 'Lucas Fontaine',
                gender: 'male',
                alibi:
                    'I was in the caretaker s room all afternoon, mixing paint for the corridor doors because the head wants them done before the open evening. It is a small room with a window onto the yard, and I had the radio on, so I would not have heard anything from the field. I went out once, at four, to put the paint tins in the bin, and I came straight back in. My hands were covered in white paint and stayed that way until I washed them at five, so I did not touch a window or a ball.',
                isGuilty: false,
            },
        ],
    },
    {
        id: 'alibi_builtin_train',
        context:
            'The Friday evening train to the coast left the station nineteen minutes late, and nobody has explained why. The platform clock, the ticket machine and the guard s phone all agree on the times, so the numbers are reliable. ' +
            'Four things were recorded and are not in dispute. The station tannoy announced at 17:12 that the train was ready to leave. The driver s cab log shows the door-interlock light was green — every door closed and locked — from 17:09 onwards, and the brakes were not released until 17:19. The platform camera shows one person in a green jacket leave the platform at about 17:15 and come back four minutes later. And the gate log records a staff card being used at 17:04 by the cleaner on the late shift, whose uniform is green. ' +
            'Nobody was hurt and nothing was stolen, so this is not about a crime: it is about who has been telling a story that cannot be true. Ask about times, ask what people saw, and compare the answers.',
        question: 'Who caused the delay?',
        suspects: [
            {
                name: 'Grace Adeyemi',
                gender: 'female',
                alibi:
                    'I am the guard on that service and the delay was entirely about the doors. A passenger was holding one open with her suitcase while she argued with somebody on the platform, and the interlock will not let the train move while a door is open. I asked her three times to step back and I was still asking when the clock passed seventeen fifteen, which is why we were late. I never left the platform between the announcement and the departure, and I told control about the door straight away.',
                isGuilty: true,
            },
            {
                name: 'Marek Kowalski',
                gender: 'male',
                alibi:
                    'I was travelling with my daughter and we were standing near the front, by the first set of doors. I saw a woman in a green jacket walk away towards the stairs at about a quarter past five and come back a few minutes later carrying something small, which I found odd at the time. I did not hold any door open, and I could not have, because my hands were full with two suitcases and a bag. I stood in the same place from the announcement until the train moved, and my daughter will confirm that.',
                isGuilty: false,
            },
            {
                name: 'Ines Moreau',
                gender: 'female',
                alibi:
                    'I am the cleaner on the late shift and I was at the far end of the platform, picking up litter near the buffer stops. At about seventeen twelve I saw a bag on the track, so I went down the steps at the end of the platform to reach it with the litter hook. It took me four or five minutes to get down and back, and yes, that is probably me on the camera in the green jacket, because my uniform is green. I did not know the train was waiting and nobody shouted at me. The bag is in the office if you want to see it.',
                isGuilty: false,
            },
            {
                name: 'Stefan Vogel',
                gender: 'male',
                alibi:
                    'I drive that service and I was in the cab for the whole of the delay, watching the platform in the mirror. Once the doors are interlocked we need the guard s signal, and mine did not come until seventeen nineteen, so there was nothing for me to do but wait. I walked the length of the train earlier, before boarding, which is my habit at every turnround, and the camera will show that was at about sixteen fifty. I did not leave the cab again until we left the station.',
                isGuilty: false,
            },
            {
                name: 'Yasmin Farouk',
                gender: 'female',
                alibi:
                    'I was on the platform because my sister was travelling and I had come to see her off. I stood by the ticket machine, away from the doors, and I was talking to her through the open window until the guard told us to stand back. I did not hear any argument, but I did see someone hurrying away towards the stairs and coming back a few minutes later. My sister will tell you the same, and she has my messages on her phone showing what time we said goodbye, which was well before the train left.',
                isGuilty: false,
            },
        ],
    },
];

/* ---------------------------------------------------------------- SPYFALL ---- */

export const BUILTIN_SPYFALL: BuiltinSpyRound[] = [
    {
        id: 'spy_builtin_hospital',
        location: 'a hospital ward at night',
        job: 'night nurse',
        players: [
            {
                name: 'Nadia Petrova',
                gender: 'female',
                avatarSeed: 'nadia',
                statement:
                    'It was quiet when I came on, which is rare for us on a Friday, so I got the drug round done early. Halfway through, a monitor started alarming in the third bay, and I spent a quarter of an hour settling a patient who had decided to take a walk without telling anybody. My shoes are still wet from the corridor by the sluice, which always leaks when it rains. I have not sat down since I arrived and my tea is still cold on the desk.',
                isSpy: false,
            },
            {
                name: 'Ravi Menon',
                gender: 'male',
                avatarSeed: 'ravi',
                statement:
                    'I came in with a patient at half nine and I have been writing up her notes ever since, because the system keeps logging me out. There was a delivery at some point that nobody wanted to sign for, which caused an argument at the desk. I was going to slip out at midnight for ten minutes of air, but the rain and the paperwork between them put a stop to that idea. I will admit I have not eaten since lunch.',
                isSpy: false,
            },
            {
                name: 'Claire Dubois',
                gender: 'female',
                avatarSeed: 'claire',
                statement:
                    'Mine was a straightforward evening in many ways, so I am mainly watching other people and making sure the families are comfortable. I have spent most of the shift on my feet, moving between a few different places, and I have signed for two sets of keys. The hardest part of this job is that everything must be written down, so by the end of a shift my handwriting is almost unreadable. I am looking forward to sitting down.',
                isSpy: true,
            },
            {
                name: 'Tomasz Wieczorek',
                gender: 'male',
                avatarSeed: 'tomasz',
                statement:
                    'I was asked to move a trolley at about ten, and I am still not sure who asked me. I did four full rounds of the corridors and I did the bins on two of those rounds, so I have been everywhere and seen everybody, which is why I am useful to ask. Somebody had left a chair in the doorway, which is a real problem when something urgent happens. Otherwise it has been a normal night.',
                isSpy: false,
            },
            {
                name: 'Grace Okonkwo',
                gender: 'female',
                avatarSeed: 'grace',
                statement:
                    'I have been on the desk, which means the phone never stops: the porters, the pharmacy, and a family calling from another country who wanted an update at two in the morning their time. I had to find a form that nobody seemed to know existed, which took half an hour of my evening. I have not been into any of the bays tonight, so anything that happened in there I only know second hand.',
                isSpy: false,
            },
            {
                name: 'Henrik Larsen',
                gender: 'male',
                avatarSeed: 'henrik',
                statement:
                    'I came in for a single job and it should have taken me twenty minutes. I was ready to leave by eleven but I waited around, which I am not proud of, because there was a lift out of service and the stairs are hard work with my bag. I had a coffee in the corridor and read the notices on the board, so I can probably tell you what the fire procedure is. Nothing about tonight has gone how I expected.',
                isSpy: false,
            },
        ],
    },
    {
        id: 'spy_builtin_airport',
        location: 'an airport check-in hall',
        job: 'check-in agent',
        players: [
            {
                name: 'Fatima Beydoun',
                gender: 'female',
                avatarSeed: 'fatima',
                statement:
                    'My queue was the long one all morning, because two of the desks were closed and the screens were showing the wrong flight. I had a family with six cases, a man who had forgotten his own name on the form, and a group of teenagers who wanted to sit together. The printer jammed twice before lunch. When the supervisor asked for a volunteer to go and help at the far end, I said yes, and that is where I have been since.',
                isSpy: false,
            },
            {
                name: 'Andrei Popescu',
                gender: 'male',
                avatarSeed: 'andrei',
                statement:
                    'I have spent the whole shift on the floor rather than behind a desk, walking between the queues and telling people to have their documents ready. You would be surprised how many still arrive without them. I know where the lifts are, where the smoking area used to be, and where the lost property office keeps its keys. My feet hurt and I have walked about nine kilometres, according to the app, which is a personal record for a single day.',
                isSpy: false,
            },
            {
                name: 'Elena Marchetti',
                gender: 'female',
                avatarSeed: 'elena',
                statement:
                    'I have just finished a shift that went on far longer than it should have. The best part of it is always the children, because they get excited about the aeroplanes and they ask questions nobody can answer. The worst part is the paperwork at the end. I am going to sit down now, have something to eat, and not think about any of it until tomorrow evening, when I have to do the whole thing again.',
                isSpy: true,
            },
            {
                name: 'Samuel Adeyemi',
                gender: 'male',
                avatarSeed: 'samuel',
                statement:
                    'I started before the sun was up and I have been in the same spot since, apart from two runs to the back office to fetch the weighing labels. One bag was four kilos over and the argument about it lasted ten minutes longer than it should have. I have not had a break yet, which is against the rules, but there was nobody to cover me. Somebody from management came past twice and did not offer, which I notice.',
                isSpy: false,
            },
            {
                name: 'Yuki Tanaka',
                gender: 'female',
                avatarSeed: 'yuki',
                statement:
                    'I was working the desk by the window, which is the coldest spot in the building when there is a wind, and today there was a wind. A gentleman insisted his bag had never been out of his sight, and then told me he had left it with a friend while he smoked, so that took a while to untangle. I had to go and ask about a boarding card that would not scan. That is about the whole morning, honestly.',
                isSpy: false,
            },
            {
                name: 'Bruno Costa',
                gender: 'male',
                avatarSeed: 'bruno',
                statement:
                    'I am on the late shift, so I have spent most of it listening and watching rather than doing. Someone had lost a passport and everybody was looking in different places for it, which is a classic. I helped a woman find the lift to the upper level and then went back to my station. If you want my honest opinion, the busiest thing about my day was the coffee machine being out of order.',
                isSpy: false,
            },
        ],
    },
    {
        id: 'spy_builtin_kitchen',
        location: 'the kitchen of a busy restaurant',
        job: 'line chef',
        players: [
            {
                name: 'Camille Roux',
                gender: 'female',
                avatarSeed: 'camille',
                statement:
                    'We had forty-two covers and two of them were allergies, so I have been on the section by the window all evening, working to tickets. I burned the first batch of shallots, which the whole kitchen smelt, and I have not lived it down. The walk-in was warmer than it should have been, so somebody had not shut the door properly, and I had to move the fish onto ice. I came off shift at half past ten, which is early for a Friday.',
                isSpy: false,
            },
            {
                name: 'Marco Ferretti',
                gender: 'male',
                avatarSeed: 'marco',
                statement:
                    'I did the fish tonight, which is my favourite thing to do, and everything went out hot, which is what matters. I keep my station clean and I keep out of other people s way, and I have never understood chefs who shout. A plate came back once, for being under-seasoned, and it was mine, so I fixed it myself and said nothing. I would rather be judged on the plate than on anything I say here.',
                isSpy: false,
            },
            {
                name: 'Priya Sharma',
                gender: 'female',
                avatarSeed: 'priya',
                statement:
                    'I have had a long day and I am tired, but the food is what matters at the end of it. Communication is everything in a place like this, and I try to keep everything organised so nobody has to ask twice. There is a rhythm to a good service and you can feel it when it goes right. I do not think tonight was our best, but we got there in the end, and the last table thanked us on the way out.',
                isSpy: true,
            },
            {
                name: 'Jamal Haddad',
                gender: 'male',
                avatarSeed: 'jamal',
                statement:
                    'I was on the ovens from six, so I have been standing in one spot with my back to the room all evening, which means I hear everything and see almost nothing. Two trays caught on the bottom shelf and I had to scrape them, which cost me ten minutes at the worst moment. I was asked to help plate up at one point, but I stayed where I was, because my section was full. I clocked off after the last order went out.',
                isSpy: false,
            },
            {
                name: 'Hilde Andersen',
                gender: 'female',
                avatarSeed: 'hilde',
                statement:
                    'I do the sweets and I am in the corner, so I am the last person to know what is happening anywhere else. I sent out nineteen plates tonight and one of them had a hair on the rim, which I caught before it left my bench. Somebody had borrowed my palate knife and not brought it back, so I made do with a spoon, and it annoyed me all evening. I would like it returned, if anyone is listening.',
                isSpy: false,
            },
            {
                name: 'Diego Alvarez',
                gender: 'male',
                avatarSeed: 'diego',
                statement:
                    'I started at four to set up and I have not stopped moving since. I fetched the delivery that arrived late, and I had to send two boxes back because the ice had gone. I am the one who ends up carrying things up and down the steps, which is why my hands are red. If you want to know what was ordered tonight, ask me rather than anybody else. I have the sheet in my pocket.',
                isSpy: false,
            },
        ],
    },
];

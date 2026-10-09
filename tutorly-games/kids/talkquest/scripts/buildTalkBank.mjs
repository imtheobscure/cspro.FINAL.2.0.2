import fs from 'fs';

const files = ['src/data/bankA.ts', 'src/data/bankB.ts', 'src/data/bankC.ts'];
const words = new Set();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/'([^'|]+)\|/g)) words.add(m[1]);
}

const CUSTOM = {
  Apple: {
    say: [
      'Hold an imaginary apple. Is it heavy or light? Now take a loud crunch.',
      'Mum says, “One apple for you, one for me.” Who says thank you first?',
      'The apple rolled under the chair. Ask: “Can you see the apple?”',
    ],
    chants: [
      'Red apple, green apple, crunch-crunch-crunch!',
      'Up the tree, down the tree, catch that apple — one, two, three!',
    ],
    ask: 'Do we wear an apple or eat an apple?',
    talk: 'Say: “This apple is crunchy and sweet.”',
    fact: 'Apples float in water because they have tiny air pockets.',
  },
  Pizza: {
    say: [
      'The pizza is too hot. Blow three times, then take a tiny bite.',
      'I would like one slice of pizza, please. No, two slices!',
      'Shall we share the last piece of pizza, or save it for later?',
    ],
    chants: [
      'Hot pizza, hot pizza, blow, blow, bite!',
      'Cheese on top, sauce below, spin the pizza — here we go!',
    ],
    ask: 'Is pizza breakfast, or can it be lunch and dinner too?',
    talk: 'Take the order: “Pizza for the table, extra cheese!”',
    fact: 'The first pizzas came from Naples in Italy. Kids there eat it with their hands.',
  },
  Banana: {
    say: [
      'Peel the banana from the bottom — monkeys do it that way.',
      'The banana is too brown. Shall we bake banana bread?',
      'Don’t slip! Someone dropped a banana skin. What do we say?',
    ],
    chants: [
      'Peel, peel, banana! Slip, slip — no you don’t!',
      'Yellow boat, yellow boat, banana in my hand.',
    ],
    ask: 'Do we peel a banana or a shoe?',
    talk: 'Say: “I peel my banana, then I eat it.”',
    fact: 'A banana is a berry. A strawberry is not. Wild, right?',
  },
  Bread: {
    say: [
      'Please cut the bread. I want the crusty end piece.',
      'The toast popped. Butter it before it goes cold.',
      'We made a sandwich. Bread, filling, bread. What is in yours?',
    ],
    chants: [
      'Slice the bread, spread the jam, nibble nibble, here I am!',
      'Fresh bread, warm bread, can I have the end?',
    ],
    ask: 'What do we put on bread — socks or butter?',
    talk: 'Say: “May I have a slice of bread, please?”',
    fact: 'Yeast makes bread rise. It is a tiny living thing in the dough.',
  },
  Milk: {
    say: [
      'Drink your milk slowly. Look — a white moustache!',
      'We need milk for the pancakes. Is the bottle cold?',
      'Some milk comes from cows, some from oats. Which do you drink?',
    ],
    chants: [
      'Sip sip milk, drip drip chin, wipe wipe — clean again!',
      'White milk, cold milk, pour it in the cup.',
    ],
    ask: 'Do we pour milk in a cup or in a shoe?',
    talk: 'Say: “I would like a glass of milk.”',
    fact: 'Milk helps bones grow strong. That’s why it is in so many breakfasts.',
  },
  'Ice Cream': {
    say: [
      'Lick fast — the ice cream is running down your hand!',
      'I cannot choose: chocolate or strawberry ice cream?',
      'Brain freeze! Put your tongue on the roof of your mouth.',
    ],
    chants: [
      'Lick lick, drip drip, ice cream on my nose!',
      'Cold, cold, colder — ice cream in a cone.',
    ],
    ask: 'Do we bake ice cream in the oven?',
    talk: 'Say: “Ice cream, please. A small cone.”',
    fact: 'Ice cream melts at room temperature. That is why we eat it quickly.',
  },
  Cat: {
    say: [
      'The cat is on the box, of course. Cats love boxes.',
      'Scratch behind the cat’s ears. Hear that purr?',
      'The cat says meow. Can you ask the cat, “Are you hungry?”',
    ],
    chants: [
      'Meow meow, stretch stretch, curl up like a cat.',
      'Soft paws, sharp eyes, quiet cat, big surprise.',
    ],
    ask: 'Does a cat bark or meow?',
    talk: 'Say: “The cat is sleeping in the sun.”',
    fact: 'Cats sleep about 16 hours a day. They are night hunters.',
  },
  Dog: {
    say: [
      'The dog wants a walk. Find the lead and say “Let’s go.”',
      'Sit. Paw. Good dog! Now you try the commands.',
      'The dog’s tail is a feeling flag. Wag means happy.',
    ],
    chants: [
      'Woof woof, wag wag, walk the dog today!',
      'Lead on, nose down, sniff sniff all the way to town.',
    ],
    ask: 'Does a dog meow or woof?',
    talk: 'Say: “Can we take the dog out, please?”',
    fact: 'A dog’s nose is thousands of times stronger than yours.',
  },
  Lion: {
    say: [
      'The lion yawns — look at those teeth. We watch from far away.',
      'Who is the king of this story? The lion? Why?',
      'A baby lion is a cub. Can you rock the cub to sleep?',
    ],
    chants: [
      'Roar like a lion, then tiptoe like a mouse.',
      'Golden mane, golden sun, lion sleeping — hunt is done.',
    ],
    ask: 'Is a lion a pet for a flat, or a wild animal?',
    talk: 'Say: “The lion is wild. We keep a safe distance.”',
    fact: 'Lionesses hunt more than male lions. The mane looks fancy; the work is shared.',
  },
  Happy: {
    say: [
      'Your face is doing a happy dance. What made you happy today?',
      'When I am happy I hum. What do you do?',
      'Can you make your tutor happy in one sentence?',
    ],
    chants: [
      'Happy hands, happy feet, happy heart — feel that beat!',
      'Smile small, smile wide, happy hiding? Come outside!',
    ],
    ask: 'If you lose a game, can you still find a happy bit?',
    talk: 'Say: “I feel happy because _____.” Finish it.',
    fact: 'Smiling can trick your brain into feeling a little happier. Try it.',
  },
  Sad: {
    say: [
      'It is okay to be sad. Sit with it. Then tell someone.',
      'A hug, a drink of water, a walk. Which helps your sad?',
      'Name the sad thing. Naming it makes it smaller.',
    ],
    chants: [
      'Sad cloud, rain cloud, then a patch of blue.',
      'Breathe in, breathe out, sad can talk, we can listen.',
    ],
    ask: 'Should we hide sad feelings, or can we say them?',
    talk: 'Say: “I feel sad because _____. I need _____.”',
    fact: 'Tears help the body let go of stress. Sad is a clean-up feeling.',
  },
  Mother: {
    say: [
      'Call her: “Mum, can you hear me?” Use a kind voice.',
      'Mother packs the bag. What three things does she put in?',
      'Tell your mum one true thing and one thank you.',
    ],
    chants: [
      'Mum mum, hug hug, kind words fill the jug.',
      'Morning mum, bedtime mum, love you all day long.',
    ],
    ask: 'Is mother a job, a feeling, a person — or all three?',
    talk: 'Say: “Thank you, Mum, for _____.”',
    fact: 'Every family is different. Some kids say Mama, Mummy, Mom, or a nickname.',
  },
  School: {
    say: [
      'The bell went. Line up. What do you say to your teacher?',
      'I forgot my book at school. How do I ask to get it back?',
      'School is for questions. Ask one right now.',
    ],
    chants: [
      'Bell rings, bags on, walking feet, not a run!',
      'Hello teacher, hello friends, school day starts, learning begins.',
    ],
    ask: 'Do we shout in the library part of school?',
    talk: 'Say: “Good morning. I am ready to learn.”',
    fact: 'The word school comes from a Greek word that first meant free time to think.',
  },
  Sun: {
    say: [
      'Do not look straight at the sun. Feel the warm on your hands instead.',
      'The sun is a star. Say that again, slower.',
      'Hat on! The sun is strong today. Why do we wear a hat?',
    ],
    chants: [
      'Sun up, stretch up, good morning light!',
      'Warm face, warm hands, thank you sun across the lands.',
    ],
    ask: 'Is the sun a planet or a star?',
    talk: 'Say: “The sun gives us light and heat.”',
    fact: 'Light from the sun takes about eight minutes to reach Earth.',
  },
  Moon: {
    say: [
      'The moon changes shape. Tonight it looks like a banana. What about last night?',
      'Astronauts left footprints on the moon. There is no wind to blow them away.',
      'Goodnight, moon. What else will you say goodnight to?',
    ],
    chants: [
      'Moon boat, moon boat, sail across the sky.',
      'Shh, shh, silver moon, sleepy heads are coming soon.',
    ],
    ask: 'Does the moon make its own light, or borrow light from the sun?',
    talk: 'Say: “The moon looks different every night.”',
    fact: 'The same side of the moon always faces us. The far side is not dark; we just never see it from Earth.',
  },
  One: {
    say: [
      'Hold up one finger. Just one. Now hide it. Where did one go?',
      'I have one nose. How many noses have you?',
      'One is a lonely number until a friend comes. Then it is two.',
    ],
    chants: [
      'One step, one clap, one word — STOP.',
      'Number one, shine like the sun.',
    ],
    ask: 'What is one more than one?',
    talk: 'Say: “I need one, please.”',
    fact: 'One is the first counting number. Zero waits before it, quietly.',
  },
  Red: {
    say: [
      'Red means stop. Freeze like a statue when I say red.',
      'Find three red things without leaving your chair.',
      'Is your face red when you run? That is blood doing its job.',
    ],
    chants: [
      'Red light, stop light, feet stay still.',
      'Berry red, fire red, paint the town — but not the cat.',
    ],
    ask: 'At a traffic light, do we go on red?',
    talk: 'Say: “I see something red. It is _____.”',
    fact: 'Red is often the first colour babies learn to see clearly.',
  },
  Circle: {
    say: [
      'Draw a circle in the air. Start at the top. Meet the start again.',
      'A clock is a circle. So is a pizza. What else?',
      'Can a circle roll? Prove it with a bottle lid.',
    ],
    chants: [
      'Round and round the circle goes, where it stops, the pointer shows.',
      'No corners, no sides, circle slides.',
    ],
    ask: 'How many corners does a circle have?',
    talk: 'Say: “A circle is round. It has no corners.”',
    fact: 'Wheels are circles so they can roll smoothly.',
  },
  Run: {
    say: [
      'We run outside, not in the kitchen. Where is it safe to run?',
      'On your marks… get set… run to the door and back.',
      'After you run, put your hand on your chest. What do you feel?',
    ],
    chants: [
      'Run run, puff puff, now we stop and laugh.',
      'Fast feet, soft knees, run like the breeze.',
    ],
    ask: 'Do we run with our ears or our legs?',
    talk: 'Say: “I can run fast, then I rest.”',
    fact: 'Running makes your heart stronger. That thump-thump is blood on the move.',
  },
  Water: {
    say: ['Fill the glass. Is the water clear? Take three gulps.', 'We wash with water, we drink water, plants drink too.', 'The tap is dripping. How do we save water?'],
    chants: ['Drip drop, fill the cup, water up, water up!', 'Sip sip, splash splash, water on my moustache!'],
    ask: 'Can we live without water?', talk: 'Say: “Can I have some water, please?”', fact: 'Your body is mostly water. That is why thirsty feels so loud.',
  },
  Cheese: {
    say: ['Mice in stories love cheese. Do you?', 'This cheese smells strong. Tiny nibble first.', 'Cheese on the pizza, cheese on the pasta. Too much?'],
    chants: ['Nibble nibble cheese, please please cheese!', 'Holey cheese, smelly cheese, sandwich cheese — which of these?'],
    ask: 'Does cheese come from a tree or from milk?', talk: 'Say: “A little cheese, please.”', fact: 'Cheese is milk that grew up and got interesting.',
  },
  Cake: {
    say: ['Blow the candles. Make a wish. Do not tell the wish.', 'The cake is for sharing. How many slices?', 'Icing on my nose. Help me wipe it — and say sorry to the cake.'],
    chants: ['Make a wish, blow it out, cake for me and you!', 'Mix mix, bake bake, wait wait — now we take.'],
    ask: 'Do we eat cake before we blow the candles, or after?', talk: 'Say: “Happy birthday. The cake looks lovely.”', fact: 'The candles stand for years. One extra is sometimes “for luck.”',
  },
  Carrot: {
    say: ['Rabbits crunch carrots. Crunch like a rabbit.', 'This carrot grew underground. Dirt first, wash second.', 'Raw or cooked? Which carrot do you like?'],
    chants: ['Crunch crunch carrot, orange and long!', 'Pull from the ground, wash it round, carrot song.'],
    ask: 'Does a carrot grow on a tree?', talk: 'Say: “I crunch my carrot loudly.”', fact: 'Carrots were purple and white before they were orange.',
  },
  Soup: {
    say: ['The soup is steaming. Blow, then sip from the side of the spoon.', 'What is hiding in this soup? Name three things.', 'I am ill. Soup helps. Who brings it to you?'],
    chants: ['Sip the soup, blow the steam, tiny spoon, happy team.', 'Hot soup, not a race — slow spoon, happy face.'],
    ask: 'Do we drink soup from a cup, a bowl, or a boot?', talk: 'Say: “This soup is hot. I will wait.”', fact: 'Soup is mostly water plus flavour. That is why it warms you twice.',
  },
  Sandwich: {
    say: ['Bread, filling, bread. That is the sandwich rule.', 'Cut the sandwich in two. Triangle or rectangle?', 'The filling fell out. Rescue it. What do you say?'],
    chants: ['Top bread, filling, bottom bread — sandwich, sandwich, lunch is ready!', 'Hold it tight, take a bite, sandwich hug with both hands.'],
    ask: 'Can a sandwich have only one piece of bread? What is that called?', talk: 'Say: “I packed a sandwich in my box.”', fact: 'The sandwich is named after a hungry man who did not want to leave his card game.',
  },
  Egg: {
    say: ['Crack the egg on the bowl, not on the floor.', 'The yellow middle is the yolk. Can you say yolk?', 'Chickens sit on eggs. We do not sit on breakfast.'],
    chants: ['Tap tap crack, egg in the pan, breakfast for a hungry clan.', 'Shell off, mix mix, egg trick.'],
    ask: 'What is outside an egg — a coat or a shell?', talk: 'Say: “Crack the egg carefully.”', fact: 'The shell is full of tiny holes. The chick inside still needs to breathe.',
  },
  Fish: {
    say: ['The fish has no legs. How does it move?', 'Bubbles from the fish tank. Is the fish happy? How do you know?', 'We do not tap the glass. Why?'],
    chants: ['Swim little fish, swish little fish, bubbles to the top.', 'Quiet tank, waving fin, fishy kiss on the glass — almost!'],
    ask: 'Can a fish walk to school?', talk: 'Say: “The fish swims. It does not hop.”', fact: 'Fish breathe in water with gills, not with noses like ours.',
  },
  Bird: {
    say: ['The bird is building a nest. What three things might it use?', 'Listen. Is that a bird or a phone?', 'Birds have hollow bones so they can fly. Can you fly? Why not?'],
    chants: ['Tweet tweet, flap flap, bird on the wall.', 'Eggs in a nest, mum on the rest, hush.'],
    ask: 'Do all birds fly? Think of a penguin.', talk: 'Say: “I can hear a bird.”', fact: 'Not all birds fly. Penguins swim. Ostriches run.',
  },
  Cow: {
    say: ['The cow says moo. Ask the cow if she has milk today.', 'Grass in, milk out. Farms are clever that way.', 'Never stand behind a cow. They kick. Where is safe?'],
    chants: ['Moo moo, chew chew, cow in the morning dew.', 'Big cow, brown cow, milk for the cup now.'],
    ask: 'Does milk grow on trees?', talk: 'Say: “The cow is in the field.”', fact: 'A cow has four stomach rooms to chew grass twice.',
  },
  Horse: {
    say: ['Stroke the horse on the neck, not the nose first.', 'The horse says neigh. Can you trot like a horse?', 'Helmet on before you ride. Why?'],
    chants: ['Clip clop, clip clop, horse on the track, stop.', 'Mane flying, tail swinging, gentle hands on the rein.'],
    ask: 'Do we ride a horse with a helmet or a saucepan?', talk: 'Say: “The horse is fast, so I am careful.”', fact: 'Horses can sleep standing up because their legs lock.',
  },
  Pig: {
    say: ['The pig is not dirty for fun. Mud keeps the sun off its skin.', 'A pig’s tail is a curl. Draw it in the air.', 'Pigs are clever. They can learn their names.'],
    chants: ['Oink oink, mud pie, piggy dance, don’t be shy.', 'Curly tail, pink nose, piggy found a crunchy rose? Nope — a beet!'],
    ask: 'Are pigs silly, or can they be clever?', talk: 'Say: “The pig likes mud because it is cool.”', fact: 'Pigs are among the smartest farm animals — smarter than some dogs at puzzles.',
  },
  Sheep: {
    say: ['The sheep’s coat is wool. We do not cut our own hair with farm scissors.', 'Count the sheep if you cannot sleep. Why do people do that?', 'Baa means hello in sheep.'],
    chants: ['Baa baa, woolly back, jump the fence, jump the track.', 'Soft sheep, loud baa, follow mum, not the car.'],
    ask: 'Do jumpers grow on sheep, or do we make them from wool?', talk: 'Say: “This wool came from a sheep.”', fact: 'A sheep’s wool keeps growing. Farmers shear it so the sheep do not overheat.',
  },
  Duck: {
    say: ['Ducks have oily feathers so water slides off. “Like water off a duck’s back.”', 'Do not feed ducks bread. Peas or special duck food is kinder.', 'Waddle like a duck to the door and back.'],
    chants: ['Quack quack, paddle paddle, duck in the puddle.', 'Yellow duck, grown-up duck, follow in a line.'],
    ask: 'Why don’t ducks get soaked in the rain?', talk: 'Say: “The duck swims on the pond.”', fact: 'Ducklings follow the first moving thing they see. Usually that is mum.',
  },
  Rabbit: {
    say: ['Long ears for listening. Can you hear with your rabbit ears?', 'Rabbits chew all day because their teeth never stop growing.', 'Soft rabbit, quiet rabbit. We hold it like a baby.'],
    chants: ['Hop hop rabbit, stop stop rabbit, nose goes twitch twitch twitch.', 'Ears up, tail fluff, hide in the hutch.'],
    ask: 'Do rabbits lay eggs? (That’s a chicken job.)', talk: 'Say: “The rabbit is gentle. I am gentle too.”', fact: 'A rabbit’s teeth never stop growing, so they must chew.',
  },
  Bear: {
    say: ['Some bears sleep all winter. That long sleep is hibernation. Try the word.', 'The bear likes honey in stories. Real bears like berries and fish too.', 'We never feed bears. Why?'],
    chants: ['Big bear, sleepy bear, snore in the cave.', 'Paws, claws, berry jaws — watch from far away.'],
    ask: 'Is a teddy bear a real bear?', talk: 'Say: “Real bears are wild. Teddy bears are toys.”', fact: 'A brown bear can smell food from kilometres away.',
  },
  Elephant: {
    say: ['The elephant’s nose is a trunk. It can pick up a peanut or a log.', 'Elephants remember their friends for years. Who do you remember?', 'Stomp softly. Elephants walk on tiptoe pads.'],
    chants: ['Stomp stomp, trunk up, elephant in the water tub.', 'Big ears, fan the heat, slow feet on the savanna street.'],
    ask: 'Can an elephant pick things up without hands?', talk: 'Say: “The elephant uses its trunk like a hand.”', fact: 'Elephant trunks have tens of thousands of muscles. Yours have a few hundred in a whole arm.',
  },
  Giraffe: {
    say: ['The giraffe eats the high leaves. That is why the neck is a ladder.', 'A giraffe’s tongue is dark so it does not sunburn. Stick yours out — is it dark?', 'Baby giraffes stand up one hour after they are born.'],
    chants: ['Stretch stretch, nibble the tree, giraffe is taller than me.', 'Long neck, long lashes, quiet giraffe, sun flashes.'],
    ask: 'Why does a giraffe have a long neck?', talk: 'Say: “The giraffe eats leaves at the top.”', fact: 'A giraffe’s neck has seven bones — the same number as yours. They are just longer.',
  },
  Monkey: {
    say: ['Monkeys have hands like us. That is why they are so good at mischief.', 'Do not shout at the monkey in the zoo. Watch quietly.', 'If a monkey takes a banana, whose banana was it?'],
    chants: ['Swing swing, chatter chatter, monkey in the canopy ladder.', 'Cheeky face, quick hand, banana plan.'],
    ask: 'Are monkeys people?', talk: 'Say: “The monkey is an animal in the trees.”', fact: 'Some monkeys use tools, like stones to crack nuts.',
  },
  Penguin: {
    say: ['Penguins fly under water, not in the sky.', 'Waddle, waddle. Now slide on your tummy like ice.', 'Mum and dad penguin take turns with the egg.'],
    chants: ['Waddle waddle, belly slide, penguin on the icy ride.', 'Black suit, white shirt, penguin diving, splash alert.'],
    ask: 'Is a penguin a fish, a bird, or a bear?', talk: 'Say: “The penguin is a bird that swims.”', fact: 'Emperor penguins huddle to share heat. The ones on the outside rotate in.',
  },
  Dolphin: {
    say: ['Dolphins talk in clicks. Can you click your tongue in a pattern?', 'A dolphin is not a fish. It is a mammal. It needs air.', 'If you see a dolphin from a boat, wave. Then let it swim.'],
    chants: ['Click click, leap leap, dolphin dancing on the deep.', 'Fin up, smile wide, ride the bow wave, then hide.'],
    ask: 'Do dolphins breathe water or air?', talk: 'Say: “The dolphin jumps, then it breathes.”', fact: 'Dolphins sleep with one half of the brain at a time so they remember to breathe.',
  },
  Yellow: {
    say: ['Yellow is the sun’s favourite T-shirt.', 'Find yellow without standing up. Three things.', 'Mix yellow with blue. What happens? Say the new colour.'],
    chants: ['Yellow sun, yellow bus, yellow duck — wait for us!', 'Shine shine yellow, fill the room, not too close to the sun — zoom.'],
    ask: 'Is a banana yellow when it is still on the tree and tiny?', talk: 'Say: “I am wearing yellow.” or “I am not, but I can see yellow.”', fact: 'Yellow is one of the three paint primaries: red, yellow, blue.',
  },
  Blue: {
    say: ['The sky is blue… except at night. What colour is it then?', 'Blue can mean sad in English. Are you blue today, or sky-blue happy?', 'Point to the bluest thing you can see.'],
    chants: ['Blue sea, blue sky, blue bird flying by.', 'Cool blue, calm blue, paint a river through.'],
    ask: 'Is water always blue in a glass?', talk: 'Say: “The sky looks blue today.”', fact: 'The sea looks blue because it swallows other colours and throws blue back at our eyes.',
  },
  Green: {
    say: ['Green means go. Unfreeze.', 'Leaves are green because of chlorophyll. Big word — try it.', 'Mix blue and yellow. Prove green.'],
    chants: ['Green light, go light, careful feet, that’s right.', 'Frog green, leaf green, grow grow garden scene.'],
    ask: 'What two colours make green paint?', talk: 'Say: “Green means go. Red means stop.”', fact: 'Most plants are green because they catch sunlight with chlorophyll.',
  },
  Father: {
    say: ['Dad jokes are extra groany on purpose. Tell one.', 'Father can mean many kinds of grown-up who looks after you.', 'Ask: “Dad, can you help me, please?”'],
    chants: ['Dad dad, high five, walk beside, feel alive.', 'Strong hug, silly grin, family team, we all win.'],
    ask: 'Is every family the same shape?', talk: 'Say: “Thank you for helping me.”', fact: 'Families come in many shapes. The love job is the same.',
  },
  Baby: {
    say: ['We use a soft voice with a baby. Try it.', 'The baby cannot talk yet. How do we know if it is hungry?', 'Never shake a baby. Hold the head. Why?'],
    chants: ['Shh shh, tiny hands, rock the baby, quiet lands.', 'Milk, nap, cuddle, repeat — baby clock is extra sweet.'],
    ask: 'Can a baby walk to school?', talk: 'Say: “The baby is sleeping. We are quiet.”', fact: 'Babies learn language by listening long before they speak.',
  },
  Teacher: {
    say: ['Hands up before we talk. Why do we do that?', 'The teacher is not a mind-reader. Ask your question.', 'Say good morning like you mean it.'],
    chants: ['Hands up, eyes on, ears open, learning on.', 'Thank you teacher, thank you class, questions make the minutes pass.'],
    ask: 'Is it okay to say “I don’t know” to a teacher?', talk: 'Say: “Can you say that again, please?”', fact: 'Good teachers love questions more than perfect answers.',
  },
  Doctor: {
    say: ['Open wide. Say ahh. The doctor is looking, not hurting on purpose.', 'Brave is doing the thing even if you wriggle.', 'Ask the doctor: “Will this take long?”'],
    chants: ['Ahh for the doctor, sit up tall, brave as a lion, not small.', 'Coat white, light bright, check-up, then you feel all right.'],
    ask: 'Is a doctor’s job to scare you or to help you?', talk: 'Say: “I feel a bit scared, but I am brave.”', fact: 'Doctors wash their hands more than almost anyone. Germs hate soap.',
  },
  Friend: {
    say: ['A friend says sorry and means it. Practise sorry.', 'Share the last sticker. Hard? That’s friendship muscle.', 'Invite: “Do you want to play?”'],
    chants: ['You and me, one two three, friends say please and thank you, see?', 'Share, care, take a turn, friendship is a thing we learn.'],
    ask: 'Can friends disagree and still be friends?', talk: 'Say: “Do you want to play with me?”', fact: 'Listening is the secret superpower of friends.',
  },
  House: {
    say: ['Knock on the door. What do we say when it opens?', 'Every house has a favourite room. Which is yours?', 'If the lights go out, stay together. Where is the torch?'],
    chants: ['Roof on top, door in the middle, house is home, solve the riddle.', 'Knock knock, shoes off, welcome in, cocoa on.'],
    ask: 'Is a house the same as a home?', talk: 'Say: “Welcome to my house.”', fact: 'Home is the feeling. House is the building. You can have both.',
  },
  Book: {
    say: ['Open the book in the middle. What do you see?', 'We do not write in library books. Why?', 'Read the title out loud like a movie trailer.'],
    chants: ['Page turn, story burn (in a good way!), bookworm wiggle all day.', 'Quiet voice, bright pictures, books are doors without hinges.'],
    ask: 'Do we eat books or read them?', talk: 'Say: “Can we read this book together?”', fact: 'The more you read, the easier talking becomes. Words pile up in your pocket.',
  },
  Pencil: {
    say: ['Pencils have rubbers because mistakes are allowed.', 'Hold it near the tip, not like a sword.', 'If it breaks, we sharpen. We do not cry over graphite.'],
    chants: ['Write write, rub rub, try again, that’s the job.', 'Yellow pencil, grey line, your idea, now it shines.'],
    ask: 'What do we do if we make a mistake with a pencil?', talk: 'Say: “I can fix it with the rubber.”', fact: 'Pencil “lead” is not lead. It is graphite mixed with clay.',
  },
  Clock: {
    say: ['The short hand is hours. The long hand is minutes. Point.', 'What do we do when the clock says bedtime even if we are not tired?', 'Count sixty seconds. That is one minute. Go.'],
    chants: ['Tick tock, tick tock, short hand, long hand, do not race the clock.', 'Hurry up, slow down, clocks talk without a sound.'],
    ask: 'Which hand on the clock is the hour hand?', talk: 'Say: “It is time to _____.”', fact: 'There are 24 hours in a day, but most clocks only show 12. We go around twice.',
  },
  Rain: {
    say: ['Boots, coat, maybe a hat. Rain plan.', 'Listen. Rain on the window is a drum. Can you copy it?', 'Puddles are for jumping if the grown-up says yes.'],
    chants: ['Pitter patter, boots spatter, jump the puddle, that’s the matter.', 'Rain rain, we don’t go away — we put a coat on and we play.'],
    ask: 'Does rain come from the ground or the sky?', talk: 'Say: “It is raining. I need my coat.”', fact: 'Rain starts as tiny drops in clouds that hug until they are too heavy.',
  },
  Tree: {
    say: ['A tree drinks with its roots and breathes with its leaves.', 'Hug a tree (the picture one). How wide is the trunk?', 'In autumn some trees throw a colour party, then sleep.'],
    chants: ['Roots down, leaves up, tree in the wind, hiccup!', 'Seed, sapling, tall tree, that takes years — not three.'],
    ask: 'Do trees walk to the park?', talk: 'Say: “The tree gives us shade and air.”', fact: 'One old tree can be a block of flats for birds, bugs and squirrels.',
  },
  Flower: {
    say: ['Smell with your nose, not your mouth. Flowers are not snacks.', 'Bees need flowers. Flowers need bees. Teamwork.', 'Pick only if you planted it, or if you asked.'],
    chants: ['Petal, petal, yellow middle, bee in the flower plays the fiddle.', 'Grow, open, smile at the sun, flower day has now begun.'],
    ask: 'Why do we not pick every flower we see?', talk: 'Say: “This flower smells sweet.”', fact: 'The bright petals are like a shop sign for bees: nectar this way.',
  },
  Happy: {
    say: ['Your face is doing a happy dance. What made you happy today?', 'When I am happy I hum. What do you do?', 'Make your tutor happy in one sentence.'],
    chants: ['Happy hands, happy feet, happy heart — feel that beat!', 'Smile small, smile wide, happy hiding? Come outside!'],
    ask: 'If you lose a game, can you still find a happy bit?', talk: 'Say: “I feel happy because _____.” Finish it.', fact: 'Smiling can nudge your brain toward happier. Try a tiny one.',
  },
};

const FACTS = {
  Apple: ['sweet and crunchy', 'grows on a tree', 'keep the doctor away', 'red or green', 'crunch'],
  Banana: ['yellow and soft', 'monkeys love it', 'peel it first', 'a little curved', 'slip'],
  Orange: ['juicy and bright', 'peel the skin', 'full of juice', 'round like a ball', 'squirt'],
  Grapes: ['little and round', 'grow in a bunch', 'pop in your mouth', 'green or purple', 'pop'],
  Strawberry: ['red with tiny seeds', 'grows close to the ground', 'sweet on cake', 'heart shaped', 'nibble'],
  Watermelon: ['heavy and full of water', 'eat it in summer', 'spit out the seeds', 'green outside red inside', 'slurp'],
  Pear: ['soft at the bottom', 'shaped like a drop', 'sweet when ripe', 'green or yellow', 'bite'],
  Peach: ['fuzzy skin', 'soft and juicy', 'a stone in the middle', 'smells like summer', 'juice'],
  Cherry: ['tiny and red', 'a stick on top', 'two on one stem', 'watch out for the stone', 'pip'],
  Lemon: ['very sour', 'makes a funny face', 'yellow and bright', 'we squeeze it', 'squint'],
  Carrot: ['orange and crunchy', 'rabbits love it', 'grows under the ground', 'good for eyes', 'crunch'],
  Tomato: ['red and soft', 'in salad and sauce', 'is it a fruit?', 'full of juice', 'squish'],
  Potato: ['brown and bumpy', 'grows under the ground', 'we mash or fry it', 'hot chips', 'mash'],
  Onion: ['makes you cry', 'white or purple layers', 'we fry it', 'strong smell', 'sniff'],
  Cucumber: ['cool and watery', 'green skin', 'in a salad', 'crunchy slices', 'cool'],
  Broccoli: ['looks like a tiny tree', 'green and healthy', 'some kids say yuck then yum', 'little trees', 'forest'],
  Corn: ['yellow and sweet', 'on a cob', 'pop it to make popcorn', 'summer food', 'pop'],
  Pepper: ['can be sweet or hot', 'red yellow or green', 'crunchy in salad', 'sometimes spicy', 'hot'],
  Lettuce: ['green and leafy', 'in a sandwich', 'wash it first', 'rabbit food too', 'leaf'],
  Mushroom: ['grows in the dark', 'soft top', 'not a plant not an animal', 'tiny umbrella', 'pop'],
  Bread: ['we slice it', 'toast it in the morning', 'a loaf on the table', 'jam on top', 'slice'],
  Cheese: ['mice dream about it', 'yellow or white', 'on pizza', 'some smells strong', 'nibble'],
  Rice: ['tiny white grains', 'we eat it with a spoon', 'from a field', 'steamy and hot', 'steam'],
  Pasta: ['long or curly', 'hot with sauce', 'Italians love it', 'twirl with a fork', 'twirl'],
  Soup: ['hot in a bowl', 'sip it slowly', 'good when you are ill', 'steam on your face', 'sip'],
  Sandwich: ['bread on both sides', 'hold it in two hands', 'lunch box hero', 'a filling in the middle', 'bite'],
  Pizza: ['hot circle of cheese', 'cut into slices', 'do not burn your tongue', 'share with friends', 'spin'],
  Egg: ['from a hen', 'breakfast in a cup', 'crack it carefully', 'yellow in the middle', 'crack'],
  Milk: ['from a cow or a plant', 'white in a glass', 'good with cookies', 'moustache on your lip', 'sip'],
  Water: ['we need it every day', 'clear in a glass', 'drink when you run', ' splish splash', 'gulp'],
  Juice: ['from fruit', 'sweet in a carton', 'breakfast drink', 'orange or apple', 'slurp'],
  Tea: ['hot in a cup', 'grown-ups sip it', 'from leaves', 'sometimes with honey', 'blow'],
  Honey: ['bees make it', 'gold and sticky', 'on toast', 'very sweet', 'sticky'],
  Butter: ['yellow and soft', 'on bread', 'from cream', 'it melts', 'spread'],
  Cake: ['for birthdays', 'candles on top', 'sweet and soft', 'make a wish', 'blow'],
  Cookie: ['crunchy or chewy', 'chocolate chips', 'in a jar', 'dunk in milk', 'crumble'],
  'Ice Cream': ['cold on your tongue', 'melts in the sun', 'cone or cup', 'brain freeze', 'lick'],
  Chocolate: ['brown and sweet', 'melts in your hand', 'from a cocoa bean', 'a square at a time', 'melt'],
  Salad: ['many colours in a bowl', 'crunchy leaves', 'good for your body', 'mix it up', 'toss'],
  Yogurt: ['cool and creamy', 'from milk', 'fruit on the bottom', 'breakfast bowl', 'spoon'],
  Cereal: ['in a bowl with milk', 'it goes snap', 'morning food', 'choose your favourite', 'pour'],
  Toast: ['brown and crunchy', 'butter melts on it', 'pop from the toaster', 'jam on top', 'crunch'],
  Pancake: ['flat and golden', 'flip it in the pan', 'syrup on top', 'Saturday treat', 'flip'],
  Porridge: ['warm in a bowl', 'oats and milk', 'bears like it in the story', 'slow and cosy', 'stir'],
  Pie: ['a lid of pastry', 'fruit or meat inside', 'hot from the oven', 'a slice for you', 'steam'],
  Cupcake: ['a cake for one person', 'icing hat', 'paper wrapper', 'party food', 'peel'],
  Cat: ['soft fur', 'says meow', 'likes boxes', 'purrs on your lap', 'purr'],
  Dog: ['wags its tail', 'says woof', 'likes walks', 'licks your face', 'woof'],
  Fish: ['lives in water', 'has no legs', 'blows bubbles', 'swish the tail', 'blub'],
  Lion: ['king of the animals', 'a big roar', 'golden mane', 'sleeps a lot', 'roar'],
  Bird: ['has wings', 'can fly', 'sings in the morning', 'builds a nest', 'tweet'],
  Cow: ['gives us milk', 'says moo', 'eats grass', 'on the farm', 'moo'],
  Horse: ['you can ride it', 'runs fast', 'says neigh', 'a long tail', 'gallop'],
  Pig: ['likes mud', 'says oink', 'a curly tail', 'clever and pink', 'oink'],
  Sheep: ['gives us wool', 'says baa', 'a fluffy coat', 'in a field', 'baa'],
  Duck: ['swims on a pond', 'says quack', 'webbed feet', 'yellow when little', 'quack'],
  Rabbit: ['long ears', 'hops hop hop', 'likes carrots', 'a fluffy tail', 'hop'],
  Bear: ['big and furry', 'likes honey', 'sleeps in winter', 'a loud growl', 'growl'],
  Elephant: ['the biggest land animal', 'a long trunk', 'never forgets', 'stomps softly', 'toot'],
  Giraffe: ['the tallest animal', 'eats from tall trees', 'a long long neck', 'spots on its coat', 'stretch'],
  Monkey: ['climbs trees', 'likes bananas', 'very cheeky', 'swings on a vine', 'ooh'],
  Penguin: ['a bird that cannot fly', 'waddles on ice', 'swims like a rocket', 'black and white', 'waddle'],
  Dolphin: ['smart in the sea', 'jumps the waves', 'clicks and sings', 'a friend of boats', 'leap'],
  Shark: ['sharp teeth', 'swims very fast', 'not a toy', 'in the deep sea', 'zoom'],
  Turtle: ['a hard shell', 'walks so slowly', 'lives a long time', 'hides its head', 'slow'],
  Owl: ['awake at night', 'big round eyes', 'says hoo hoo', 'turns its head', 'hoo'],
  Bee: ['makes honey', 'buzz buzz', 'likes flowers', 'do not squash it', 'buzz'],
  Butterfly: ['starts as a caterpillar', 'quiet wings', 'drinks from flowers', 'colours in the air', 'flutter'],
  Red: ['like a fire engine', 'stop at the light', 'a ripe strawberry', 'hot and bright', 'stop'],
  Blue: ['like the sky', 'like the sea', 'a cool colour', 'sad can feel blue too', 'whoosh'],
  Yellow: ['like the sun', 'like a banana', 'happy and bright', 'a school bus', 'shine'],
  Green: ['like grass', 'like a frog', 'go at the light', 'trees in summer', 'grow'],
  Pink: ['like candy floss', 'like a piglet', 'soft and sweet', 'a flower petal', 'blush'],
  Black: ['like the night', 'like a panther', 'hides in the dark', 'the opposite of white', 'shadow'],
  White: ['like snow', 'like milk', 'clouds on a quiet day', 'a blank page', 'soft'],
  Purple: ['like grapes', 'a mix of red and blue', 'a royal colour', 'a violet flower', 'mix'],
  Mother: ['she hugs you', 'she knows your favourite soup', 'you can tell her secrets', 'family love', 'hug'],
  Father: ['he lifts you high', 'he tells long jokes', 'he helps with homework', 'family love', 'lift'],
  Baby: ['tiny hands', 'needs milk and sleep', 'cannot walk yet', 'we use a soft voice', 'coo'],
  Teacher: ['helps you learn', 'asks good questions', 'writes on the board', 'say good morning', 'listen'],
  Doctor: ['helps when you are ill', 'a white coat', 'looks in your ears', 'be brave', 'ahh'],
  Friend: ['plays with you', 'shares snacks', 'says sorry and means it', 'two is better than one', 'share'],
  Pizza: ['hot circle of cheese', 'cut into triangles', 'blow before you bite', 'share the last slice', 'spin'],
};

const SAY_FNS = [
  (w, a) => `Careful with the ${w}. It is ${a[0]}.`,
  (w, a) => `Can you tell me why ${w} is ${a[1]}?`,
  (w, a) => `Let's pretend. You sell ${w} in a tiny shop. What do you say?`,
  (w, a) => `Oh no — the ${w} ${a[4] === 'hot' ? 'is too hot' : 'fell down'}! What do we do?`,
  (w, a) => `Close your eyes. Imagine ${w}. It is ${a[0]}. Now open and say the word.`,
  (w, a) => `I spy something that is ${a[3]}. Yes — ${w}!`,
  (w, a) => `Please pass the ${w}. Say it with the magic word: please.`,
  (w, a) => `Would you rather have ${w} now, or later? Tell me why.`,
  (w, a) => `Grandma always said, “Remember, ${w} is ${a[1]}.” Can you say that?`,
  (w, a) => `If a tiny ant saw ${w}, it would say “Wow, so big!” What would YOU say?`,
  (w, a) => `Use ${w} in a sentence with because. Ready? Go.`,
  (w, a) => `Mime ${w} with no words. Then say: this is ${w}.`,
  (w, a) => `The opposite day: we do NOT want ${w}. Now the real day: we DO want ${w}!`,
  (w, a) => `Whisper ${w}. Now say ${w} in a giant voice. Which one felt better?`,
  (w, a) => `Teach me like a teacher: “Class, today the word is ${w}.”`,
  (w, a) => `A story in one line: Once a child found ${w} and smiled.`,
  (w, a) => `Ask your tutor a question that uses ${w}.`,
  (w, a) => `Is ${w} for eating, wearing, riding, or feeling? Prove it.`,
  (w, a) => `Put ${w} in this frame: I can see ______.`,
  (w, a) => `Put ${w} in this frame: I need ______ because ______.`,
  (w, a) => `On a rainy day we think of ${w}. Why?`,
  (w, a) => `Give ${w} a job. What is it for?`,
  (w, a) => `If ${w} could talk, it would say “${a[4]}!” Answer it.`,
  (w, a) => `Count to three, then say ${w} on three. One… two…`,
];

const CHANT_FNS = [
  (w, a) => `Soft voice: ${w}… Loud voice: ${w}! Soft again: ${w}.`,
  (w, a) => `Clap the beats: ${w.toUpperCase()} — say it on the last clap.`,
  (w, a) => `Echo me. Me: ${w}? You: ${w}! Me: ${w}? You: ${w}!`,
  (w, a) => `Slow ${w}… faster ${w}… freeze! Now whisper ${w}.`,
  (w, a) => `March: left, right, ${w}! Left, right, ${w}!`,
  (w, a) => `A tiny mouse says ${w}. A giant says ${w}. You pick a voice.`,
  (w, a) => `Question chant: Where is ${w}? Here is ${w}!`,
  (w, a) => `Silly opera: la-la-${w}, la-la-${w}!`,
  (w, a) => `Knock knock. Who’s there? ${w}! ${w} who? ${w} sitting on your shoe!`,
  (w, a) => `Rain voice, sun voice, ${w} voice. Switch!`,
  (w, a) => `Two claps, one ${w}. Two claps, one ${w}.`,
  (w, a) => `Slide the word: ${w.charAt(0)}… ${w}. Again.`,
  (w, a) => `Robot voice: ${w}. Monster voice: ${w}. Kind voice: ${w}.`,
  (w, a) => `Hide the word in a tune: na-na-${w}, na-na-${w}.`,
  (w, a) => `Toss a pretend ball. Catch it and shout ${w}.`,
  (w, a) => `Spell it in the air, then stamp and say ${w}.`,
];

const ASK_FNS = [
  (w) => `If I hide the picture, can you still say ${w} and use it in a sentence?`,
  (w) => `Is ${w} a thing you can hold, a place you go, or a thing you do?`,
  (w) => `Tell me one true thing and one silly thing about ${w}.`,
  (w) => `Would a baby know ${w}? How would you explain it?`,
  (w) => `Can ${w} move by itself? How do you know?`,
  (w) => `Name a colour, a size and a feeling that fit ${w}.`,
];

function hash(s, salt = 0) {
  let h = salt * 2654435761;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 1597334677);
  return Math.abs(h);
}
function pick(arr, s, salt) { return arr[hash(s, salt) % arr.length]; }

function article(w) {
  const x = w.toLowerCase();
  if (/s$/.test(x) && !['bus','glass','dress'].includes(x)) return '';
  if (/^(a|e|i|o|u)/i.test(x)) return 'an ';
  return 'a ';
}

function build(word) {
  if (CUSTOM[word]) {
    const c = CUSTOM[word];
    return {
      say: c.say,
      chants: c.chants,
      ask: c.ask,
      talk: c.talk,
      fact: c.fact,
      yes: c.yes || 'Yes — tell me more.',
      no: c.no || 'Not that one. Try again.',
      why: c.why || c.fact,
    };
  }
  const a = FACTS[word] || [
    'part of today’s lesson',
    'something you can act out',
    'worth a full sentence',
    'on the picture card',
    'tap',
  ];
  const w = word.toLowerCase();
  const used = new Set();
  const uniquePick = (fns, salt0) => {
    for (let k = 0; k < 20; k++) {
      const s = pick(fns, word, salt0 + k)(w, a);
      if (!used.has(s)) { used.add(s); return s; }
    }
    return pick(fns, word, salt0 + 99)(w, a);
  };
  const say = [uniquePick(SAY_FNS, 1), uniquePick(SAY_FNS, 11), uniquePick(SAY_FNS, 21)];
  const chants = [uniquePick(CHANT_FNS, 4), uniquePick(CHANT_FNS, 14)];
  const ask = pick(ASK_FNS, word, 6)(w);
  const talk = `Do not say “This is ${w}.” Say something new, like please, because, or can I.`;
  const fact = `Find ${w} in real life this week. Tell your tutor where.`;
  return { say, chants, ask, talk, fact, yes: 'Yes — and I can say more.', no: 'Not that one.', why: `Use the word ${word} in a longer sentence to prove it.` };
}

const out = {};
for (const w of [...words].sort()) out[w] = build(w);

fs.writeFileSync('src/data/talkBank.json', JSON.stringify(out));
console.log('words', Object.keys(out).length, 'bytes', fs.statSync('src/data/talkBank.json').size);
console.log('pizza', JSON.stringify(out.Pizza, null, 2));
console.log('Apple', JSON.stringify(out.Apple, null, 2));
console.log('Happy', JSON.stringify(out.Happy, null, 2));

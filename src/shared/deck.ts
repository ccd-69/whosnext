import { Card, CardPack } from './types.js';

export const BASE_BLACK_CARDS: Card[] = [
  { id: 'b1', text: 'Why can\'t I sleep at night?', type: 'black', pickCount: 1 },
  { id: 'b2', text: 'What\'s that smell?', type: 'black', pickCount: 1 },
  { id: 'b3', text: 'I got 99 problems but _____ ain\'t one.', type: 'black', pickCount: 1 },
  { id: 'b4', text: 'Maybe she\'s born with it. Maybe it\'s _____.', type: 'black', pickCount: 1 },
  { id: 'b5', text: 'What\'s the next Happy Meal toy?', type: 'black', pickCount: 1 },
  { id: 'b6', text: '_____. It\'s a trap!', type: 'black', pickCount: 1 },
  { id: 'b7', text: 'The class field trip was completely ruined by _____.', type: 'black', pickCount: 1 },
  { id: 'b8', text: 'What\'s my secret power?', type: 'black', pickCount: 1 },
  { id: 'b9', text: 'What ended my last relationship?', type: 'black', pickCount: 1 },
  { id: 'b10', text: 'MTV\'s newest reality show features eight washed-up celebrities living with _____.', type: 'black', pickCount: 1 },
  { id: 'b11', text: 'I drink to forget _____.', type: 'black', pickCount: 1 },
  { id: 'b12', text: 'I\'m sorry, Professor, but I couldn\'t complete my homework because of _____.', type: 'black', pickCount: 1 },
  { id: 'b13', text: 'What is Batman\'s guilty pleasure?', type: 'black', pickCount: 1 },
  { id: 'b14', text: 'This is the way the world ends. Not with a bang but with _____.', type: 'black', pickCount: 1 },
  { id: 'b15', text: 'What\'s a girl\'s best friend?', type: 'black', pickCount: 1 },
  { id: 'b16', text: 'TSA guidelines now prohibit _____ on airplanes.', type: 'black', pickCount: 1 },
  { id: 'b17', text: '_____. That\'s how I want to die.', type: 'black', pickCount: 1 },
  { id: 'b18', text: 'For my next trick, I will pull _____ out of _____.', type: 'black', pickCount: 2 },
  { id: 'b19', text: 'In M. Night Shyamalan\'s new movie, Bruce Willis discovers that _____ had really been _____ all along.', type: 'black', pickCount: 2 },
  { id: 'b20', text: '_____ is a slippery slope that leads to _____.', type: 'black', pickCount: 2 },
];

export const BASE_WHITE_CARDS: Card[] = [
  { id: 'w1', text: 'Coat hanger abortions', type: 'white' },
  { id: 'w2', text: 'Man meat', type: 'white' },
  { id: 'w3', text: 'Autocannibalism', type: 'white' },
  { id: 'w4', text: 'Vigorous jazz hands', type: 'white' },
  { id: 'w5', text: 'Flightless birds', type: 'white' },
  { id: 'w6', text: 'Pictures of boobs', type: 'white' },
  { id: 'w7', text: 'Doing the right thing', type: 'white' },
  { id: 'w8', text: 'The violation of our most basic human rights', type: 'white' },
  { id: 'w9', text: 'Viagra', type: 'white' },
  { id: 'w10', text: 'Self-loathing', type: 'white' },
  { id: 'w11', text: 'A sad handjob', type: 'white' },
  { id: 'w12', text: 'Spectacular abs', type: 'white' },
  { id: 'w13', text: 'A really cool hat', type: 'white' },
  { id: 'w14', text: 'Poor life choices', type: 'white' },
  { id: 'w15', text: 'My relationship status', type: 'white' },
  { id: 'w16', text: 'The Russians', type: 'white' },
  { id: 'w17', text: 'Auschwitz', type: 'white' },
  { id: 'w18', text: 'The Hustle', type: 'white' },
  { id: 'w19', text: 'The placenta', type: 'white' },
  { id: 'w20', text: 'My sex life', type: 'white' },
  { id: 'w21', text: 'Oprah', type: 'white' },
  { id: 'w22', text: 'Vehicular manslaughter', type: 'white' },
  { id: 'w23', text: 'Puppies!', type: 'white' },
  { id: 'w24', text: 'Saxophone solos', type: 'white' },
  { id: 'w25', text: 'Terry Fox\'s prosthetic leg', type: 'white' },
  { id: 'w26', text: 'The penny whistle solo from "My Heart Will Go On"', type: 'white' },
  { id: 'w27', text: 'A time travel paradox', type: 'white' },
  { id: 'w28', text: 'The true meaning of Christmas', type: 'white' },
  { id: 'w29', text: 'Her Majesty, Queen Elizabeth II', type: 'white' },
  { id: 'w30', text: 'Funky fresh rhymes', type: 'white' },
  { id: 'w31', text: 'The Big Bang', type: 'white' },
  { id: 'w32', text: 'An M. Night Shyamalan plot twist', type: 'white' },
  { id: 'w33', text: 'Eating the last known bison', type: 'white' },
  { id: 'w34', text: 'Shiny objects', type: 'white' },
  { id: 'w35', text: 'Consensual sex', type: 'white' },
  { id: 'w36', text: 'World peace', type: 'white' },
  { id: 'w37', text: 'A zesty breakfast burrito', type: 'white' },
  { id: 'w38', text: 'MechaHitler', type: 'white' },
  { id: 'w39', text: 'Donald Trump', type: 'white' },
  { id: 'w40', text: 'A can of whoop-ass', type: 'white' },
  { id: 'w41', text: 'The violation of our most basic human rights', type: 'white' },
  { id: 'w42', text: 'Flying sex snakes', type: 'white' },
  { id: 'w43', text: 'The Amish', type: 'white' },
  { id: 'w44', text: 'The Blood of Christ', type: 'white' },
  { id: 'w45', text: 'The Care Bear Stare', type: 'white' },
  { id: 'w46', text: 'Dead parents', type: 'white' },
  { id: 'w47', text: 'The Rev. Dr. Martin Luther King, Jr.', type: 'white' },
  { id: 'w48', text: 'Famine', type: 'white' },
  { id: 'w49', text: 'Father\'s disappointment', type: 'white' },
  { id: 'w50', text: 'AXE Body Spray', type: 'white' },
];

export const NSFW_BLACK_CARDS: Card[] = [
  { id: 'nb1', text: 'During sex, I like to think about _____.', type: 'black', pickCount: 1 },
  { id: 'nb2', text: 'What did I bring back from Mexico?', type: 'black', pickCount: 1 },
  { id: 'nb3', text: 'What\'s the most sensitive part of the body?', type: 'black', pickCount: 1 },
  { id: 'nb4', text: 'I like my women like I like my _____.', type: 'black', pickCount: 1 },
  { id: 'nb5', text: 'What gets me wet?', type: 'black', pickCount: 1 },
  { id: 'nb6', text: 'Tonight on 60 Minutes: _____ exposed.', type: 'black', pickCount: 1 },
  { id: 'nb7', text: 'After four years of college, I finally got a degree in _____.', type: 'black', pickCount: 1 },
  { id: 'nb8', text: '_____: good to the last drop.', type: 'black', pickCount: 1 },
  { id: 'nb9', text: 'What\'s my favorite bedroom activity?', type: 'black', pickCount: 1 },
  { id: 'nb10', text: 'In the bedroom, I\'m known as "The _____."', type: 'black', pickCount: 1 },
];

export const NSFW_WHITE_CARDS: Card[] = [
  { id: 'nw1', text: 'Anal beads', type: 'white' },
  { id: 'nw2', text: 'A massive orgy', type: 'white' },
  { id: 'nw3', text: 'A used tampon', type: 'white' },
  { id: 'nw4', text: 'Double penetration', type: 'white' },
  { id: 'nw5', text: 'Eating ass', type: 'white' },
  { id: 'nw6', text: 'A glory hole', type: 'white' },
  { id: 'nw7', text: 'A Brazilian wax', type: 'white' },
  { id: 'nw8', text: 'A micropenis', type: 'white' },
  { id: 'nw9', text: 'A gimp suit', type: 'white' },
  { id: 'nw10', text: 'Premature ejaculation', type: 'white' },
  { id: 'nw11', text: 'A fleshlight', type: 'white' },
  { id: 'nw12', text: 'Cybernetic enhancements', type: 'white' },
  { id: 'nw13', text: 'A prolapsed anus', type: 'white' },
  { id: 'nw14', text: 'Dick pics', type: 'white' },
  { id: 'nw15', text: 'A pearl necklace', type: 'white' },
  { id: 'nw16', text: 'Fisting', type: 'white' },
  { id: 'nw17', text: 'A queef', type: 'white' },
  { id: 'nw18', text: 'A rusty trombone', type: 'white' },
  { id: 'nw19', text: 'A Cleveland steamer', type: 'white' },
  { id: 'nw20', text: 'A strap-on', type: 'white' },
  { id: 'nw21', text: 'A blowjob from a toothless hooker', type: 'white' },
  { id: 'nw22', text: 'A cum sock', type: 'white' },
  { id: 'nw23', text: 'Blue balls', type: 'white' },
  { id: 'nw24', text: 'A yeast infection', type: 'white' },
  { id: 'nw25', text: 'A bukkake', type: 'white' },
  { id: 'nw26', text: 'Choking during sex', type: 'white' },
  { id: 'nw27', text: 'A sybian', type: 'white' },
  { id: 'nw28', text: 'Period blood', type: 'white' },
  { id: 'nw29', text: 'A cock ring', type: 'white' },
  { id: 'nw30', text: 'Tentacle porn', type: 'white' },
];

export const DARK_BLACK_CARDS: Card[] = [
  { id: 'db1', text: 'What\'s the most emo?', type: 'black', pickCount: 1 },
  { id: 'db2', text: 'What brought the orgy to a grinding halt?', type: 'black', pickCount: 1 },
  { id: 'db3', text: 'When I am a billionaire, I shall erect a 50-foot statue to commemorate _____.', type: 'black', pickCount: 1 },
  { id: 'db4', text: 'What\'s there a ton of in heaven?', type: 'black', pickCount: 1 },
  { id: 'db5', text: 'The Smithsonian has just opened an interactive exhibit on _____.', type: 'black', pickCount: 1 },
  { id: 'db6', text: 'When I am President of the United States, I will create the Department of _____.', type: 'black', pickCount: 1 },
  { id: 'db7', text: 'Turns out that _____ was just _____ all along.', type: 'black', pickCount: 2 },
  { id: 'db8', text: 'My country, \'tis of thee, sweet land of _____.', type: 'black', pickCount: 1 },
  { id: 'db9', text: 'Alternative medicine is now embracing the curative powers of _____.', type: 'black', pickCount: 1 },
  { id: 'db10', text: 'What\'s the new fad diet?', type: 'black', pickCount: 1 },
];

export const DARK_WHITE_CARDS: Card[] = [
  { id: 'dw1', text: 'Auschwitz', type: 'white' },
  { id: 'dw2', text: 'Hospice care', type: 'white' },
  { id: 'dw3', text: 'A brain tumor', type: 'white' },
  { id: 'dw4', text: 'Dead babies', type: 'white' },
  { id: 'dw5', text: 'Drowning the homeless', type: 'white' },
  { id: 'dw6', text: 'Child beauty pageants', type: 'white' },
  { id: 'dw7', text: 'A miscarriage', type: 'white' },
  { id: 'dw8', text: 'Heroin', type: 'white' },
  { id: 'dw9', text: 'A gas chamber', type: 'white' },
  { id: 'dw10', text: 'Date rape', type: 'white' },
  { id: 'dw11', text: 'A school shooting', type: 'white' },
  { id: 'dw12', text: 'Pedophiles', type: 'white' },
  { id: 'dw13', text: 'The Holocaust', type: 'white' },
  { id: 'dw14', text: 'Eugenics', type: 'white' },
  { id: 'dw15', text: 'Dying alone and in pain', type: 'white' },
  { id: 'dw16', text: 'A wheelchair-bound racist', type: 'white' },
  { id: 'dw17', text: 'Chainsawing a orphan', type: 'white' },
  { id: 'dw18', text: 'A Nazi doctor', type: 'white' },
  { id: 'dw19', text: 'Ebola', type: 'white' },
  { id: 'dw20', text: 'Selling crack to children', type: 'white' },
  { id: 'dw21', text: 'Domestic violence', type: 'white' },
  { id: 'dw22', text: 'A suicide bomber', type: 'white' },
  { id: 'dw23', text: 'Racism', type: 'white' },
  { id: 'dw24', text: 'AIDS', type: 'white' },
  { id: 'dw25', text: 'Crucifixion', type: 'white' },
  { id: 'dw26', text: 'The clitoris', type: 'white' },
  { id: 'dw27', text: 'Picking up girls at the abortion clinic', type: 'white' },
  { id: 'dw28', text: 'Genuine human connection', type: 'white' },
  { id: 'dw29', text: 'Passive-aggressive Post-it notes', type: 'white' },
  { id: 'dw30', text: 'A live studio audience', type: 'white' },
];

export const ABSURD_BLACK_CARDS: Card[] = [
  { id: 'ab1', text: 'What is the answer to life, the universe, and everything?', type: 'black', pickCount: 1 },
  { id: 'ab2', text: 'I never truly understood _____ until I encountered _____.', type: 'black', pickCount: 2 },
  { id: 'ab3', text: 'What is Elon Musk\'s latest side project?', type: 'black', pickCount: 1 },
  { id: 'ab4', text: 'The CIA is now using _____ to interrogate prisoners.', type: 'black', pickCount: 1 },
  { id: 'ab5', text: 'In his farewell address, George Washington warned Americans about the dangers of _____.', type: 'black', pickCount: 1 },
  { id: 'ab6', text: 'What do old people smell like?', type: 'black', pickCount: 1 },
  { id: 'ab7', text: 'Why am I sticky?', type: 'black', pickCount: 1 },
  { id: 'ab8', text: 'What\'s Teach for America using to inspire inner city students?', type: 'black', pickCount: 1 },
  { id: 'ab9', text: 'Studies show that lab rats navigate mazes 50% faster after being exposed to _____.', type: 'black', pickCount: 1 },
  { id: 'ab10', text: 'I do not know with what weapons World War III will be fought, but World War IV will be fought with _____.', type: 'black', pickCount: 1 },
];

export const ABSURD_WHITE_CARDS: Card[] = [
  { id: 'aw1', text: 'A bowl of mayonnaise and human teeth', type: 'white' },
  { id: 'aw2', text: 'A jar full of pickled toes', type: 'white' },
  { id: 'aw3', text: 'A magic wand that only works on squirrels', type: 'white' },
  { id: 'aw4', text: 'A lifetime supply of hamsters', type: 'white' },
  { id: 'aw5', text: 'Soggy toast', type: 'white' },
  { id: 'aw6', text: 'A taxidermied ferret in a tutu', type: 'white' },
  { id: 'aw7', text: 'An endless loop of diarrhea', type: 'white' },
  { id: 'aw8', text: 'A baby with a full mustache', type: 'white' },
  { id: 'aw9', text: 'Licking a public toilet seat', type: 'white' },
  { id: 'aw10', text: 'A reverse centaur', type: 'white' },
  { id: 'aw11', text: 'A dog that can\'t stop barking at its own shadow', type: 'white' },
  { id: 'aw12', text: 'Soup that is too hot', type: 'white' },
  { id: 'aw13', text: 'A sentient Roomba with PTSD', type: 'white' },
  { id: 'aw14', text: 'A conspiracy theorist who is actually right', type: 'white' },
  { id: 'aw15', text: 'A cloud that looks exactly like your dead grandma', type: 'white' },
  { id: 'aw16', text: 'A fish with legs', type: 'white' },
  { id: 'aw17', text: 'A ham sandwich with no ham', type: 'white' },
  { id: 'aw18', text: 'A crying clown who is also on fire', type: 'white' },
  { id: 'aw19', text: 'A mime having a stroke', type: 'white' },
  { id: 'aw20', text: 'A bucket of expired ranch dressing', type: 'white' },
  { id: 'aw21', text: 'A time-traveling fart', type: 'white' },
  { id: 'aw22', text: 'An egg that refuses to crack', type: 'white' },
  { id: 'aw23', text: 'A parade of depressed pigeons', type: 'white' },
  { id: 'aw24', text: 'A haunted washing machine', type: 'white' },
  { id: 'aw25', text: 'A banana that judges you silently', type: 'white' },
  { id: 'aw26', text: 'A sentient fart cloud', type: 'white' },
  { id: 'aw27', text: 'A sock puppet with a gambling addiction', type: 'white' },
  { id: 'aw28', text: 'A pigeon that knows your secrets', type: 'white' },
  { id: 'aw29', text: 'A salad made of broken dreams', type: 'white' },
  { id: 'aw30', text: 'A horse-sized duck that is also racist', type: 'white' },
];

export const EFFECT_CARDS: Card[] = [
  // Common (3 each)
  { id: 'ef-steal-1', text: 'Steal a card from another player', type: 'white', effect: { type: 'steal_card' } },
  { id: 'ef-steal-2', text: 'Steal a card from another player', type: 'white', effect: { type: 'steal_card' } },
  { id: 'ef-steal-3', text: 'Steal a card from another player', type: 'white', effect: { type: 'steal_card' } },
  { id: 'ef-swap-1', text: 'Swap hands with a random player', type: 'white', effect: { type: 'hand_swap' } },
  { id: 'ef-swap-2', text: 'Swap hands with a random player', type: 'white', effect: { type: 'hand_swap' } },
  { id: 'ef-swap-3', text: 'Swap hands with a random player', type: 'white', effect: { type: 'hand_swap' } },
  { id: 'ef-edit-1', text: 'Edit the text of any card in your hand', type: 'white', effect: { type: 'customize_card' } },
  { id: 'ef-edit-2', text: 'Edit the text of any card in your hand', type: 'white', effect: { type: 'customize_card' } },
  { id: 'ef-edit-3', text: 'Edit the text of any card in your hand', type: 'white', effect: { type: 'customize_card' } },
  { id: 'ef-discard-1', text: 'Discard half your hand (rounded up)', type: 'white', effect: { type: 'half_hand_discard' } },
  { id: 'ef-discard-2', text: 'Discard half your hand (rounded up)', type: 'white', effect: { type: 'half_hand_discard' } },
  { id: 'ef-discard-3', text: 'Discard half your hand (rounded up)', type: 'white', effect: { type: 'half_hand_discard' } },
  { id: 'ef-force-1', text: 'Force another player to submit a random card', type: 'white', effect: { type: 'forced_random' } },
  { id: 'ef-force-2', text: 'Force another player to submit a random card', type: 'white', effect: { type: 'forced_random' } },
  { id: 'ef-force-3', text: 'Force another player to submit a random card', type: 'white', effect: { type: 'forced_random' } },
  { id: 'ef-dblhand-1', text: 'Double points for all cards in your hand this round', type: 'white', effect: { type: 'double_points_hand' } },
  { id: 'ef-dblhand-2', text: 'Double points for all cards in your hand this round', type: 'white', effect: { type: 'double_points_hand' } },
  { id: 'ef-dblhand-3', text: 'Double points for all cards in your hand this round', type: 'white', effect: { type: 'double_points_hand' } },
  // Uncommon (2 each)
  { id: 'ef-dblwin-1', text: 'If this wins, you get 2 points', type: 'white', effect: { type: 'double_points_win' } },
  { id: 'ef-dblwin-2', text: 'If this wins, you get 2 points', type: 'white', effect: { type: 'double_points_win' } },
  { id: 'ef-drain-1', text: 'If this wins, the winner loses 1 point', type: 'white', effect: { type: 'point_drain' } },
  { id: 'ef-drain-2', text: 'If this wins, the winner loses 1 point', type: 'white', effect: { type: 'point_drain' } },
  { id: 'ef-down-1', text: 'Target player draws half as many cards next round', type: 'white', effect: { type: 'card_quality_down' } },
  { id: 'ef-down-2', text: 'Target player draws half as many cards next round', type: 'white', effect: { type: 'card_quality_down' } },
  { id: 'ef-abduct-1', text: 'You are abducted for 2 rounds, then get extra cards', type: 'white', effect: { type: 'abduction' } },
  { id: 'ef-abduct-2', text: 'You are abducted for 2 rounds, then get extra cards', type: 'white', effect: { type: 'abduction' } },
  // Ultra rare (1 each) — exodia
  { id: 'ef-exodia', text: 'EXODIA — You immediately win the game', type: 'white', effect: { type: 'exodia' } },
];

export const GEEK_BLACK_CARDS: Card[] = [
  { id: 'gb1', text: `The only thing that can save the princess now is _____.`, type: 'black', pickCount: 1 },
  { id: 'gb2', text: `In the next Pokemon game, the new type will be _____.`, type: 'black', pickCount: 1 },
  { id: 'gb3', text: `What is the next big tech innovation?`, type: 'black', pickCount: 1 },
  { id: 'gb4', text: `Why did the Wi-Fi go down?`, type: 'black', pickCount: 1 },
  { id: 'gb5', text: `What is the final boss of the internet?`, type: 'black', pickCount: 1 },
  { id: 'gb6', text: `I can't believe they added _____ to Minecraft.`, type: 'black', pickCount: 1 },
  { id: 'gb7', text: `The true cause of the blue screen of death was _____.`, type: 'black', pickCount: 1 },
  { id: 'gb8', text: `What is the geek's guilty pleasure?`, type: 'black', pickCount: 1 },
  { id: 'gb9', text: `In the next Marvel movie, the villain will be _____.`, type: 'black', pickCount: 1 },
  { id: 'gb10', text: `What did the AI uprising start with?`, type: 'black', pickCount: 1 },
];

export const GEEK_WHITE_CARDS: Card[] = [
  { id: 'gw1', text: `A 4chan thread`, type: 'white' },
  { id: 'gw2', text: `RGB lighting`, type: 'white' },
  { id: 'gw3', text: `A NFT of a fart`, type: 'white' },
  { id: 'gw4', text: `The Konami Code`, type: 'white' },
  { id: 'gw5', text: `A creeper in real life`, type: 'white' },
  { id: 'gw6', text: `An oversized gaming chair`, type: 'white' },
  { id: 'gw7', text: `A mechanical keyboard`, type: 'white' },
  { id: 'gw8', text: `A speedrun of life`, type: 'white' },
  { id: 'gw9', text: `The metaverse`, type: 'white' },
  { id: 'gw10', text: `A bitcoin wallet`, type: 'white' },
  { id: 'gw11', text: `A rage quit`, type: 'white' },
  { id: 'gw12', text: `A LAN party`, type: 'white' },
  { id: 'gw13', text: `A glitch in the matrix`, type: 'white' },
  { id: 'gw14', text: `A modded Skyrim`, type: 'white' },
  { id: 'gw15', text: `A steam sale`, type: 'white' },
  { id: 'gw16', text: `A waifu pillow`, type: 'white' },
  { id: 'gw17', text: `A DDoS attack`, type: 'white' },
  { id: 'gw18', text: `A Tesla in space`, type: 'white' },
  { id: 'gw19', text: `A Linux user`, type: 'white' },
  { id: 'gw20', text: `A 360 no-scope`, type: 'white' },
  { id: 'gw21', text: `A broken graphics card`, type: 'white' },
  { id: 'gw22', text: `A VR headset`, type: 'white' },
  { id: 'gw23', text: `A hot pocket`, type: 'white' },
  { id: 'gw24', text: `A Linux installation`, type: 'white' },
  { id: 'gw25', text: `A Rickroll`, type: 'white' },
  { id: 'gw26', text: `A Discord moderator`, type: 'white' },
  { id: 'gw27', text: `A neckbeard`, type: 'white' },
  { id: 'gw28', text: `A failed Kickstarter`, type: 'white' },
  { id: 'gw29', text: `A pay-to-win skin`, type: 'white' },
  { id: 'gw30', text: `A cheeto-dusted finger`, type: 'white' },
];

export const FOOD_BLACK_CARDS: Card[] = [
  { id: 'fb1', text: `The secret ingredient in my grandmother's recipe is _____.`, type: 'black', pickCount: 1 },
  { id: 'fb2', text: `What is the next big food trend?`, type: 'black', pickCount: 1 },
  { id: 'fb3', text: `Why did the chef get fired?`, type: 'black', pickCount: 1 },
  { id: 'fb4', text: `What did I find in my fast food burger?`, type: 'black', pickCount: 1 },
  { id: 'fb5', text: `The cooking show was ruined by _____.`, type: 'black', pickCount: 1 },
  { id: 'fb6', text: `I like my coffee like I like my _____.`, type: 'black', pickCount: 1 },
  { id: 'fb7', text: `What is the most exotic food?`, type: 'black', pickCount: 1 },
  { id: 'fb8', text: `The new flavor at the ice cream shop is _____.`, type: 'black', pickCount: 1 },
  { id: 'fb9', text: `What did Gordon Ramsay call the worst thing he ever ate?`, type: 'black', pickCount: 1 },
  { id: 'fb10', text: `What is the best pizza topping?`, type: 'black', pickCount: 1 },
];

export const FOOD_WHITE_CARDS: Card[] = [
  { id: 'fw1', text: `A deep-fried twinkie`, type: 'white' },
  { id: 'fw2', text: `Kale`, type: 'white' },
  { id: 'fw3', text: `A ghost pepper`, type: 'white' },
  { id: 'fw4', text: `A Michelin star`, type: 'white' },
  { id: 'fw5', text: `A jar of mayonnaise`, type: 'white' },
  { id: 'fw6', text: `A raw onion`, type: 'white' },
  { id: 'fw7', text: `A gas station sushi`, type: 'white' },
  { id: 'fw8', text: `A cronut`, type: 'white' },
  { id: 'fw9', text: `A avocado toast`, type: 'white' },
  { id: 'fw10', text: `A expired yogurt`, type: 'white' },
  { id: 'fw11', text: `A all-you-can-eat buffet`, type: 'white' },
  { id: 'fw12', text: `A ketchup on a hot dog`, type: 'white' },
  { id: 'fw13', text: `A truffle oil`, type: 'white' },
  { id: 'fw14', text: `A pineapple on pizza`, type: 'white' },
  { id: 'fw15', text: `A spork`, type: 'white' },
  { id: 'fw16', text: `A vegan cheese`, type: 'white' },
  { id: 'fw17', text: `A baby back ribs`, type: 'white' },
  { id: 'fw18', text: `A food coma`, type: 'white' },
  { id: 'fw19', text: `A chef's kiss`, type: 'white' },
  { id: 'fw20', text: `A secret sauce`, type: 'white' },
  { id: 'fw21', text: `A burnt toast`, type: 'white' },
  { id: 'fw22', text: `A ramen noodle`, type: 'white' },
  { id: 'fw23', text: `A chocolate fountain`, type: 'white' },
  { id: 'fw24', text: `A tofu`, type: 'white' },
  { id: 'fw25', text: `A bacon-wrapped everything`, type: 'white' },
  { id: 'fw26', text: `A hangry person`, type: 'white' },
  { id: 'fw27', text: `A tapas bar`, type: 'white' },
  { id: 'fw28', text: `A souffle`, type: 'white' },
  { id: 'fw29', text: `A hot sauce`, type: 'white' },
  { id: 'fw30', text: `A fondue pot`, type: 'white' },
];

export const SPORTS_BLACK_CARDS: Card[] = [
  { id: 'sb1', text: `The newest Olympic sport is _____.`, type: 'black', pickCount: 1 },
  { id: 'sb2', text: `What caused the referee to stop the game?`, type: 'black', pickCount: 1 },
  { id: 'sb3', text: `The halftime show featured _____.`, type: 'black', pickCount: 1 },
  { id: 'sb4', text: `What is the real reason the team lost?`, type: 'black', pickCount: 1 },
  { id: 'sb5', text: `The coach's secret weapon is _____.`, type: 'black', pickCount: 1 },
  { id: 'sb6', text: `What did the athlete test positive for?`, type: 'black', pickCount: 1 },
  { id: 'sb7', text: `The baseball game was delayed by _____.`, type: 'black', pickCount: 1 },
  { id: 'sb8', text: `What is the most extreme sport?`, type: 'black', pickCount: 1 },
  { id: 'sb9', text: `The soccer riot was started by _____.`, type: 'black', pickCount: 1 },
  { id: 'sb10', text: `What is the worst sports injury?`, type: 'black', pickCount: 1 },
];

export const SPORTS_WHITE_CARDS: Card[] = [
  { id: 'sw1', text: `A deflated football`, type: 'white' },
  { id: 'sw2', text: `A streaker`, type: 'white' },
  { id: 'sw3', text: `A performance-enhancing drug`, type: 'white' },
  { id: 'sw4', text: `A mascot fight`, type: 'white' },
  { id: 'sw5', text: `A referee's blindness`, type: 'white' },
  { id: 'sw6', text: `A home run`, type: 'white' },
  { id: 'sw7', text: `A tailgate party`, type: 'white' },
  { id: 'sw8', text: `A trophy wife`, type: 'white' },
  { id: 'sw9', text: `A steroids scandal`, type: 'white' },
  { id: 'sw10', text: `A penalty kick`, type: 'white' },
  { id: 'sw11', text: `A broken bat`, type: 'white' },
  { id: 'sw12', text: `A soccer mom`, type: 'white' },
  { id: 'sw13', text: `A slam dunk`, type: 'white' },
  { id: 'sw14', text: `A hat trick`, type: 'white' },
  { id: 'sw15', text: `A underdog story`, type: 'white' },
  { id: 'sw16', text: `A coach's temper`, type: 'white' },
  { id: 'sw17', text: `A fantasy league`, type: 'white' },
  { id: 'sw18', text: `A body slam`, type: 'white' },
  { id: 'sw19', text: `A rain delay`, type: 'white' },
  { id: 'sw20', text: `A trading card`, type: 'white' },
  { id: 'sw21', text: `A locker room talk`, type: 'white' },
  { id: 'sw22', text: `A hooligan`, type: 'white' },
  { id: 'sw23', text: `A walk-off home run`, type: 'white' },
  { id: 'sw24', text: `A concussion`, type: 'white' },
  { id: 'sw25', text: `A championship ring`, type: 'white' },
  { id: 'sw26', text: `A buzzer beater`, type: 'white' },
  { id: 'sw27', text: `A tennis grunt`, type: 'white' },
  { id: 'sw28', text: `A cursed jersey`, type: 'white' },
  { id: 'sw29', text: `A benchwarmer`, type: 'white' },
  { id: 'sw30', text: `A Gatorade shower`, type: 'white' },
];

export const FANTASY_BLACK_CARDS: Card[] = [
  { id: 'fab1', text: `The dragon's only weakness is _____.`, type: 'black', pickCount: 1 },
  { id: 'fab2', text: `What did the wizard summon by accident?`, type: 'black', pickCount: 1 },
  { id: 'fab3', text: `The prophecy foretold _____.`, type: 'black', pickCount: 1 },
  { id: 'fab4', text: `What is hidden in the dungeon?`, type: 'black', pickCount: 1 },
  { id: 'fab5', text: `The elven kingdom is famous for _____.`, type: 'black', pickCount: 1 },
  { id: 'fab6', text: `What did the necromancer raise from the dead?`, type: 'black', pickCount: 1 },
  { id: 'fab7', text: `The magic potion requires _____.`, type: 'black', pickCount: 1 },
  { id: 'fab8', text: `What is the barbarian's favorite hobby?`, type: 'black', pickCount: 1 },
  { id: 'fab9', text: `The dark lord was defeated by _____.`, type: 'black', pickCount: 1 },
  { id: 'fab10', text: `What is the bard's new hit song about?`, type: 'black', pickCount: 1 },
];

export const FANTASY_WHITE_CARDS: Card[] = [
  { id: 'faw1', text: `A +1 sword of sadness`, type: 'white' },
  { id: 'faw2', text: `A cursed amulet`, type: 'white' },
  { id: 'faw3', text: `A potion of dubious origin`, type: 'white' },
  { id: 'faw4', text: `A talking horse`, type: 'white' },
  { id: 'faw5', text: `A dungeon master`, type: 'white' },
  { id: 'faw6', text: `A fireball to the face`, type: 'white' },
  { id: 'faw7', text: `A quest for the holy grail`, type: 'white' },
  { id: 'faw8', text: `A troll under a bridge`, type: 'white' },
  { id: 'faw9', text: `A invisibility cloak`, type: 'white' },
  { id: 'faw10', text: `A bag of holding`, type: 'white' },
  { id: 'faw11', text: `A critical fail`, type: 'white' },
  { id: 'faw12', text: `A dragon hoard`, type: 'white' },
  { id: 'faw13', text: `A paladin's righteousness`, type: 'white' },
  { id: 'faw14', text: `A chaotic evil alignment`, type: 'white' },
  { id: 'faw15', text: `A goblin army`, type: 'white' },
  { id: 'faw16', text: `A magical artifact`, type: 'white' },
  { id: 'faw17', text: `A D20`, type: 'white' },
  { id: 'faw18', text: `A elven archer`, type: 'white' },
  { id: 'faw19', text: `A necromancer's spellbook`, type: 'white' },
  { id: 'faw20', text: `A tavern brawl`, type: 'white' },
  { id: 'faw21', text: `A shiny loot`, type: 'white' },
  { id: 'faw22', text: `A fairy godmother`, type: 'white' },
  { id: 'faw23', text: `A zombie apocalypse`, type: 'white' },
  { id: 'faw24', text: `A ancient rune`, type: 'white' },
  { id: 'faw25', text: `A mimic chest`, type: 'white' },
  { id: 'faw26', text: `A healing potion`, type: 'white' },
  { id: 'faw27', text: `A dark forest`, type: 'white' },
  { id: 'faw28', text: `A royal bloodline`, type: 'white' },
  { id: 'faw29', text: `A enchanted rose`, type: 'white' },
  { id: 'faw30', text: `A wizards beard`, type: 'white' },
];

export const MUSIC_BLACK_CARDS: Card[] = [
  { id: 'mb1', text: `The new genre taking over the charts is _____.`, type: 'black', pickCount: 1 },
  { id: 'mb2', text: `What was the real reason the band broke up?`, type: 'black', pickCount: 1 },
  { id: 'mb3', text: `The music video was banned for featuring _____.`, type: 'black', pickCount: 1 },
  { id: 'mb4', text: `What did the DJ drop?`, type: 'black', pickCount: 1 },
  { id: 'mb5', text: `The concert was ruined by _____.`, type: 'black', pickCount: 1 },
  { id: 'mb6', text: `What is the worst thing to hear at a karaoke bar?`, type: 'black', pickCount: 1 },
  { id: 'mb7', text: `The rock star's final words were _____.`, type: 'black', pickCount: 1 },
  { id: 'mb8', text: `What is hidden in the vinyl grooves?`, type: 'black', pickCount: 1 },
  { id: 'mb9', text: `The Grammy for Best New Artist went to _____.`, type: 'black', pickCount: 1 },
  { id: 'mb10', text: `What is the guitar solo actually about?`, type: 'black', pickCount: 1 },
];

export const MUSIC_WHITE_CARDS: Card[] = [
  { id: 'mw1', text: `A one-hit wonder`, type: 'white' },
  { id: 'mw2', text: `A autotune`, type: 'white' },
  { id: 'mw3', text: `A mosh pit`, type: 'white' },
  { id: 'mw4', text: `A boy band reunion`, type: 'white' },
  { id: 'mw5', text: `A tambourine solo`, type: 'white' },
  { id: 'mw6', text: `A vinyl record`, type: 'white' },
  { id: 'mw7', text: `A screamo band`, type: 'white' },
  { id: 'mw8', text: `A roadie`, type: 'white' },
  { id: 'mw9', text: `A lip sync scandal`, type: 'white' },
  { id: 'mw10', text: `A mixtape`, type: 'white' },
  { id: 'mw11', text: `A kazoo`, type: 'white' },
  { id: 'mw12', text: `A breakup album`, type: 'white' },
  { id: 'mw13', text: `A mumble rap`, type: 'white' },
  { id: 'mw14', text: `A power ballad`, type: 'white' },
  { id: 'mw15', text: `A stage dive`, type: 'white' },
  { id: 'mw16', text: `A ukulele`, type: 'white' },
  { id: 'mw17', text: `A backstage pass`, type: 'white' },
  { id: 'mw18', text: `A drop the bass`, type: 'white' },
  { id: 'mw19', text: `A earworm`, type: 'white' },
  { id: 'mw20', text: `A tribute band`, type: 'white' },
  { id: 'mw21', text: `A cowbell`, type: 'white' },
  { id: 'mw22', text: `A heavy metal`, type: 'white' },
  { id: 'mw23', text: `A jazz hands`, type: 'white' },
  { id: 'mw24', text: `A turntable`, type: 'white' },
  { id: 'mw25', text: `A concert ticket`, type: 'white' },
  { id: 'mw26', text: `A yodeling`, type: 'white' },
  { id: 'mw27', text: `A punk rock`, type: 'white' },
  { id: 'mw28', text: `A saxophone`, type: 'white' },
  { id: 'mw29', text: `A record label`, type: 'white' },
  { id: 'mw30', text: `A groupie`, type: 'white' },
];

export const INTERNET_BLACK_CARDS: Card[] = [
  { id: 'ib1', text: `The next viral TikTok trend is _____.`, type: 'black', pickCount: 1 },
  { id: 'ib2', text: `What caused the influencer to get cancelled?`, type: 'black', pickCount: 1 },
  { id: 'ib3', text: `The meme of the decade is _____.`, type: 'black', pickCount: 1 },
  { id: 'ib4', text: `What is the dark web's best-selling item?`, type: 'black', pickCount: 1 },
  { id: 'ib5', text: `The YouTube algorithm recommended _____.`, type: 'black', pickCount: 1 },
  { id: 'ib6', text: `What did the Twitter thread expose?`, type: 'black', pickCount: 1 },
  { id: 'ib7', text: `The Twitch streamer was banned for _____.`, type: 'black', pickCount: 1 },
  { id: 'ib8', text: `What is the next big social media platform?`, type: 'black', pickCount: 1 },
  { id: 'ib9', text: `The Zoom call was interrupted by _____.`, type: 'black', pickCount: 1 },
  { id: 'ib10', text: `What is the best thing to binge-watch?`, type: 'black', pickCount: 1 },
];

export const INTERNET_WHITE_CARDS: Card[] = [
  { id: 'iw1', text: `A Karen`, type: 'white' },
  { id: 'iw2', text: `A TikTok dance`, type: 'white' },
  { id: 'iw3', text: `A conspiracy theory`, type: 'white' },
  { id: 'iw4', text: `A cat video`, type: 'white' },
  { id: 'iw5', text: `A bot account`, type: 'white' },
  { id: 'iw6', text: `A clickbait title`, type: 'white' },
  { id: 'iw7', text: `A NFT bro`, type: 'white' },
  { id: 'iw8', text: `A viral challenge`, type: 'white' },
  { id: 'iw9', text: `A DM slide`, type: 'white' },
  { id: 'iw10', text: `A unsubscribe button`, type: 'white' },
  { id: 'iw11', text: `A incognito mode`, type: 'white' },
  { id: 'iw12', text: `A hashtag`, type: 'white' },
  { id: 'iw13', text: `A flame war`, type: 'white' },
  { id: 'iw14', text: `A deepfake`, type: 'white' },
  { id: 'iw15', text: `A influencer`, type: 'white' },
  { id: 'iw16', text: `A meme stock`, type: 'white' },
  { id: 'iw17', text: `A subscribe button`, type: 'white' },
  { id: 'iw18', text: `A troll farm`, type: 'white' },
  { id: 'iw19', text: `A ASMR video`, type: 'white' },
  { id: 'iw20', text: `A unboxing video`, type: 'white' },
  { id: 'iw21', text: `A FYP`, type: 'white' },
  { id: 'iw22', text: `A doomscroll`, type: 'white' },
  { id: 'iw23', text: `A reply guy`, type: 'white' },
  { id: 'iw24', text: `A thirst trap`, type: 'white' },
  { id: 'iw25', text: `A algorithm`, type: 'white' },
  { id: 'iw26', text: `A viral tweet`, type: 'white' },
  { id: 'iw27', text: `A podcast`, type: 'white' },
  { id: 'iw28', text: `A stan account`, type: 'white' },
  { id: 'iw29', text: `A cringe compilation`, type: 'white' },
  { id: 'iw30', text: `A buffering wheel`, type: 'white' },
];

export function getCardsForPacks(packs: CardPack[], _includeEffects: boolean) {
  const { blackCards, whiteCards } = getCardsForPacksInternal(packs);
  // Effect cards are no longer mixed into the deck; they drop via drawCardForPlayer in roomManager instead
  return { blackCards, whiteCards };
}

function getCardsForPacksInternal(packs: CardPack[]) {
  const blackCards: Card[] = [];
  const whiteCards: Card[] = [];
  for (const pack of packs) {
    switch (pack) {
      case 'base':
        blackCards.push(...BASE_BLACK_CARDS);
        whiteCards.push(...BASE_WHITE_CARDS);
        break;
      case 'nsfw':
        blackCards.push(...NSFW_BLACK_CARDS);
        whiteCards.push(...NSFW_WHITE_CARDS);
        break;
      case 'dark':
        blackCards.push(...DARK_BLACK_CARDS);
        whiteCards.push(...DARK_WHITE_CARDS);
        break;
      case 'absurd':
        blackCards.push(...ABSURD_BLACK_CARDS);
        whiteCards.push(...ABSURD_WHITE_CARDS);
        break;
      case 'geek':
        blackCards.push(...GEEK_BLACK_CARDS);
        whiteCards.push(...GEEK_WHITE_CARDS);
        break;
      case 'food':
        blackCards.push(...FOOD_BLACK_CARDS);
        whiteCards.push(...FOOD_WHITE_CARDS);
        break;
      case 'sports':
        blackCards.push(...SPORTS_BLACK_CARDS);
        whiteCards.push(...SPORTS_WHITE_CARDS);
        break;
      case 'fantasy':
        blackCards.push(...FANTASY_BLACK_CARDS);
        whiteCards.push(...FANTASY_WHITE_CARDS);
        break;
      case 'music':
        blackCards.push(...MUSIC_BLACK_CARDS);
        whiteCards.push(...MUSIC_WHITE_CARDS);
        break;
      case 'internet':
        blackCards.push(...INTERNET_BLACK_CARDS);
        whiteCards.push(...INTERNET_WHITE_CARDS);
        break;
    }
  }
  return { blackCards, whiteCards };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

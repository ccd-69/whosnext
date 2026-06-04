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
  { id: 'ef-draw-1', text: 'Auto-draw 3 cards when you have 1 card left', type: 'white', effect: { type: 'auto_draw' } },
  { id: 'ef-draw-2', text: 'Auto-draw 3 cards when you have 1 card left', type: 'white', effect: { type: 'auto_draw' } },
  { id: 'ef-abduct-1', text: 'You are abducted for 2 rounds, then get extra cards', type: 'white', effect: { type: 'abduction' } },
  { id: 'ef-abduct-2', text: 'You are abducted for 2 rounds, then get extra cards', type: 'white', effect: { type: 'abduction' } },
  // Ultra rare (1 each) — exodia
  { id: 'ef-exodia', text: 'EXODIA — You immediately win the game', type: 'white', effect: { type: 'exodia' } },
];

export function getCardsForPacks(packs: CardPack[], includeEffects: boolean) {
  const { blackCards, whiteCards } = getCardsForPacksInternal(packs);
  if (includeEffects) {
    return { blackCards, whiteCards: [...whiteCards, ...EFFECT_CARDS] };
  }
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

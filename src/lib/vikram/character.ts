export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type Ability = {
  id: AbilityId;
  label: string;
  score: number;
  mod: number;
  save: number;
  saveProficient: boolean;
};

export type Skill = {
  name: string;
  ability: AbilityId;
  bonus: number;
  proficient: boolean;
  expertise: boolean;
};

export type Attack = {
  name: string;
  bonus: string;
  damage: string;
  notes: string;
};

export type Feature = {
  name: string;
  source: string;
  text: string;
};

export type Person = {
  name: string;
  relation: string;
  text: string;
};

export type GearItem = {
  name: string;
  qty: number;
};

export type VikramCharacter = {
  name: string;
  kicker: string;
  classLevel: string;
  species: string;
  background: string;
  alignment: string;
  age: number;
  size: string;
  height: string;
  weight: string;
  appearance: string;
  home: string;
  occupation: string;
  proficiencyBonus: number;
  ac: number;
  initiative: number;
  speed: string;
  maxHp: number;
  hitDice: string;
  hitDiceTotal: number;
  passivePerception: number;
  passiveInsight: number;
  passiveInvestigation: number;
  abilities: Ability[];
  skills: Skill[];
  attacks: Attack[];
  features: Feature[];
  languages: string[];
  armorTraining: string[];
  weaponTraining: string[];
  tools: string[];
  money: { gp: number; sp: number; cp: number };
  gear: GearItem[];
  personality: {
    trait: string;
    ideal: string;
    bond: string;
    flaw: string;
  };
  people: Person[];
  notes: string[];
};

export const vikram: VikramCharacter = {
  name: "Vikram Kumar",
  kicker: "The Fall of Asperabad",
  classLevel: "Rogue 1",
  species: "Human",
  background: "Criminal",
  alignment: "Chaotic Good",
  age: 21,
  size: "Medium",
  height: "5′11″",
  weight: "150 lb",
  appearance: "Olive skin, brown eyes, black hair. A card is usually in his fingers.",
  home: "Common Quarter, Asparabad",
  occupation: "Janitor at the Artificer College in the Noble Quarter",
  proficiencyBonus: 2,
  ac: 14,
  initiative: 6,
  speed: "30 ft",
  maxHp: 13,
  hitDice: "1d8",
  hitDiceTotal: 1,
  passivePerception: 12,
  passiveInsight: 10,
  passiveInvestigation: 13,
  abilities: [
    { id: "str", label: "STR", score: 11, mod: 0, save: 0, saveProficient: false },
    { id: "dex", label: "DEX", score: 18, mod: 4, save: 6, saveProficient: true },
    { id: "con", label: "CON", score: 13, mod: 1, save: 1, saveProficient: false },
    { id: "int", label: "INT", score: 16, mod: 3, save: 5, saveProficient: true },
    { id: "wis", label: "WIS", score: 10, mod: 0, save: 0, saveProficient: false },
    { id: "cha", label: "CHA", score: 14, mod: 2, save: 2, saveProficient: false },
  ],
  skills: [
    { name: "Acrobatics", ability: "dex", bonus: 4, proficient: false, expertise: false },
    { name: "Animal Handling", ability: "wis", bonus: 0, proficient: false, expertise: false },
    { name: "Arcana", ability: "int", bonus: 3, proficient: false, expertise: false },
    { name: "Athletics", ability: "str", bonus: 2, proficient: true, expertise: false },
    { name: "Deception", ability: "cha", bonus: 2, proficient: false, expertise: false },
    { name: "History", ability: "int", bonus: 5, proficient: true, expertise: false },
    { name: "Insight", ability: "wis", bonus: 0, proficient: false, expertise: false },
    { name: "Intimidation", ability: "cha", bonus: 2, proficient: false, expertise: false },
    { name: "Investigation", ability: "int", bonus: 3, proficient: false, expertise: false },
    { name: "Medicine", ability: "wis", bonus: 0, proficient: false, expertise: false },
    { name: "Nature", ability: "int", bonus: 3, proficient: false, expertise: false },
    { name: "Perception", ability: "wis", bonus: 2, proficient: true, expertise: false },
    { name: "Performance", ability: "cha", bonus: 2, proficient: false, expertise: false },
    { name: "Persuasion", ability: "cha", bonus: 6, proficient: true, expertise: true },
    { name: "Religion", ability: "int", bonus: 3, proficient: false, expertise: false },
    { name: "Sleight of Hand", ability: "dex", bonus: 6, proficient: true, expertise: false },
    { name: "Stealth", ability: "dex", bonus: 8, proficient: true, expertise: true },
    { name: "Survival", ability: "wis", bonus: 2, proficient: true, expertise: false },
  ],
  attacks: [
    {
      name: "Dagger",
      bonus: "+6",
      damage: "1d4+4 piercing",
      notes: "Finesse, light, thrown 20/60. Nick: extra Light attack is part of the Attack action.",
    },
    {
      name: "Dagger (off-hand)",
      bonus: "+6",
      damage: "1d4+4 piercing",
      notes: "Second dagger. Nick spends no bonus action.",
    },
    {
      name: "Unarmed Strike",
      bonus: "+2",
      damage: "1 bludgeoning",
      notes: "Strength. Last resort.",
    },
  ],
  features: [
    {
      name: "Sneak Attack",
      source: "Rogue",
      text: "Once per turn, +1d6 on a Finesse or Ranged hit if you have advantage, or if an ally is within 5 ft of the target and you don't have disadvantage.",
    },
    {
      name: "Cunning tools",
      source: "Rogue",
      text: "Hide, Disengage, and the rest of the standard actions are on the table. Two daggers + Nick means both swings are in the Attack action.",
    },
    {
      name: "Expertise",
      source: "Rogue",
      text: "Double proficiency on Stealth (+8) and Persuasion (+6).",
    },
    {
      name: "Thieves' Cant",
      source: "Rogue",
      text: "You know the thieves' dialect and signs. Also Common Sign Language from home.",
    },
    {
      name: "Weapon Mastery",
      source: "Rogue",
      text: "Two weapon masteries. Dagger is Nick. You still have a second mastery for another proficient weapon if you pick one up.",
    },
    {
      name: "Alert",
      source: "Origin feat",
      text: "Add proficiency to Initiative (+6 total). After you roll Initiative, you may swap with a willing ally who isn't incapacitated.",
    },
    {
      name: "Savage Attacker",
      source: "Origin feat",
      text: "Once per turn, when you hit with a weapon, reroll the damage dice and use either result.",
    },
    {
      name: "Resourceful",
      source: "Human",
      text: "Gain Heroic Inspiration when you finish a Long Rest.",
    },
  ],
  languages: ["Common", "Common Sign Language", "Dwarvish", "Orc", "Thieves' Cant"],
  armorTraining: ["Light armor"],
  weaponTraining: [
    "Simple weapons",
    "Hand crossbow",
    "Rapier",
    "Scimitar",
    "Shortsword",
    "Whip",
  ],
  tools: ["Disguise Kit", "Thieves' Tools"],
  money: { gp: 116, sp: 0, cp: 0 },
  gear: [
    { name: "Dagger", qty: 2 },
    { name: "Pouch", qty: 2 },
    { name: "Thieves' Tools", qty: 1 },
    { name: "Crowbar", qty: 1 },
    { name: "Traveler's Clothes", qty: 1 },
  ],
  personality: {
    trait: "I always keep a card in my fingers. Shuffle when nervous, thinking, lying, or bored — sometimes without noticing.",
    ideal: "Nobody gets to decide what I am. Bastard, commoner, Knox — he wants to choose for himself.",
    bond: "Anita. Earn enough that she never has to work the brothel again.",
    flaw: "He thinks he can always talk his way out. Usually he's right, which is why it's dangerous.",
  },
  people: [
    {
      name: "Anita Kumar",
      relation: "Mother",
      text: "Deaf. Raised him in the Common Quarter. They sign first. She is the person he loves most, and one of the only people he doesn't bullshit.",
    },
    {
      name: "Remington Knox",
      relation: "Father — never met, missing",
      text: "Younger son of a noble house. Vikram knows the name and that he was a noble. That's it. Remington vanished young. Vikram is not looking for him.",
    },
    {
      name: "Elio Knox",
      relation: "Grandfather",
      text: "Knows Vikram exists. Treats him as an embarrassing loose end, not a grandson.",
    },
    {
      name: "Alex Knox",
      relation: "Aunt",
      text: "The only Knox who has been kind. Checks in. May have helped Anita. Vikram can't tell if she cares or if she feels guilty about Remington.",
    },
    {
      name: "The dead gambler",
      relation: "The deck",
      text: "When Vikram was about 12 he found a dying gambler in an alley. The man had a battered deck. Vikram took it.",
    },
  ],
  notes: [
    "The job is mundane: he is a janitor, not an artificer. Nobody remembers his face. He remembers theirs.",
    "He knows which labs smell like sulfur, which offices stay unlocked, and where faculty leftovers go.",
    "He is not on a quest for his father. The mystery should come to him: “Wait. You're Remington Knox's son?”",
  ],
};

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

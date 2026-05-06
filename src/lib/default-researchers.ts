import { Subject } from "./types";
import { randomUUID } from "crypto";

function r(text: string): Subject {
  return { id: randomUUID(), text, category: "Sleep Researchers" };
}

// Curated researcher / podcaster angles. Each entry is a carousel-ready phrasing —
// person + a specific point they're known for — so it can be picked from the library
// and dropped straight into the topic step. Editable inline like any other subject.
export const DEFAULT_RESEARCHERS: Subject[] = [
  // Matthew Walker (Why We Sleep, Sleep Diplomat podcast)
  r("Matthew Walker on why one bad night spikes amyloid in healthy brains"),
  r("Matthew Walker on sleep as the strongest predictor of male testosterone"),
  r("Matthew Walker on why caffeine has a 5-6 hour quarter-life"),
  r("Matthew Walker on the WHO classifying shift work as a probable carcinogen"),

  // Andrew Huberman (Huberman Lab podcast)
  r("Andrew Huberman on morning sunlight as the master cortisol anchor"),
  r("Andrew Huberman on Yoga Nidra as a sleep-recovery tool"),
  r("Andrew Huberman on the 1-3 degree temperature drop required to fall asleep"),
  r("Andrew Huberman on the AM-cortisol-anchor and evening melatonin window"),

  // Russell Foster (Oxford circadian neuroscientist, Lifetime author)
  r("Russell Foster on why early-bird vs night-owl is biology, not willpower"),
  r("Russell Foster on the irreplaceable role of light for circadian alignment"),
  r("Russell Foster on what shift work does to the immune system"),

  // Til Roenneberg (chronotype researcher, Internal Time author)
  r("Til Roenneberg on social jetlag as a hidden weekend cost"),
  r("Til Roenneberg on why your true chronotype is genetically set"),
  r("Til Roenneberg on why teens shouldn't be in school before 9am"),

  // Roxanne Prichard (sleep psychology researcher)
  r("Roxanne Prichard on the sleep cost of college freshman year"),
  r("Roxanne Prichard on screen-free hours and their measurable effect"),
  r("Roxanne Prichard on co-sleeping with phones and the data on its harm"),

  // Peter Attia (The Drive podcast, longevity)
  r("Peter Attia on sleep as the foundation for the four pillars of longevity"),
  r("Peter Attia on why cardio matters more if you sleep less than 7 hours"),
  r("Peter Attia on alcohol's measurable effect on REM percentage"),

  // Kirk Parsley (former Navy SEAL, sleep doctor)
  r("Kirk Parsley on Navy SEAL sleep deprivation and decision quality"),
  r("Kirk Parsley on why elite performers all sleep 8+ hours"),
  r("Kirk Parsley on early warning signs you're undersleeping by 30 minutes"),

  // Michael Breus (The Sleep Doctor)
  r("Michael Breus on chronotype-aligned bedtimes — lion, bear, wolf, dolphin"),
  r("Michael Breus on the bedroom as a cave — cool, dark, quiet"),
  r("Michael Breus on why you should never eat within 3 hours of bed"),

  // Dan Pardi (humanOS, sleep scientist)
  r("Dan Pardi on the four pillars of recovery: sleep, light, movement, food"),
  r("Dan Pardi on the metabolic cost of social jetlag"),
  r("Dan Pardi on why sleep regularity beats sleep duration as a predictor"),

  // Rebecca Robbins (Harvard sleep researcher)
  r("Rebecca Robbins on the gap between perceived and actual sleep quality"),
  r("Rebecca Robbins on caffeine's measurable effect on slow-wave sleep"),
  r("Rebecca Robbins on the productivity cost of trading sleep for early starts"),

  // Wendy Troxel (RAND, social/relational sleep)
  r("Wendy Troxel on the cardiovascular cost of teen sleep deprivation"),
  r("Wendy Troxel on why couples who sleep apart often sleep better together"),
  r("Wendy Troxel on bedroom screens as a marriage stressor"),

  // Daniel Gartenberg (deep-sleep researcher, Sleep Sciences podcast)
  r("Daniel Gartenberg on slow-wave sleep coaching via deep-sleep stimulation"),
  r("Daniel Gartenberg on why deep sleep matters more than total time in bed"),
  r("Daniel Gartenberg on the role of audio cues in sleep architecture"),

  // Kelly Glazer Baron (CBT-I researcher)
  r("Kelly Glazer Baron on insomnia treatment without medication (CBT-I)"),
  r("Kelly Glazer Baron on sleep tracker anxiety — the rise of orthosomnia"),
  r("Kelly Glazer Baron on the right way to read your sleep score"),

  // Sara Mednick (UC Irvine, naps researcher)
  r("Sara Mednick on naps that actually improve next-day memory"),
  r("Sara Mednick on why a 90-minute nap rivals a full night for some tasks"),
  r("Sara Mednick on the ideal nap length for cognitive performance"),

  // Charles Czeisler (Harvard, sleep medicine pioneer)
  r("Charles Czeisler on the public-health cost of chronic sleep restriction"),
  r("Charles Czeisler on light exposure as the most powerful zeitgeber"),
  r("Charles Czeisler on physician shift caps and patient safety"),

  // Mary Carskadon (Brown, adolescent sleep)
  r("Mary Carskadon on why teen biology pushes bedtime later, not laziness"),
  r("Mary Carskadon on what happens to attention when school starts at 7am"),
  r("Mary Carskadon on why 8am college classes work against student biology"),

  // Mollie Eastman (Sleep is a Skill podcast)
  r("Mollie Eastman on the morning routines top sleepers share"),
  r("Mollie Eastman on why 'earn your sleep' is the wrong frame"),
  r("Mollie Eastman on what biohackers get wrong about sleep optimization"),

  // Daniel Erichsen (Sleep Coach School)
  r("Daniel Erichsen on why most insomnia self-corrects without intervention"),
  r("Daniel Erichsen on the sleep effort trap — trying harder makes it worse"),
  r("Daniel Erichsen on why CBT-I works where sleep meds fail"),
];

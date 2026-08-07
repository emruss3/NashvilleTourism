import type { ImageKey } from '@/lib/media';
import type { NeighborhoodSlug } from '@/lib/types';

export interface NeighborhoodPick {
  title: string;
  bestFor: string;
  body: string;
  /** Optional secondary note under the body. */
  note?: string;
  href?: string;
  externalHref?: string;
  imageKey?: ImageKey;
  /** Listing image from ContentBase when available. */
  listingSlug?: string;
  listingKind?: 'attraction' | 'venue' | 'restaurant' | 'hotel';
  /** Prefer text/internal link with no photo (dedupe / missing authorized master). */
  photoPolicy?: 'image' | 'text-only';
  /** Small editorial badge, e.g. NASHROAM FAVORITE */
  badge?: string;
  /** Dining grouping label, e.g. Breakfast / brunch */
  category?: string;
}

export interface NeighborhoodZone {
  name: string;
  description: string;
  bestFor: string;
  imageKey?: ImageKey;
}

export interface NeighborhoodEditorialGuide {
  slug: NeighborhoodSlug;
  pageTitle: string;
  h1: string;
  intro: string;
  heroImageKey: ImageKey;
  verdict: {
    summary: string;
    bestFor: string;
    skipIf: string;
    timeNeeded: string;
    walkability: string;
  };
  areas?: NeighborhoodZone[];
  attractionPicks?: NeighborhoodPick[];
  nightlifePicks?: NeighborhoodPick[];
  diningPicks: NeighborhoodPick[];
  diningIntro?: string;
  hotelPicks?: NeighborhoodPick[];
  concertPicks?: NeighborhoodPick[];
  itinerary?: {
    time: string;
    title: string;
    description: string;
    href?: string;
  }[];
  itineraryNote?: string;
  practicalTips?: {
    title: string;
    body: string;
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  /** Ticketmaster venue name matchers for live Downtown events module. */
  downtownVenueNames?: string[];
  navStyle?: 'downtown' | 'dining-forward';
}

export const neighborhoodGuides: NeighborhoodEditorialGuide[] = [
  {
    slug: 'downtown-broadway',
    pageTitle: 'Downtown Nashville & Broadway Guide: Bars, Hotels & Things to Do',
    h1: 'Downtown Nashville & Lower Broadway',
    intro:
      "The easiest part of Nashville to experience without a car: honky-tonks on Lower Broadway, the Ryman and major music museums within a few blocks, plus the city's biggest arenas and hotels. It's also the loudest, busiest part of town after dark.",
    heroImageKey: 'neighborhood/downtown-broadway',
    verdict: {
      summary:
        "Stay Downtown on a first trip if you have one to three nights, want to walk to live music and major attractions, and don't want to think about transportation. Stay somewhere else if quiet nights, neighborhood restaurants, and a local residential feel matter more.",
      bestFor: 'First trips · Groups · Live music · No-car weekends',
      skipIf: "You're a light sleeper · You dislike crowds · Dinner is the priority",
      timeNeeded: 'One full day + one night covers the essentials',
      walkability: "Excellent. Once you're here, leave the car parked.",
    },
    areas: [
      {
        name: 'Lower Broadway',
        description:
          'The entertainment core from the river toward Fifth Avenue: historic brick buildings, honky-tonks, rooftops and the heaviest nighttime crowds. Come here for live music, not a quiet dinner.',
        bestFor: 'Honky-tonks · First-night energy · Groups',
        // Photo used once as the page hero (Roberts neon / Lower Broadway night).
      },
      {
        name: 'Historic Core / North of Broadway',
        description:
          'The Ryman, Printer\'s Alley, the Hermitage and older downtown blocks sit just north of the strip. You are still minutes from Broadway, but individual blocks feel noticeably calmer.',
        bestFor: 'Ryman shows · History · Sleeping slightly farther from the noise',
        // Printer's Alley arch master blocked behind CVC media-library gate — text only until cleared.
      },
      {
        name: 'SoBro',
        description:
          'South of Broadway is where the Country Music Hall of Fame, Music City Center, Ascend, Four Seasons, 1 Hotel and The Joseph sit. It is still completely walkable to the strip, but the streets are more hotel, museum and convention oriented.',
        bestFor: 'Museums · Luxury hotels · Families · Conventions',
        imageKey: 'downtown/sobro',
      },
      {
        name: 'Upper Broadway / Nashville Yards',
        description:
          'The western end of Broadway now connects into Nashville Yards, Grand Hyatt and The Pinnacle. It is the newer side of Downtown and makes the most sense when your plans include a Pinnacle show or Midtown as well as Broadway.',
        bestFor: 'The Pinnacle · Newer hotels · Access to Midtown',
        imageKey: 'downtown/nashville-yards',
      },
    ],
    attractionPicks: [
      {
        title: 'Country Music Hall of Fame and Museum',
        bestFor: 'Music history',
        body: 'Give it about two hours. Go early if you want the galleries before their busiest window, then walk north toward Broadway instead of moving the car.',
        href: '/things-to-do/country-music-hall-of-fame/',
        externalHref: 'https://www.countrymusichalloffame.org/',
        imageKey: 'attractions/country-music-hall-of-fame-night',
      },
      {
        title: 'Ryman Auditorium',
        bestFor: 'Live music + history',
        body: "Take the daytime tour if you don't have a show ticket. If an artist you care about is playing here, make the show the centerpiece of the night and build Broadway around it.",
        href: '/music/ryman-auditorium/',
        externalHref: 'https://www.ryman.com/tours',
        listingSlug: 'ryman-auditorium',
        listingKind: 'venue',
      },
      {
        title: 'National Museum of African American Music',
        bestFor: 'Broader music story',
        body: 'One of the strongest arguments for leaving the honky-tonks for a couple of hours. The galleries connect gospel, blues, jazz, R&B and hip-hop to the larger story of American music.',
        href: '/things-to-do/national-museum-of-african-american-music/',
        externalHref: 'https://nmaam.org/',
        listingSlug: 'national-museum-of-african-american-music',
        listingKind: 'attraction',
      },
      {
        title: 'John Seigenthaler Pedestrian Bridge',
        bestFor: 'Free skyline view',
        body: 'Do this near sunset or before dinner. It is the easiest skyline-and-river view Downtown and costs nothing.',
        imageKey: 'editorial/pedestrian-bridge',
      },
    ],
    nightlifePicks: [
      {
        title: "Robert's Western World",
        bestFor: 'Old-school Broadway',
        body: "Start here if the music is the reason you came. Robert's remains the clearest contrast to the giant multi-level venues farther down the strip: a narrow room, traditional country and very little production around it.",
        externalHref: 'https://robertswesternworld.com/',
        imageKey: 'venues/roberts-western-world',
      },
      {
        title: "Layla's Honky Tonk",
        bestFor: 'Roots music in a small room',
        body: "Another small-room stop next to Robert's, with country, bluegrass, rockabilly and Americana. It is useful for daytime visitors too: guests under 21 are currently allowed before 6 PM when accompanied by an adult; after 6 PM it is 21+.",
        externalHref: 'https://laylasnashville.com/',
        photoPolicy: 'text-only',
      },
      {
        title: 'The Twelve Thirty Club',
        bestFor: 'Dinner + drinks without leaving Broadway',
        body: 'The polished option. Use the Supper Club when the group wants a real reservation and dinner, then move upstairs rather than restarting the night somewhere else.',
        externalHref: 'https://www.thetwelvethirtyclub.com/',
        imageKey: 'venues/twelve-thirty-club',
      },
      {
        title: "JBJ's Nashville",
        bestFor: 'Big group / rooftop / full spectacle',
        body: 'Five floors, three stages, two rooftops and enough going on that a group can stay in one building for several hours. This is the modern mega-Broadway experience rather than an old honky-tonk.',
        externalHref: 'https://www.jasonaldean.com/jbjs/',
        imageKey: 'venues/jbjs-rooftop',
      },
      {
        title: "Chief's on Broadway",
        bestFor: 'Original music + a modern Broadway flagship',
        body: "Chief's mixes free public spaces with a dedicated ticketed performance room, so check the schedule before treating it like a normal walk-in honky-tonk.",
        externalHref: 'https://www.chiefsonbroadway.com/',
        imageKey: 'venues/chiefs-on-broadway',
      },
      {
        title: 'Category 10',
        bestFor: 'Line dancing + a giant room',
        body: 'The scale is the point: multiple spaces, a large dance floor, stages and rooftop. Current policy is all ages before 8 PM and 21+ afterward.',
        externalHref: 'https://www.category10.com/',
        imageKey: 'venues/category-10',
      },
    ],
    diningPicks: [
      {
        title: 'Assembly Food Hall',
        bestFor: "Groups that can't agree",
        body: 'Across from the Ryman and Bridgestone, with enough choices that a group can split up, order separately and meet back at one table. Use it for lunch, not a destination dinner.',
        externalHref: 'https://assemblyfoodhall.com/',
        imageKey: 'restaurants/assembly-food-hall',
      },
      {
        title: 'Bacco',
        bestFor: 'Refined dinner close to Broadway',
        body: 'The Tuscan-inspired steakhouse at Four Seasons opened in April 2026. It gives SoBro a legitimate upscale dinner option one block from the Broadway noise.',
        externalHref: 'https://www.fourseasons.com/nashville/dining/restaurants/bacco/',
        imageKey: 'restaurants/bacco',
      },
      {
        title: 'etch',
        bestFor: 'Chef-driven dinner',
        body: 'A long-running downtown restaurant by chef Deb Paquette. Pick this when dinner matters more than being physically on Broadway.',
        externalHref: 'https://www.etchrestaurant.com/',
        imageKey: 'restaurants/etch',
      },
      {
        title: 'The Twelve Thirty Club',
        bestFor: 'One-stop dinner and nightlife',
        body: 'Use the Supper Club for a reserved dinner on Broadway, then stay upstairs for the nightlife without restarting the night elsewhere. See the Broadway bars pick for photography.',
        href: '#broadway-bars',
        externalHref: 'https://www.thetwelvethirtyclub.com/',
        photoPolicy: 'text-only',
      },
    ],
    hotelPicks: [
      {
        title: 'Four Seasons Hotel Nashville',
        bestFor: 'River views + resort-style luxury',
        body: 'In SoBro, one block from Broadway, with the rooftop pool facing the Cumberland. Best fit when the hotel itself is part of the weekend.',
        externalHref: 'https://www.fourseasons.com/nashville/',
        imageKey: 'hotels/four-seasons-nashville',
      },
      {
        title: '1 Hotel Nashville',
        bestFor: 'Design + wellness',
        body: 'Across from Music City Center and walkable to the Hall of Fame, arena and Broadway. The nature-forward design makes it feel less like a conventional convention hotel.',
        externalHref: 'https://www.1hotels.com/nashville',
        imageKey: 'hotels/1-hotel-nashville',
      },
      {
        title: 'The Joseph',
        bestFor: 'Art + food + quieter luxury',
        body: 'A polished SoBro base with strong dining, rooftop pool and spa. Close enough to walk everywhere without putting the room directly over Lower Broadway.',
        externalHref: 'https://www.thejosephnashville.com/',
        imageKey: 'hotels/the-joseph',
      },
      {
        title: 'The Hermitage Hotel',
        bestFor: 'Historic Nashville + quieter nights',
        body: 'North of Broadway near the Capitol. Pick it when you want to walk to the Ryman and Broadway but retreat to something that feels completely different afterward.',
        externalHref: 'https://www.thehermitagehotel.com/',
        imageKey: 'hotels/hermitage-hotel',
      },
      {
        title: 'Grand Hyatt Nashville',
        bestFor: 'The Pinnacle + Upper Broadway',
        body: 'The best-positioned option in this group if Nashville Yards or a show at The Pinnacle is central to the trip.',
        externalHref: 'https://www.hyatt.com/en-US/hotel/tennessee/grand-hyatt-nashville/bnagh',
        imageKey: 'hotels/grand-hyatt-nashville',
      },
    ],
    concertPicks: [
      {
        title: 'Bridgestone Arena',
        bestFor: 'Arena-scale shows',
        body: 'The downtown arena at the head of Lower Broadway. Plan dinner and rides around doors and exit surge on big nights.',
        href: '/music/bridgestone-arena/',
        listingSlug: 'bridgestone-arena',
        listingKind: 'venue',
      },
      {
        title: 'Ascend Amphitheater',
        bestFor: 'Outdoor shows with skyline',
        body: 'Riverfront amphitheater with reserved seats and a lawn. The skyline behind the stage is part of the reason to choose it.',
        href: '/music/ascend-amphitheater/',
        listingSlug: 'ascend-amphitheater',
        listingKind: 'venue',
      },
      {
        title: 'The Pinnacle',
        bestFor: 'Flexible mid-size room',
        body: 'Floor, risers and balcony configurations between historic theaters and Bridgestone. Best paired with Upper Broadway / Nashville Yards lodging.',
        href: '/music/the-pinnacle/',
        listingSlug: 'the-pinnacle',
        listingKind: 'venue',
      },
    ],
    itinerary: [
      {
        time: '9:00 AM',
        title: 'Country Music Hall of Fame',
        description: 'Go before the busiest museum window and spend roughly two hours.',
        href: '/things-to-do/country-music-hall-of-fame/',
      },
      {
        time: '11:15 AM',
        title: 'Lunch around Fifth + Broadway',
        description: 'Assembly works when speed and group flexibility matter.',
      },
      {
        time: '12:30 PM',
        title: 'NMAAM',
        description: 'Give yourself enough time for the interactive galleries rather than rushing through.',
        href: '/things-to-do/national-museum-of-african-american-music/',
      },
      {
        time: '2:30 PM',
        title: 'Ryman',
        description: 'Take a tour if the daytime schedule permits. On show days, tour hours may shorten.',
        href: '/music/ryman-auditorium/',
      },
      {
        time: '4:00 PM',
        title: 'Walk Broadway before the night crowd',
        description:
          'Start around Fifth and work east toward the river. This is the easiest time to actually look at the buildings and decide where you want to return.',
      },
      {
        time: '5:00 PM',
        title: 'Pedestrian Bridge',
        description: 'Walk out far enough for the skyline view, then head back to the hotel and reset.',
      },
      {
        time: '7:00 PM',
        title: 'Dinner',
        description: 'Twelve Thirty for dinner on Broadway; Bacco or etch if you want a break from it.',
      },
      {
        time: '9:00 PM',
        title: 'Broadway',
        description:
          "Start at Robert's or Layla's. Then finish at one modern multi-floor venue rather than bouncing through six copies of the same experience.",
      },
    ],
    itineraryNote:
      'If you have Ryman, Bridgestone, Ascend or Pinnacle tickets, make the show the fixed point and build everything else around it.',
    practicalTips: [
      {
        title: 'Park once',
        body: 'If you drive Downtown, use a garage and leave the car there. Moving it between Broadway, the museums and the arena rarely saves time.',
      },
      {
        title: 'Broadway is undergoing a pedestrian pilot',
        body: "As of 2026, Metro's Lower Broadway pilot between 1st and 5th Avenues uses the former parking lane to create additional protected pedestrian space while maintaining two traffic lanes in each direction. Loading and pickup patterns can change during the pilot, so confirm current curb rules when you arrive.",
      },
      {
        title: 'Rideshare from a side street',
        body: 'After a major show or late on weekends, walking a few blocks away from Lower Broadway before requesting a ride is usually simpler than trying to be picked up in the middle of the strip.',
      },
      {
        title: 'Hotel room location matters',
        body: 'If sleep matters, ask for a higher floor facing away from Broadway. "Downtown" and "on Broadway" are not the same thing at 1 AM.',
      },
      {
        title: 'Age policies vary',
        body: 'Broadway is not universally 21+ or universally family-friendly. Check the specific venue for the hours you plan to visit; policies can change by time of day.',
      },
      {
        title: 'Event nights change the neighborhood',
        body: 'A Bridgestone concert or game, a Ryman show and a busy Broadway weekend can overlap. Make dinner reservations and leave extra walking time.',
      },
    ],
    faqs: [
      {
        question: 'Is Downtown Nashville the same as Broadway?',
        answer:
          'No. Lower Broadway is the entertainment strip inside Downtown. Downtown also includes quieter blocks north and south of Broadway, major museums, hotels, arenas and newer areas toward Nashville Yards.',
      },
      {
        question: 'Do I need a car if I stay Downtown?',
        answer:
          'Usually not for a short visitor trip. Broadway, the Ryman, major museums, Bridgestone and the riverfront are concentrated within a walkable core.',
      },
      {
        question: 'Is Lower Broadway worth visiting during the day?',
        answer:
          'Yes. Daytime is easier for first-time visitors who actually want to see the historic buildings, hear live music in smaller crowds and visit with travelers who may be under 21. Individual venue age policies still apply.',
      },
      {
        question: 'Should I stay directly on Broadway?',
        answer:
          'Only if nightlife outside your door matters more than quiet. SoBro, the Historic Core and Upper Broadway keep most of the walkability with more separation from the busiest blocks.',
      },
      {
        question: 'Are Broadway honky-tonks free?',
        answer:
          'Many regular live-music rooms operate without a standard cover, but ticketed shows, private events and specific venues can be different. Check the venue before you go.',
      },
      {
        question: 'How much time should I spend Downtown Nashville?',
        answer:
          'For a first trip, one full day plus one night is enough to cover the major museums, Broadway and a show. You do not need to spend the entire Nashville trip here.',
      },
    ],
    downtownVenueNames: [
      'Ryman Auditorium',
      'Bridgestone Arena',
      'Ascend Amphitheater',
      'The Pinnacle',
      'Pinnacle',
    ],
    navStyle: 'downtown',
  },
  {
    slug: 'the-gulch',
    pageTitle: 'The Gulch Nashville Guide: BBQ, Steak & Where to Eat',
    h1: 'The Gulch',
    intro:
      'A compact, recently built district between downtown and Midtown — hotels, restaurants, and the Station Inn within a walkable grid. Dinner is the practical reason most visitors plan a Gulch stop.',
    heroImageKey: 'neighborhood/the-gulch',
    navStyle: 'dining-forward',
    verdict: {
      summary:
        'Stay in the Gulch when you want downtown access without sleeping on Broadway. Eat here when you want a polished central dinner — or, for barbecue, when you want Peg Leg Porker on Gleaves Street.',
      bestFor: 'Groups · Hotel stays · Walkability · Dinner before bluegrass',
      skipIf: "You're hunting for bargain eats · You want a residential neighborhood feel",
      timeNeeded: 'Half a day covers the grid; dinner can be the whole plan',
      walkability: 'Excellent within the district; about 15 minutes on foot to Broadway.',
    },
    diningIntro: 'Start with barbecue if that is the goal, then choose steak or casual Tex-Mex from there.',
    diningPicks: [
      {
        title: 'Peg Leg Porker',
        bestFor: 'Nashville BBQ',
        badge: 'NASHROAM FAVORITE',
        category: 'BBQ',
        body: 'If barbecue is the goal, this is the stop. Peg Leg Porker is an independently owned Tennessee barbecue joint tucked on Gleaves Street at the edge of the Gulch. Come for pork, ribs and the casual patio rather than another polished Gulch dining room.',
        externalHref: 'https://peglegporker.com/',
        imageKey: 'restaurants/peg-leg-porker',
      },
      {
        title: 'Kayne Prime',
        bestFor: 'Steak / upscale dinner',
        category: 'Steak / upscale dinner',
        body: 'The polished steakhouse option when the group wants a reserved Gulch dinner with downtown convenience.',
        externalHref: 'https://www.kayneprime.com/',
        photoPolicy: 'text-only',
      },
      {
        title: 'Superica',
        bestFor: 'Casual Tex-Mex',
        category: 'Casual Tex-Mex',
        body: 'Easy Tex-Mex when you want something lively and shareable without a formal reservation strategy.',
        externalHref: 'https://www.superica.com/nashville/',
        photoPolicy: 'text-only',
      },
    ],
    itinerary: [
      { time: 'Morning', title: 'Coffee and a loop through the district', description: 'Compact enough to cover in 30 minutes.' },
      { time: 'Lunch', title: 'Peg Leg Porker', description: 'Arrive before the peak lunch rush if you want patio seating without a long wait.' },
      { time: 'Afternoon', title: 'Walk toward downtown via Demonbreun', description: 'About 15 minutes on foot to Broadway.' },
      { time: 'Evening', title: 'Bluegrass at the Station Inn', description: 'Small room; arrive early for a seat.' },
    ],
    practicalTips: [
      {
        title: 'Park once',
        body: 'Garage parking under most buildings is the practical move. Validation varies by restaurant — ask when you book.',
      },
      {
        title: 'Peg Leg is on the edge',
        body: 'Gleaves Street sits at the Gulch edge. It is still a short walk from the core hotel blocks, but it is not mid-Demonbreun.',
      },
    ],
    faqs: [
      {
        question: 'Where should I eat barbecue in the Gulch?',
        answer:
          'Peg Leg Porker is the primary barbecue recommendation — independently owned Tennessee barbecue on Gleaves Street, not another polished Gulch dining room.',
      },
      {
        question: 'Is the Gulch walkable to Broadway?',
        answer: 'Yes. Plan on about 15 minutes on foot, or a short rideshare if weather or group size makes walking a hassle.',
      },
    ],
  },
  {
    slug: '12-south',
    pageTitle: '12 South Nashville Guide: Brunch, Dining & Playdate',
    h1: '12 South',
    intro:
      'A walkable half-mile of restaurants, coffee, and boutiques through a pocket of bungalows south of downtown. Dining works best when you pick by use case — breakfast, destination dinner, patio lunch, BBQ, or casual drinks — instead of treating every restaurant as interchangeable brunch.',
    heroImageKey: 'neighborhood/12-south',
    navStyle: 'dining-forward',
    verdict: {
      summary:
        'Come for a half-day of shopping and dining. Weekends get busy after mid-morning, so plan breakfast early and treat Playdate as the easy group stop next door to The Butter Milk Ranch.',
      bestFor: 'Couples · Coffee and shopping · Brunch · Walkable afternoons',
      skipIf: "You need nightlife outside the door · You won't rideshare downtown",
      timeNeeded: 'A half day covers the strip well',
      walkability: 'Excellent on the commercial strip; residential beyond.',
    },
    diningIntro: 'Organize the strip by reason to go rather than by hype.',
    diningPicks: [
      {
        title: 'The Butter Milk Ranch',
        bestFor: 'Breakfast + brunch',
        category: 'Breakfast / brunch',
        body: 'One of the strongest breakfast stops on the strip. The Butter Milk Ranch combines a serious pastry counter with a full-service breakfast and lunch dining room. Go earlier than peak weekend brunch if you want the experience without making the wait the entire morning.',
        externalHref: 'https://buttermilkranch.com/',
        imageKey: 'restaurants/butter-milk-ranch',
      },
      {
        title: 'Locust',
        bestFor: 'Destination meal',
        category: 'Destination meal',
        body: 'The destination dinner when 12 South is the plan for the evening rather than a quick patio lunch.',
        photoPolicy: 'text-only',
      },
      {
        title: 'Urban Grub',
        bestFor: 'Long lunch / patio',
        category: 'Long lunch / patio',
        body: 'Use this when outdoor seating and a longer midday meal matter more than a pastry-counter breakfast.',
        photoPolicy: 'text-only',
      },
      {
        title: "Edley's",
        bestFor: 'Casual BBQ',
        category: 'Casual BBQ',
        body: 'Casual barbecue on the strip when you want something straightforward between shopping stops.',
        photoPolicy: 'text-only',
      },
      {
        title: 'Playdate',
        bestFor: 'Casual drinks + groups',
        category: 'Drinks / groups',
        body: 'Immediately next door to The Butter Milk Ranch, Playdate is the casual social stop: pizza, drinks, outdoor seating and a playful courtyard rather than another formal 12 South restaurant. It works especially well for groups that want somewhere easy to sit down between shopping stops.',
        note: 'Playdate also offers a high-tea experience for groups looking for something more structured.',
        externalHref: 'https://www.playdatenash.com/',
        imageKey: 'restaurants/playdate',
      },
    ],
    itinerary: [
      { time: 'Morning', title: 'The Butter Milk Ranch', description: 'Arrive before weekend peak if you want breakfast without making the wait the whole morning.' },
      { time: 'Late morning', title: 'Browse boutiques and the mural', description: 'Most retail sits in a four-block stretch.' },
      { time: 'Afternoon', title: 'Playdate or patio lunch', description: 'Easy group seating next door, or Urban Grub for a longer patio meal.' },
      { time: 'Evening', title: 'Rideshare downtown', description: 'About ten minutes to Broadway for the night.' },
    ],
    practicalTips: [
      {
        title: 'Weekend parking fills early',
        body: 'Street parking is the norm and fills by late morning on weekends. Side streets are residential — watch signs and time limits.',
      },
    ],
    faqs: [
      {
        question: 'Where should I eat breakfast in 12 South?',
        answer:
          'The Butter Milk Ranch is the primary breakfast and brunch pick — pastry counter plus full-service dining. Go earlier than peak weekend brunch.',
      },
      {
        question: 'What is Playdate good for?',
        answer:
          'Casual drinks and groups. It sits immediately next door to The Butter Milk Ranch and works well between shopping stops. It also offers a high-tea experience for groups that want something more structured.',
      },
    ],
  },
  {
    slug: 'germantown',
    pageTitle: 'Germantown Nashville Guide: Where to Eat',
    h1: 'Germantown',
    intro:
      'A compact historic district north of downtown: brick streets, a dense restaurant row, and an easy walk to the Farmers’ Market. Dinner is the neighborhood’s strength — four restaurants are enough if you pick by use case.',
    heroImageKey: 'neighborhood/germantown',
    navStyle: 'dining-forward',
    verdict: {
      summary:
        'Come for dinner. Reservations matter on weekends. Mornings work well for the Farmers’ Market; evenings are for chef-driven rooms, seafood, live-fire cooking, or a larger atmosphere dinner.',
      bestFor: 'Dinner · Couples · Quieter downtown-adjacent stays',
      skipIf: 'You want Broadway outside the lobby',
      timeNeeded: 'One dinner covers the neighborhood well; add the market for a half day',
      walkability: 'Excellent inside the district; about 20 minutes on foot to downtown.',
    },
    diningIntro: 'Four restaurants. Different jobs. No directory.',
    diningPicks: [
      {
        title: 'Rolf and Daughters',
        bestFor: 'Chef-driven / destination',
        category: 'Chef-driven / destination',
        body: 'The destination dinner when Germantown is the plan for the night.',
        photoPolicy: 'text-only',
      },
      {
        title: 'Henrietta Red',
        bestFor: 'Seafood / oysters',
        category: 'Seafood / oysters',
        body: 'Seafood and oysters when that is the reason you crossed into Germantown.',
        photoPolicy: 'text-only',
      },
      {
        title: 'Butchertown Hall',
        bestFor: 'Live-fire cooking + groups',
        category: 'Live-fire / Texas Hill Country / Tex-Mex',
        body: 'A Germantown staple built around an open-fire hearth, smoked meats, tacos and strong margaritas. The big communal room makes it particularly useful for groups, while the historic-industrial design fits the neighborhood better than a generic steakhouse would.',
        externalHref: 'https://butchertownhall.com/',
        imageKey: 'restaurants/butchertown-hall',
      },
      {
        title: '5th & Taylor',
        bestFor: 'Large dinner / atmosphere',
        category: 'Large dinner / atmosphere',
        body: 'The larger-room dinner when atmosphere and group size matter as much as the plate.',
        photoPolicy: 'text-only',
      },
    ],
    itinerary: [
      { time: 'Morning', title: 'Nashville Farmers’ Market', description: 'Food hall plus produce sheds; good casual lunch option too.' },
      { time: 'Afternoon', title: 'Walk the historic blocks', description: 'Late 1800s brick housing stock; compact and photogenic.' },
      { time: 'Evening', title: 'Dinner in Germantown', description: 'Reserve ahead — this is the neighborhood’s main draw.' },
    ],
    practicalTips: [
      {
        title: 'Reserve weekend dinner',
        body: 'Germantown’s best tables fill. Book before you treat the evening as walk-up.',
      },
    ],
    faqs: [
      {
        question: 'Is Butchertown Hall just a BBQ spot?',
        answer:
          'No. Think live-fire / Texas Hill Country / Tex-Mex: open-fire hearth, smoked meats, tacos, margaritas, and a big communal room that works well for groups.',
      },
    ],
  },
  {
    slug: 'wedgewood-houston',
    pageTitle: 'Wedgewood-Houston Nashville Guide: Aba, Bastion & Bars',
    h1: 'Wedgewood-Houston',
    intro:
      'A former industrial pocket south of downtown — galleries, studios, and restaurants in warehouse buildings. The current food story contrasts Aba’s polished new development with Bastion’s smaller adaptive-reuse character.',
    heroImageKey: 'neighborhood/wedgewood-houston',
    navStyle: 'dining-forward',
    verdict: {
      summary:
        'Come for galleries, a taproom, and dinner that is not downtown. Aba is the primary group-dinner and design recommendation; Bastion remains the intimate food-focused counterweight.',
      bestFor: 'Art · Group dinner · Avoiding crowds · Repeat visitors',
      skipIf: "You want a single walkable first-timer base with dense hotels",
      timeNeeded: 'An afternoon of galleries plus dinner works well',
      walkability: 'Fair — galleries cluster; still plan on a car or rideshare.',
    },
    diningIntro:
      'Aba’s polished two-level room and Bastion’s smaller adaptive-reuse character are the current tension that defines eating in WeHo.',
    diningPicks: [
      {
        title: 'Aba',
        bestFor: 'Group dinner + design',
        category: 'Dinner + design',
        body: "One of the biggest new additions to Wedgewood-Houston. Aba's Nashville location pairs Mediterranean food with a large two-level indoor-outdoor space that feels purpose-built for group dinners. Come as much for the room and patio as for the menu.",
        externalHref: 'https://www.abarestaurants.com/nashville',
        imageKey: 'restaurants/aba-nashville',
      },
      {
        title: 'Bastion',
        bestFor: 'Food-focused / intimate',
        category: 'Food-focused / intimate',
        body: 'The smaller adaptive-reuse counterweight to Aba — come when the plate and intimacy matter more than a large designed room.',
        photoPolicy: 'text-only',
      },
      {
        title: 'Never Never',
        bestFor: 'Drinks / neighborhood bar',
        category: 'Drinks / neighborhood bar',
        body: 'The neighborhood bar stop when dinner is done and you want to stay in WeHo.',
        photoPolicy: 'text-only',
      },
    ],
    itinerary: [
      { time: 'Afternoon', title: 'Gallery walk', description: 'Confirm hours; many spaces open Thursday to Saturday.' },
      { time: 'Late afternoon', title: 'Brewery taproom', description: 'Several within walking distance of each other.' },
      { time: 'Evening', title: 'Aba or Bastion', description: 'Group design dinner at Aba, or intimate food-focused Bastion.' },
    ],
    practicalTips: [
      {
        title: 'Art crawl nights fill parking',
        body: 'Free street and lot parking most days. Art crawl nights fill fast — arrive early or use rideshare.',
      },
    ],
    faqs: [
      {
        question: 'Should I book Aba or Bastion?',
        answer:
          'Book Aba for group dinner and design — the two-level indoor-outdoor room is part of the reason to go. Choose Bastion when you want a smaller, food-focused room instead.',
      },
    ],
  },
];

export function getNeighborhoodGuide(slug: string): NeighborhoodEditorialGuide | undefined {
  return neighborhoodGuides.find((g) => g.slug === slug);
}

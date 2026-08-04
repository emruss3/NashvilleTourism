import type { Guide, GuideCluster } from '../types';

/**
 * DEMO CONTENT NOTICE
 * These guides are written as orientation and decision help: neighborhoods,
 * categories, timing, cost expectations, and logistics. They deliberately avoid
 * claims about specific private businesses. Every guide ships as `unverified`
 * until a named editor checks the practical details against a primary source.
 *
 * Prices, hours, and booking windows change. Nothing here should be presented
 * to a reader as a confirmed fact without a fresh check.
 */
export const guides: Guide[] = [
  /* ------------------------------------------------------------------ *
   * 1. Restaurants
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'best-restaurants-nashville',
    title: 'The Best Restaurants in Nashville',
    summary:
      'How to choose where to eat in Nashville by neighborhood, price, and how far ahead you are willing to book.',
    shortAnswer:
      'Eat dinner in Germantown or East Nashville, not on Broadway. Germantown holds the highest concentration of serious sit-down restaurants within a six-block walk; East Nashville is where the independent kitchens and the local crowd are, though you will drive between clusters. Book the well-known rooms two to four weeks ahead for a weekend table, and keep one walk-in option in reserve.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Neighborhood-level guidance only. No specific restaurant claims. Needs an editor pass before any named venue is added.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-02-11',
    cluster: 'Restaurants',
    intro: [
      'Nashville eats better than its reputation suggests, but the good food is not where the crowds are. The strip most visitors walk is built around live music and volume. The kitchens people here actually plan an evening around sit a five- to fifteen-minute drive away.',
      'The practical question is not which single restaurant is best. It is which neighborhood you want to be in on a given night, how far ahead you are willing to book, and whether you are eating with two people or eight. Those three answers narrow the city fast.',
      'This guide works by district and by category. It tells you where to point yourself, what a meal tends to cost, and when the wait will be worst. Check current menus, hours, and pricing directly before you commit.',
    ],
    sections: [
      {
        heading: 'Start by picking a neighborhood, not a restaurant',
        body: [
          'Germantown is the most efficient dinner neighborhood in the city. It is roughly six blocks, it is quiet, and you can park once and walk to several rooms. If your group cannot agree, this is the safest place to land.',
          'East Nashville is the other serious option. The difference is geography: it is not one strip but several pockets, so plan on a short drive between dinner and a drink. The rooms are smaller and the crowd skews local.',
          'The Gulch and downtown are convenient rather than exceptional. You are paying for location and walkability. That is a real value if your group is large and nobody wants to coordinate cars, but adjust expectations accordingly.',
          '12 South and Hillsboro Village are daytime neighborhoods. Coffee, brunch, and lunch are the strength. They thin out early in the evening.',
        ],
        picks: [],
      },
      {
        heading: 'What the categories actually mean here',
        body: [
          'Meat-and-three is the local lunch format: one meat, three vegetable sides, cafeteria-style or close to it. It is inexpensive, it is quick, and it is the thing most visitors skip and then regret skipping. Go at lunch, not dinner, and go early because the good ones run out.',
          'Hot chicken is a specific dish with a specific history in this city, and the heat scale is not decorative. Order one level below what you think you can handle. Most counters serve it with white bread and pickles, and most have a line at peak lunch.',
          'Barbecue in Nashville is whole-hog and pork-shoulder territory rather than the beef-brisket tradition of central Texas. Sauce tends toward vinegar and tomato. Several places sell out in the afternoon.',
          'The newer end of the scene — tasting menus, wood-fire cooking, wine-forward rooms — clusters in Germantown, East Nashville, and Wedgewood-Houston. This is where reservations matter most.',
        ],
      },
      {
        heading: 'Reservations, waits, and timing',
        body: [
          'Weekend dinner between 6:30 and 8:30 is the hardest window in the city. If you want a specific room on a Friday or Saturday at 7, plan two to four weeks out. Popular rooms release tables on a rolling window, so the exact lead time varies.',
          'Tuesday and Wednesday are the quiet nights. The same kitchen that requires a month of notice on Saturday will often seat you same-day midweek. If your trip is flexible, this is the single easiest way to eat better.',
          'A 5:30 or 9:00 reservation is usually available when 7:00 is not. Early tables are also the better choice if you have a show to get to.',
          'Weekend brunch runs on a wait-list system almost everywhere. Arriving before 10am is worth roughly an hour of standing around later.',
        ],
      },
      {
        heading: 'What to expect on cost',
        body: [
          'A meat-and-three or hot chicken lunch is the low end. Expect roughly $12 to $20 a head, but check current pricing.',
          'A mid-range sit-down dinner with a drink each generally lands around $50 to $80 per person once tax and tip are in. The higher-profile Germantown and East Nashville rooms run above that.',
          'Downtown carries a location premium on nearly everything, and event nights compound it. Add parking, which is a real line item near Broadway.',
          'Groups over six often trigger an automatic gratuity and sometimes a set menu. Ask when you book rather than at the table.',
        ],
      },
      {
        heading: 'Eating with a group',
        body: [
          'Most of the better kitchens here occupy small converted buildings, and small buildings mean small tables. A party of eight is genuinely hard to seat without notice. Call rather than relying on an online booking widget, which often caps at six.',
          'If your group is larger than eight, the practical formats are a food hall, a brewery taproom with a kitchen, or a downtown restaurant built for volume. That is a compromise, but it beats splitting into three tables in three neighborhoods.',
          'Splitting the check is inconsistently supported. Assume one card and settle up afterward unless the restaurant says otherwise.',
        ],
      },
      {
        heading: 'How to get there and where to put the car',
        body: [
          'Rideshare is the default for dinner, and it is the right call if anyone is drinking. Downtown to East Nashville or Germantown is a short, cheap ride outside peak times.',
          'Surge pricing after 10pm on weekends is real and can double a fare. If you are heading back from East Nashville late, expect a wait and a higher rate.',
          'Germantown has street parking plus small lots, which tighten on nights when the nearby ballpark has a game. East Nashville is mostly free street parking that gets scarce on weekend nights. Sylvan Park is the easiest parking of any restaurant strip in the city.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do I need reservations in Nashville?',
        answer:
          'For weekend dinner at a well-known room, yes. Two to four weeks out is a reasonable target for a Friday or Saturday at prime time. Midweek is far more forgiving, and lunch almost never requires one.',
      },
      {
        question: 'Where should I eat if I only have one dinner?',
        answer:
          'Germantown. It gives you the highest density of serious restaurants in the smallest walking radius, it is five minutes from downtown, and it is quiet enough to hold a conversation.',
      },
      {
        question: 'Is the food on Broadway worth it?',
        answer:
          'Broadway is built around live music and drinks. The food is functional. Eat elsewhere and go to Broadway for the bands.',
      },
      {
        question: 'How spicy is hot chicken really?',
        answer:
          'The upper heat levels are not a novelty. They are genuinely painful for most people. Order one level below your instinct, and remember that the mild and medium versions still carry real heat.',
      },
      {
        question: 'What is a meat-and-three?',
        answer:
          'A plate with one meat and three vegetable sides, served in a long-running local lunch format. It is cheap, filling, and the most distinctly Nashville meal you can eat that is not chicken.',
      },
    ],
    relatedSlugs: [
      'best-bars-rooftops-nashville',
      'nashville-neighborhood-guide',
      'nashville-weekend-itinerary',
      'nashville-first-time-visitors',
    ],
    readingTimeMinutes: 9,
  },

  /* ------------------------------------------------------------------ *
   * 2. Bars and rooftops
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'best-bars-rooftops-nashville',
    title: 'The Best Bars and Rooftops in Nashville',
    summary:
      'Where to drink in Nashville by neighborhood and by night, including what rooftops actually cost you in time and money.',
    shortAnswer:
      'Broadway and the Gulch are where the rooftops are, and they trade view for line, cover, and crowd. East Nashville has the neighborhood bars and cocktail rooms locals use, and Wedgewood-Houston has the breweries. Rooftops are best on a weekday at sunset; on a Saturday night expect a wait downstairs and a packed deck once you get up.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'District-level guidance. Cover charges, dress codes, and rooftop policies vary by venue and change seasonally.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-03-04',
    cluster: 'Restaurants',
    intro: [
      'Nashville drinking splits cleanly into three modes. There is Broadway, which is loud, free to enter, and built for volume. There are the rooftops, which are about the skyline and the photograph. And there are the neighborhood bars, which is where most people who live here end up.',
      'You can do all three in a weekend, but not in one night, and trying is how groups end up cold, tired, and standing in a line at midnight.',
      'This guide covers what each mode is actually like, when to go, and what to budget. Cover charges and rooftop policies change with the season and with whether the room has a private event booked, so check before you build a night around one place.',
    ],
    sections: [
      {
        heading: 'Broadway: free to enter, loud, and better early',
        body: [
          'The honky-tonks on Lower Broadway have live bands running from late morning until close, and none of them charge a cover. The bands play for tips, which is why a bucket comes around; tip them.',
          'The strip is walkable end to end in about fifteen minutes, and the multi-floor bars usually have a different band on each level. Walking in, listening for a song, and walking back out is the intended way to use it.',
          'It is at its best between about 2pm and 6pm. The playing is just as good, the rooms are open, and you can move. After 9pm on a Saturday it is shoulder to shoulder and the stairwells back up.',
          'Bring a card and an ID. Drinks are priced for the location, and most bars have gone to card-only.',
        ],
        picks: [],
      },
      {
        heading: 'Rooftops: what you are actually paying for',
        body: [
          'The rooftop concentration is downtown and in the Gulch, with a few in Midtown. What you are buying is elevation and a skyline view, and on a clear evening that is a genuinely good hour.',
          'The costs are less obvious. Many rooftops have a separate elevator line, some enforce a dress code, and several add a cover or a minimum on weekend nights. Drinks run above street level in every sense.',
          'Weather closes them. Nashville summers are humid and afternoon storms are common; winter shuts most decks or wraps them in plastic and heaters. Spring and fall evenings are the reliable window.',
          'The move is a weekday at sunset. Same view, a fraction of the wait. If you only have a Saturday, go at 4pm rather than 9pm.',
        ],
      },
      {
        heading: 'Neighborhood bars and cocktail rooms',
        body: [
          'East Nashville is the center of gravity for drinking that is not aimed at visitors. It runs from dive bars with a jukebox to small cocktail rooms with a short, serious list. The rooms are small, which is the appeal and also the constraint.',
          'Germantown skews toward wine and after-dinner drinks rather than a night out on its own. It is a good second stop, not a destination.',
          'Wedgewood-Houston is the brewery district. Taprooms in converted industrial buildings, usually casual, usually with space to sit, and generally the easiest place to put a group of eight without a reservation.',
          'Midtown runs younger because of Vanderbilt. If you want a college-adjacent bar scene, that is where it is. If you do not, avoid it on a game night.',
        ],
      },
      {
        heading: 'Timing, covers, and the practical rules',
        body: [
          'Thursday through Saturday is peak. Sunday evening is quietly one of the better times to go out here: rooms are open, staff are relaxed, and there is no line.',
          'Cover charges are uncommon at the honky-tonks and common at rooftops and music venues on weekend nights. Assume a cover is possible after 8pm and carry a card.',
          'Last call is generally around 3am in the central districts, but individual bars close earlier and it varies. Do not plan a night on the assumption that everything runs that late.',
          'Dress code is casual almost everywhere except a handful of rooftops and hotel bars. Boots are not required, but closed shoes on Broadway are a good idea.',
        ],
      },
      {
        heading: 'Getting home',
        body: [
          'Do not drive. Rideshare coverage is good, and the drive from downtown to any of the neighborhoods above is short.',
          'Between roughly 11pm and 2am on weekends, downtown pickup is genuinely difficult. Streets close, the pin does not match where the car can actually stop, and prices surge. Walking two or three blocks off Broadway before you request a ride solves most of it.',
          'The pedal taverns and party vehicles you will see on Broadway are a transport option in name only. They move at walking speed and they cost more than a ride.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do Nashville honky-tonks charge a cover?',
        answer:
          'The Lower Broadway honky-tonks are generally free to walk into. The bands work for tips, so plan on tipping the bucket. Rooftops and dedicated music venues are where covers appear.',
      },
      {
        question: 'When is the best time to go to a rooftop bar?',
        answer:
          'A weekday around sunset, in spring or fall. You get the same view without the elevator line, and the deck is actually usable. Weekend nights mean waits downstairs and a crowded deck upstairs.',
      },
      {
        question: 'Where do locals drink in Nashville?',
        answer:
          'Mostly East Nashville, plus the Wedgewood-Houston breweries. Smaller rooms, no cover, and a crowd that is not on a weekend trip.',
      },
      {
        question: 'How late do bars stay open?',
        answer:
          'Central-district bars commonly run until around 3am, but closing times vary by venue and by night. Confirm rather than assuming, especially outside downtown.',
      },
    ],
    relatedSlugs: [
      'best-restaurants-nashville',
      'best-live-music-venues-nashville',
      'nashville-bachelorette-guide',
      'nashville-neighborhood-guide',
    ],
    readingTimeMinutes: 8,
  },

  /* ------------------------------------------------------------------ *
   * 3. Live music
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'best-live-music-venues-nashville',
    title: 'The Best Live Music Venues in Nashville',
    summary:
      'The difference between a honky-tonk, a listening room, and a ticketed hall, and how to build a night around each.',
    shortAnswer:
      'For a seated, ticketed show, the Ryman Auditorium is the room to try first; buy as soon as a date is announced. For songwriters performing their own material in a small room, look at the Bluebird Cafe or a listening room and plan weeks ahead because seats are limited. For free, walk-in music any afternoon, Broadway does it better than anywhere else in the country.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Venue categories and general booking behavior. Calendars, ticket release windows, and seating policies must be confirmed with each venue.',
    placement: 'editorial',
    authorSlug: 'music-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-01-21',
    cluster: 'Music',
    intro: [
      'Nashville has more live music per square mile than anywhere else in the United States, and almost none of it works the way visitors expect. The famous names are not always the best rooms, the best rooms are often the smallest, and the thing you most want to see may require booking before you book your flight.',
      'The useful mental model is four categories: honky-tonks, listening rooms, mid-size ticketed halls, and the historic venues. Each has a different cost, a different lead time, and a different kind of night attached.',
      'This guide explains what each category actually delivers, how far ahead to plan, and how to combine them without spending your whole trip in a line. Confirm calendars and ticket details with the venue directly.',
    ],
    sections: [
      {
        heading: 'Honky-tonks: free, constant, and better than they sound on paper',
        body: [
          'The bars on Lower Broadway run live bands from late morning until close, with no cover and no ticket. Players rotate in shifts, so a band you like will be gone in a couple of hours and another one will be up.',
          'The musicianship is high. These are working players, many of them touring or session musicians filling a calendar. The repertoire skews toward covers because that is what the room pays for, but the playing is real.',
          'Tip the bucket. Broadway bands are paid almost entirely by tips, and this is the one etiquette rule that actually matters here.',
          'Go in the afternoon if you want to hear anything. By 9pm on a weekend the volume and the crowd make listening secondary.',
        ],
        picks: [],
      },
      {
        heading: 'Listening rooms: where the songwriting is',
        body: [
          'A listening room is a small venue where the audience is expected to be quiet and the performer is usually playing original material, often seated, often in the round with two or three other writers trading songs.',
          'The Bluebird Cafe in Green Hills is the best-known example. It is genuinely tiny, and that is the entire point; it is also why reservations open in advance and disappear quickly. If this is on your list, plan around it rather than hoping.',
          'The Station Inn in the Gulch is the bluegrass equivalent: a plain room, a cash bar, and some of the best acoustic playing you will hear. Seating is limited and often first-come, so arrive early.',
          'The etiquette is strict and worth respecting. Talking during a set in a listening room is the local equivalent of talking during a film.',
        ],
      },
      {
        heading: 'Ticketed halls and the historic rooms',
        body: [
          'The Ryman Auditorium is the room people mean when they talk about Nashville acoustics. It is a former tabernacle with wooden pews, it seats a couple of thousand, and there is no bad-sounding seat in it. Shows sell out; buy when a date is announced rather than when you arrive.',
          'The Grand Ole Opry runs at the Opry House most of the year and moves to the Ryman for a stretch in winter. It is a radio show, not a concert: multiple artists, short sets, live commercials read from the stage. That format surprises people. Know it going in and it is a good night.',
          'Mid-size clubs and theaters across Midtown, East Nashville, and the Gulch handle touring acts. These are ordinary ticketed shows with ordinary lead times, and they are where you will find current touring artists rather than the heritage programming.',
          'Ticket fees are substantial across the board. The face price is not the price. Budget accordingly and buy from the venue or its official ticketing partner rather than a resale listing.',
        ],
      },
      {
        heading: 'How far ahead to plan',
        body: [
          'Bluebird-style rounds: weeks. Reservation windows open on a schedule and fill in minutes. Treat it as the fixed point in your trip and build around it.',
          'Ryman and Opry shows: as soon as you have dates. Popular nights go early, and the good seats go first.',
          'Touring club shows: a week or two is usually fine unless the act is well known.',
          'Broadway: no planning at all. That is its function in a trip. Use it to fill the gaps.',
        ],
      },
      {
        heading: 'Building a music night that works',
        body: [
          'One ticketed show per night is the right number. Two is a logistics problem, and the second one always suffers.',
          'A reliable structure: early dinner in Germantown or the Gulch, a 7:30 or 8:00 show, then Broadway afterward if anyone still has energy. The reverse order does not work because you will not leave Broadway.',
          'If you are downtown, the Ryman is walkable from most hotels. The Opry House is out by Opryland, roughly twenty minutes by car with real post-show traffic. Budget the ride home.',
          'Sunday and Monday nights have thinner calendars across the city. If your trip is short and music is the reason for it, weight your nights toward Thursday through Saturday.',
        ],
      },
      {
        heading: 'What it costs',
        body: [
          'Broadway is free apart from drinks and tips. Expect to leave $20 or more in tip buckets across a night if you move between bars, but check nothing and commit to nothing.',
          'Listening rooms typically carry a modest cover or ticket plus a food and drink minimum in some cases. Expect roughly $15 to $40 a head before drinks, but confirm current pricing with the venue.',
          'Ryman and Opry tickets vary widely by artist and seat. Add fees, which are meaningful.',
          'Parking downtown on a show night is its own expense. A rideshare is often cheaper than a garage.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is the Grand Ole Opry worth going to?',
        answer:
          'Yes, if you understand the format. It is a live radio broadcast with several artists playing short sets, not a full concert by one headliner. People who expect a standard concert are the ones who come away disappointed.',
      },
      {
        question: 'How do I get into the Bluebird Cafe?',
        answer:
          'Plan well ahead. The room is very small and reservations open on a schedule and go quickly. Check the venue directly for the current booking window, and treat it as something you build the trip around rather than a walk-in.',
      },
      {
        question: 'Do I need tickets for Broadway honky-tonks?',
        answer:
          'No. They are free to enter and run bands all day. The bands are paid by tips, so bring cash or use whatever tip method the bucket indicates.',
      },
      {
        question: 'What is the best-sounding room in Nashville?',
        answer:
          'The Ryman Auditorium, by broad consensus. It was built as a tabernacle, and the wooden pews and shape of the hall carry sound unusually well.',
      },
      {
        question: 'Can I see live music on a Monday or Tuesday?',
        answer:
          'Yes. Broadway runs every day, and listening rooms often program writers nights early in the week. The ticketed touring calendar is thinner, so check listings before you count on a specific show.',
      },
    ],
    relatedSlugs: [
      'best-things-to-do-nashville',
      'best-bars-rooftops-nashville',
      'nashville-first-time-visitors',
      'nashville-weekend-itinerary',
    ],
    readingTimeMinutes: 10,
  },

  /* ------------------------------------------------------------------ *
   * 4. Where to stay
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'where-to-stay-nashville',
    title: 'Where to Stay in Nashville',
    summary:
      'A neighborhood-by-neighborhood breakdown of where to book, what each area costs, and the trade-off between noise and walkability.',
    shortAnswer:
      'Stay downtown if walking to live music matters more than sleeping, in the Gulch if you want walkability with less street noise and newer hotels, and in Germantown or East Nashville if you want a quieter room and better food within a five-minute ride. Midtown is the value option with decent access to both sides of the city. Everywhere outside those areas effectively requires a car.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Area-level guidance on noise, walkability, and typical rate behavior. No property-specific claims. Rates fluctuate heavily by event calendar.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-01-14',
    cluster: 'Hotels',
    intro: [
      'Where you sleep in Nashville decides more about your trip than which hotel you pick. The city is spread out, the central districts each have a distinct character, and the difference between a good weekend and an exhausting one is often four blocks.',
      'The core trade-off is simple: proximity to Broadway buys you walkability and costs you quiet. Every neighborhood below sits somewhere on that line.',
      'This guide covers what each area is like at 11pm, how long it takes to get anywhere from there, what parking costs you, and who each one suits. Confirm rates and policies with the property before booking.',
    ],
    sections: [
      {
        heading: 'Downtown and Broadway',
        body: [
          'The densest concentration of hotels in the city, and the only area where you can walk out the door into live music. If your trip is two nights and centered on Broadway and the Ryman, this is the efficient choice.',
          'It is loud. Not ambient-city loud; amplified-band-until-2am loud on the blocks nearest Broadway. Ask for a room on a high floor facing away from the strip, and understand that a request is not a guarantee.',
          'Rates are the highest in the city and swing hard with the event calendar. A weekend with a stadium event or a festival can double what the same room costs a month later.',
          'Parking is a garage, and it is expensive on top of the room. If you are not leaving the district, skip the rental car entirely.',
        ],
        picks: [],
      },
      {
        heading: 'The Gulch',
        body: [
          'The newest built-up district in central Nashville, roughly fifteen minutes on foot from Broadway. Modern mid-rise buildings, hotels at street level, and restaurants underneath them.',
          'It is the compromise position: walkable to downtown, quieter at night, and easier to move around than the strip. It is also where a lot of weekend groups stay, so it is not exactly restful on a Saturday.',
          'Prices sit close to downtown. You are not saving much money here, you are buying a calmer block.',
          'Garage parking under most buildings, usually paid, with validation policies that vary.',
        ],
      },
      {
        heading: 'Germantown',
        body: [
          'Six quiet blocks just north of downtown with the best dinner density in the city and a twenty-minute walk or five-minute ride to Broadway.',
          'Fewer hotel rooms here, so book earlier. The stock skews smaller and more residential than the downtown towers.',
          'This is the pick for couples and for anyone whose trip is more about eating than about nightlife. It is genuinely quiet at night.',
          'Street parking plus a few small lots. Ballpark event nights tighten it noticeably.',
        ],
      },
      {
        heading: 'East Nashville and Midtown',
        body: [
          'East Nashville is across the river, five to ten minutes from downtown by car and not practical to walk. Lodging skews toward smaller properties and short-term rentals. Choose it if the independent food and bar scene is the reason for your trip, and accept that you will ride everywhere.',
          'Midtown sits between downtown and Vanderbilt. It is the value play: rates below downtown, still close to both the center and the west side, with Music Row and the hot chicken counters nearby.',
          'Midtown gets loud in a different way. The bar scene skews college-aged, and Vanderbilt event nights fill the area.',
          'Both areas have easier and cheaper parking than downtown, and East Nashville is largely free street parking.',
        ],
      },
      {
        heading: 'Short-term rentals and how to think about them',
        body: [
          'Nashville has a large short-term rental market, heavily concentrated in East Nashville and the areas around downtown. For groups of six or more it is often cheaper per head than hotel rooms, and it solves the problem of everyone wanting a common space.',
          'The regulatory picture has shifted repeatedly and permit requirements vary by property type and location. Book through a platform that shows a permit number, and read the cancellation terms carefully.',
          'The neighbors are neighbors. Many of these houses sit on residential streets with families on either side. Quiet hours are usually enforced by the host, sometimes by ordinance, and complaints can end a stay early.',
          'Cleaning fees and service charges move the real per-night number a long way from the headline rate. Compare totals, not nightly prices.',
        ],
      },
      {
        heading: 'Rates, timing, and what drives the price',
        body: [
          'Spring and fall are peak. April through early June and September through October bring the best weather and the highest rates. July and August are hot and humid, and pricing softens accordingly.',
          'The event calendar matters more than the season. A single large stadium show, a marathon weekend, or a major festival will reprice the entire central hotel market for those nights. Check what is happening on your dates before you assume a rate is normal.',
          'Weekends cost more than weekdays here by a wider margin than in most cities, because the leisure demand is concentrated Thursday to Sunday. A Sunday-to-Wednesday trip is meaningfully cheaper.',
          'Watch for resort or destination fees and mandatory parking charges. They are common downtown and they are not always visible in the search result.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What is the best area to stay in Nashville for a first visit?',
        answer:
          'Downtown or the Gulch. Both put you within walking distance of Broadway, the Ryman, and the Country Music Hall of Fame, which is where most first trips spend their time. The Gulch is the quieter of the two.',
      },
      {
        question: 'Is it too loud to sleep downtown?',
        answer:
          'On the blocks closest to Broadway, it can be. Amplified music runs late. Request a high floor away from the street, and if you are a light sleeper, book in the Gulch or Germantown instead.',
      },
      {
        question: 'Do I need a car in Nashville?',
        answer:
          'Not if you stay downtown or in the Gulch and stick to the central districts. If you plan to spend time in East Nashville, Sylvan Park, or Green Hills, you will either rent a car or spend a lot on rideshare. Public transit exists but is not built for visitor itineraries.',
      },
      {
        question: 'When are hotel rates lowest?',
        answer:
          'Midweek in July and August, and again in January and February. The bigger factor is the event calendar; check whether a stadium show or festival lands on your dates before judging a rate.',
      },
      {
        question: 'Is a short-term rental better than a hotel for a group?',
        answer:
          'Usually, at six or more people, on cost and on having a shared space. Compare the total after cleaning and service fees, confirm the property is permitted, and take the quiet hours seriously.',
      },
    ],
    relatedSlugs: [
      'nashville-neighborhood-guide',
      'nashville-first-time-visitors',
      'nashville-weekend-itinerary',
      'nashville-bachelorette-guide',
    ],
    readingTimeMinutes: 10,
  },

  /* ------------------------------------------------------------------ *
   * 5. Things to do
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'best-things-to-do-nashville',
    title: 'The Best Things to Do in Nashville',
    summary:
      'The attractions worth your time, the ones that are optional, and how to fit them together without spending the day in traffic.',
    shortAnswer:
      'The three things that justify a slot on almost any itinerary are the Country Music Hall of Fame, a show at the Ryman Auditorium, and an afternoon walking Lower Broadway. Add the Parthenon in Centennial Park if you want something outdoors and free, and a greenway walk if you need a break from crowds. Everything else is a matter of taste and how many days you have.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'General orientation to public attractions and outdoor space. Hours, admission, and tour availability must be checked with each site.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-02-25',
    cluster: 'Things to Do',
    intro: [
      'Most Nashville itineraries fail the same way: too many things, spread too far apart, with no allowance for how long it takes to get between them. The city looks compact on a map and does not behave that way in a car at 5pm.',
      'The honest version is that there are about five things most visitors are glad they did, a longer list of good options that depend on your interests, and a handful of attractions that absorb an afternoon without giving much back.',
      'This guide sorts them, gives realistic time estimates, and groups things by geography so you are not crossing the city twice in a day. Confirm hours and ticketing directly before you go.',
    ],
    sections: [
      {
        heading: 'The short list',
        body: [
          'The Country Music Hall of Fame and Museum is the one indoor attraction that is worth the ticket even if you do not much like country music. It is well built, it explains why this city exists in its current form, and it is downtown. Budget two hours if you read, three if you read everything.',
          'A show at the Ryman Auditorium. Even a mid-bill act in that room is a better night than a headliner in an ordinary hall. Tickets go early.',
          'An afternoon on Lower Broadway. Free, walkable, and the bands are genuinely good before the evening crowd arrives. An hour or two is enough.',
          'The Parthenon in Centennial Park is a full-scale replica with an art museum inside, and the park around it is the best green space near the center of town. Free to walk around, ticketed to go in.',
          'The John Seigenthaler Pedestrian Bridge at dusk. Five minutes of effort, the best skyline view in the city, and it costs nothing.',
        ],
        picks: [],
      },
      {
        heading: 'Music history beyond the Hall of Fame',
        body: [
          'RCA Studio B on Music Row is a working piece of recording history and is toured through the Country Music Hall of Fame rather than booked separately. If you liked the museum, this is the natural extension.',
          'Music Row itself is a working office district in converted houses, not an attraction. Walking it takes twenty minutes and gives useful context, but there is nothing to go into.',
          'The Musicians Hall of Fame and the various genre-specific museums downtown are worth it if the subject matter is already an interest. They are not general-audience stops.',
          'The Grand Ole Opry House out by Opryland runs backstage tours during the day and the radio show at night. It is about twenty minutes from downtown and the traffic back is real.',
        ],
      },
      {
        heading: 'Outdoors and free',
        body: [
          'Centennial Park is the most convenient green space to the center of the city, with the Parthenon in the middle of it.',
          'Shelby Bottoms Greenway in East Nashville is flat, shaded, and runs along the river. It is the best walk or bike ride within ten minutes of downtown.',
          'Radnor Lake, south of the city, is the closest thing to a hike. It is popular, the parking lots fill early on weekend mornings, and the trails are quiet on weekdays.',
          'Bicentennial Capitol Mall State Park next to Germantown is free, walkable from the farmers market, and lays out state history along a long open mall.',
          'Summer heat and humidity are not a minor consideration. From June through August, do outdoor things before 11am or after 6pm.',
        ],
      },
      {
        heading: 'Grouping by geography so you do not waste the day',
        body: [
          'Downtown cluster: Country Music Hall of Fame, Broadway, the Pedestrian Bridge, the Ryman. All within a fifteen-minute walk of each other. This is one comfortable day.',
          'West cluster: Centennial Park and the Parthenon, Hillsboro Village, Music Row, Sylvan Park. Half a day, best done with a car.',
          'East cluster: Shelby Bottoms, Five Points shopping, East Nashville food and bars. Half a day plus an evening.',
          'Outlying: the Opry complex, Radnor Lake, Green Hills, and the plantation and historic-home sites outside the city. Each of these is its own trip. Do not try to pair two of them in one day.',
        ],
      },
      {
        heading: 'What it costs and how to save',
        body: [
          'Major museum admission generally lands in the $25 to $35 per adult range, with combination tickets for the Hall of Fame and Studio B. Expect roughly that, but check current pricing.',
          'The best things in Nashville are free: Broadway, the bridge, the parks, the greenways, and the farmers market.',
          'Skip-the-line and combo passes only pay off if you are doing three or more paid attractions. Most trips do not.',
          'Guided tours of the honky-tonk strip and the historic sites vary widely in quality. A tour is worth it for the outlying historic sites, where the context is the point, and rarely worth it downtown, where you can walk it yourself.',
        ],
      },
      {
        heading: 'What you can skip',
        body: [
          'Anything sold as a distillery, brewery, or bar tour that mostly consists of a bus and a schedule. You can walk the same route.',
          'The second and third music museum. One is context; three is repetition.',
          'Driving out to a single attraction more than thirty minutes away when you only have two days. The drive will cost you more than the stop returns.',
          'Broadway after 10pm on a Saturday, unless the crowd itself is what you came for. It is a legitimate thing to want. Just know that is what you are choosing.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How many days do you need in Nashville?',
        answer:
          'Two full days covers the downtown core and one evening of music. Three days lets you add a neighborhood day and an outdoor morning without rushing. Four or more and you are into day trips.',
      },
      {
        question: 'Is the Country Music Hall of Fame worth it?',
        answer:
          'Yes, even if country music is not your thing. It explains the industry that shaped the city, and it is well constructed. Budget two hours.',
      },
      {
        question: 'What can you do in Nashville for free?',
        answer:
          'Walk Lower Broadway and listen to bands, cross the Pedestrian Bridge at dusk, walk Centennial Park and the grounds of the Parthenon, use the greenways, and visit the Bicentennial Capitol Mall. That is a solid day at no cost.',
      },
      {
        question: 'What is there to do in Nashville when it rains?',
        answer:
          'The downtown museums, the honky-tonks, which are all indoors and free, and the Country Music Hall of Fame, which can absorb most of an afternoon. Summer storms here are usually short.',
      },
    ],
    relatedSlugs: [
      'best-live-music-venues-nashville',
      'nashville-with-kids',
      'nashville-weekend-itinerary',
      'nashville-neighborhood-guide',
    ],
    readingTimeMinutes: 10,
  },

  /* ------------------------------------------------------------------ *
   * 6. Neighborhood guide
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'nashville-neighborhood-guide',
    title: 'A Guide to Nashville Neighborhoods',
    summary:
      'What each central Nashville district is actually like, how they connect, and which one fits the trip you are planning.',
    shortAnswer:
      'Downtown and the Gulch are the walkable visitor core; Germantown and East Nashville are where the food is; 12 South and Hillsboro Village are daytime strips for coffee and shopping. Midtown covers Music Row and hot chicken, Wedgewood-Houston covers galleries and breweries, and Green Hills and Sylvan Park are residential areas you visit for one specific reason. Nothing outside the downtown core connects on foot.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Geography, character, and travel times between districts. Drive times are typical rather than guaranteed and worsen at rush hour.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-01-28',
    cluster: 'Trip Planning',
    intro: [
      'Nashville is a set of distinct districts rather than a single walkable center. Understanding how they relate to each other is the single most useful thing you can do before a trip, because it determines where you stay, how much you spend on rides, and how much of your day disappears into a car.',
      'The core is small. Downtown, the Gulch, and Germantown connect on foot in fifteen to twenty minutes. Everything else needs wheels, even when the map makes it look close.',
      'This guide walks through the districts in the order you are likely to encounter them, with what each is for and roughly how long it takes to get there from downtown.',
    ],
    sections: [
      {
        heading: 'The walkable core: downtown, the Gulch, Germantown',
        body: [
          'Downtown and Lower Broadway is the dense center: honky-tonks, the Ryman, the Country Music Hall of Fame, the arena, and most of the large hotels within a few blocks. Loud, crowded on weekends, and covered end to end on foot in about fifteen minutes.',
          'The Gulch sits southwest, about fifteen minutes on foot from Broadway. It is the newest built district, vertical and tidy, with hotels and restaurants stacked at street level. Quieter than Broadway, more expensive than East Nashville.',
          'Germantown is directly north, about twenty minutes on foot or five by car. Six blocks of brick streets, the strongest dinner cluster in the city, and the farmers market at its edge. It is the quiet option that is still central.',
          'If you can build your trip inside this triangle, you will not need a car.',
        ],
        picks: [],
      },
      {
        heading: 'Across the river: East Nashville',
        body: [
          'East Nashville is five to ten minutes by car across the Cumberland and not realistically walkable from downtown. It is where the independent restaurant and bar scene concentrated, and where the crowd is local rather than visiting.',
          'It is not one strip. Five Points, Riverside Village, and several other pockets sit a few minutes apart, so plan on driving between dinner and drinks even inside the neighborhood.',
          'Shelby Bottoms Greenway runs along the river here and is the best easy walk close to the center of the city.',
          'Parking is mostly free street parking, which tightens on weekend nights around the busier blocks.',
        ],
      },
      {
        heading: 'South and west: 12 South, Hillsboro Village, Midtown',
        body: [
          '12 South is a half-mile commercial strip through a residential neighborhood, about ten minutes from downtown. Coffee, boutiques, brunch, and a well-photographed set of murals. Park once and walk it. Weekend mornings are busy; weekdays are calm.',
          'Hillsboro Village is two blocks wedged between Vanderbilt and Belmont, with long-running businesses and an independent theater. It has a settled everyday feel the newer districts lack, and it pairs naturally with 12 South, which is minutes away.',
          'Midtown runs west from downtown and takes in Music Row, where publishing houses and studios occupy converted homes. It is also where several well-known hot chicken counters are, and where the younger bar scene lives.',
          'Centennial Park and the Parthenon sit at the west end of this cluster, walkable from Hillsboro Village in about fifteen minutes.',
        ],
      },
      {
        heading: 'The quieter districts: Wedgewood-Houston and Sylvan Park',
        body: [
          'Wedgewood-Houston, usually shortened to WeHo, is the former industrial pocket south of downtown that now holds galleries, studios, and breweries in converted warehouses. It is about ten minutes by car and it is the best place in the city to put a group in a taproom without a reservation.',
          'The gallery scene concentrates around monthly art crawls, and many galleries keep limited weekday hours. Check before you drive over on a Tuesday afternoon.',
          'Sylvan Park is a west-side residential neighborhood about fifteen minutes out, with a short restaurant row and greenway access. Visitors almost never end up here by accident, which is exactly its appeal on a busy weekend.',
          'Both are car-dependent and both have easy, free parking.',
        ],
      },
      {
        heading: 'Green Hills and the outer edge',
        body: [
          'Green Hills is fifteen to twenty minutes south, longer at rush hour, and is primarily shopping and residential. For visitors, the reason to go is the Bluebird Cafe, which seats very few people and books out well in advance.',
          'Traffic on Hillsboro Pike is the main friction on that route. Allow more time than the distance implies, especially between 4pm and 6:30pm.',
          'Beyond Green Hills, the Opry complex sits northeast about twenty minutes out, and the historic sites and Radnor Lake are their own trips. Treat each as a half day rather than a stop.',
          'None of these connect to each other. Going from the Opry to Green Hills in one evening is a bad plan.',
        ],
      },
      {
        heading: 'How to choose',
        body: [
          'Two nights, first visit, no car: stay downtown or in the Gulch and do not leave the core except for one dinner.',
          'Food is the point: stay in Germantown, eat in Germantown and East Nashville, and budget for rides.',
          'You have been before: East Nashville and Wedgewood-Houston will feel like a different city than the one you saw the first time.',
          'Travelling with kids or wanting quiet: Green Hills, Sylvan Park, or the calmer edges of Germantown, with a car.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Which Nashville neighborhood is best for first-time visitors?',
        answer:
          'Downtown or the Gulch. They put the Ryman, Broadway, and the Country Music Hall of Fame within walking distance, which is where most of a first trip is spent.',
      },
      {
        question: 'Can you walk between Nashville neighborhoods?',
        answer:
          'Only inside the core. Downtown, the Gulch, and Germantown connect on foot in fifteen to twenty minutes. East Nashville, 12 South, Midtown, and everything further out require a car or a rideshare.',
      },
      {
        question: 'Where do locals actually hang out?',
        answer:
          'East Nashville and Wedgewood-Houston, mostly, plus the neighborhood strips in Sylvan Park and Hillsboro Village. The common thread is that none of them are built around visitor traffic.',
      },
      {
        question: 'How long does it take to get across Nashville?',
        answer:
          'Downtown to East Nashville is five to ten minutes; to 12 South or Midtown, about ten; to Green Hills or the Opry, fifteen to twenty. Rush hour between 4pm and 6:30pm can add half again to any of those.',
      },
    ],
    relatedSlugs: [
      'where-to-stay-nashville',
      'best-restaurants-nashville',
      'nashville-first-time-visitors',
      'best-things-to-do-nashville',
    ],
    readingTimeMinutes: 9,
  },

  /* ------------------------------------------------------------------ *
   * 7. First-time visitors
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'nashville-first-time-visitors',
    title: 'Nashville for First-Time Visitors',
    summary:
      'What to book before you arrive, what to skip, and the practical things about Nashville that surprise people on a first trip.',
    shortAnswer:
      'Book your Ryman or Opry tickets and one weekend dinner reservation before anything else; those are the two things that sell out. Stay downtown or in the Gulch so you can walk to most of what you came for, and plan on rideshare rather than a rental car. Three days is the right length for a first visit, and spring or fall is the right season.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Orientation and planning guidance. Airport transfer times, transit options, and booking windows should be reconfirmed before publication.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-03-18',
    cluster: 'Trip Planning',
    intro: [
      'A first trip to Nashville is easy to get right and easy to get wrong in a specific way: people over-schedule, they stay too far out, and they leave the two things that require advance booking until they arrive.',
      'The city rewards a loose plan with two or three fixed points. Book the show, book one dinner, and leave the rest open, because the best hours here tend to be unplanned ones on Broadway or a walk across the river at dusk.',
      'What follows is the practical layer: when to come, how long to stay, what to book ahead, how to get around, and the handful of things that genuinely surprise first-time visitors.',
    ],
    sections: [
      {
        heading: 'When to come and how long to stay',
        body: [
          'April through early June and September through October are the good windows. Mild temperatures, long evenings, and outdoor seating that is actually pleasant. They are also the most expensive.',
          'July and August are hot and humid in a way that reorganizes a day. Plan outdoor activity before 11am or after 6pm and expect a short afternoon storm. Hotel rates soften to compensate.',
          'January and February are cheap and quiet. The music calendar keeps running, the museums are empty, and the Opry moves to the Ryman for part of the winter, which is worth timing a trip around.',
          'Three days is the right length for a first visit. Two works if you stay downtown. Four lets you add a day trip.',
        ],
        picks: [],
      },
      {
        heading: 'Book these before anything else',
        body: [
          'Tickets to a Ryman or Grand Ole Opry show. These sell out and the good seats go first. Buy when you have your dates, not when you arrive.',
          'One weekend dinner reservation, two to four weeks out. Having one good meal locked in removes the worst planning stress of the trip.',
          'A listening room round, if songwriter performances are why you are coming. The small rooms book out on a schedule and fill quickly.',
          'Your hotel, especially if a large event lands on your dates. Rates for the central districts reprice sharply around stadium shows and festivals.',
        ],
      },
      {
        heading: 'Getting in and getting around',
        body: [
          'BNA is about fifteen to twenty-five minutes from downtown by car depending on traffic. Rideshare and taxis pick up from a designated area; follow the signs rather than the app pin.',
          'You probably do not need a rental car. If you stay downtown or in the Gulch and use rideshare for the two or three trips outside the core, you will spend less than a rental plus downtown parking.',
          'Rent a car if you are staying in East Nashville or further out, doing a day trip, or travelling with kids and a lot of gear.',
          'Public transit exists but is not built around visitor routes. Do not plan an itinerary on it.',
          'Downtown rideshare pickup between 11pm and 2am on weekends is genuinely difficult. Walk a few blocks off Broadway before requesting.',
        ],
      },
      {
        heading: 'A workable first-visit shape',
        body: [
          'Day one: downtown. Country Music Hall of Fame in the late morning, lunch nearby, Broadway in the afternoon while the bands are audible, the Pedestrian Bridge at dusk, dinner, and a Ryman show if you have tickets.',
          'Day two: cross the river or go west. East Nashville for brunch, shopping, and a greenway walk, or Centennial Park and the Parthenon followed by Hillsboro Village and 12 South. Dinner in Germantown or East Nashville.',
          'Day three: whatever the first two days made you want more of. Music Row and RCA Studio B, a second museum, a longer walk at Radnor Lake, or a slow morning and an early flight.',
          'Resist adding a fourth thing to any day. The drive times will eat it.',
        ],
      },
      {
        heading: 'Things that surprise people',
        body: [
          'Broadway is free. All of it. The bars have no cover and the bands play for tips. First-time visitors routinely assume they need tickets for something that is open to the street.',
          'The Grand Ole Opry is a radio show, not a concert. Several artists, short sets, live ads read from the stage. It is good; it is just not what most people picture.',
          'Hot chicken heat levels are not a marketing exercise. The top levels are unpleasant for most people. Order down one.',
          'The city is more spread out than it looks. A destination twelve minutes away by car is not a walk.',
          'Weekends downtown are dominated by large groups. That is the texture of the place on a Saturday night, and no amount of planning changes it. Come Sunday through Wednesday if that is not what you want.',
        ],
      },
      {
        heading: 'Rough budget expectations',
        body: [
          'Central hotel rooms in shoulder season commonly land somewhere in the $200 to $350 range per night, rising well beyond that on event weekends. Check current pricing; this moves constantly.',
          'Museum admission for the major downtown sites is generally in the $25 to $35 per adult range.',
          'Dinner with a drink runs roughly $50 to $80 a head at a mid-range room. Lunch can be a third of that.',
          'Budget $20 to $40 a day in rideshare if you are staying central and leaving the core once or twice, more if you are based across the river.',
          'All of these are planning estimates rather than quotes. Confirm before you commit.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How many days do you need for a first trip to Nashville?',
        answer:
          'Three. Two is workable if you stay downtown and stick to the core. Four gives you room for a day trip or a slower pace.',
      },
      {
        question: 'What should I book before I arrive?',
        answer:
          'Show tickets first, then one weekend dinner, then your hotel if a large event falls on your dates. Everything else can be decided on the ground.',
      },
      {
        question: 'Do I need a rental car in Nashville?',
        answer:
          'Not if you stay in the downtown core and use rideshare for occasional trips out. Rent one if you are based in East Nashville or further out, or if you plan day trips.',
      },
      {
        question: 'What is the best time of year to visit Nashville?',
        answer:
          'April to early June and September to October for weather. January and February for cost and quiet. July and August are hot enough to reshape your daily schedule.',
      },
      {
        question: 'Is Nashville walkable?',
        answer:
          'The downtown core is. Downtown, the Gulch, and Germantown connect on foot. Everything else is a short drive, and the map consistently makes those distances look shorter than they feel.',
      },
    ],
    relatedSlugs: [
      'nashville-weekend-itinerary',
      'where-to-stay-nashville',
      'nashville-neighborhood-guide',
      'best-things-to-do-nashville',
    ],
    readingTimeMinutes: 11,
  },

  /* ------------------------------------------------------------------ *
   * 8. Weekend itinerary
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'nashville-weekend-itinerary',
    title: 'A Nashville Weekend Itinerary',
    summary:
      'A realistic Friday-to-Sunday plan built around walking distance, with alternatives for weather, budget, and group size.',
    shortAnswer:
      'Give Friday evening to downtown and Broadway, Saturday to one museum in the morning and a neighborhood in the afternoon, and Sunday to a slow brunch and one outdoor stop before you fly. Book a Friday or Saturday show and one dinner in advance; leave everything else loose. Three things a day is the ceiling once you account for drive times.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Itinerary structure and timing only. Individual venue hours and booking windows require separate verification.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-04-08',
    cluster: 'Trip Planning',
    intro: [
      'Two and a half days is the most common Nashville trip, and the most common mistake is treating it like five. The city spreads out further than the map suggests, and every additional stop costs a fifteen-minute drive plus parking.',
      'This itinerary is built around a simple constraint: three substantial things per day, arranged so you rarely cross the city twice. It assumes you are staying downtown or in the Gulch and using rideshare.',
      'Swap freely. The structure matters more than any specific stop, and the alternatives listed under each block cover most reasons you would want to change one.',
    ],
    sections: [
      {
        heading: 'Friday evening: arrive and stay downtown',
        body: [
          'Drop bags and eat early. A 5:30 or 6:00 table is easy to get and leaves the evening open, which is the opposite of how most people plan a first night.',
          'Walk Lower Broadway between roughly 6pm and 9pm. Move between bars rather than settling into one. Listen for a band you like, stay for a few songs, tip, move on.',
          'If you have show tickets, this is the night to use them, because Friday calendars are fuller than Sunday ones and you will still have Saturday intact.',
          'Alternative if you land late: skip Broadway entirely and get a drink in the Gulch or Germantown. Arriving into a Saturday-scale crowd at 11pm after a flight is not a good first impression of the city.',
        ],
        picks: [],
      },
      {
        heading: 'Saturday morning: one museum, done properly',
        body: [
          'The Country Music Hall of Fame opens mid-morning and takes about two hours if you read the exhibits. Going early beats both the crowd and the afternoon heat.',
          'Add RCA Studio B if the museum landed well. It is ticketed through the Hall of Fame and runs as a shuttle tour to Music Row.',
          'Eat lunch nearby rather than travelling for it. Downtown lunch is functional, and the point of this block is to keep the morning contained.',
          'Alternative for a rainy morning: the same plan, unchanged. This is the weather-proof block. Alternative if museums are not your thing: the farmers market in Germantown and a walk through Bicentennial Capitol Mall.',
        ],
      },
      {
        heading: 'Saturday afternoon: pick one neighborhood',
        body: [
          'Go east or go south. Do not attempt both. East Nashville gives you independent shops, records, and a greenway walk at Shelby Bottoms. 12 South plus Hillsboro Village gives you coffee, boutiques, and a walkable strip.',
          'Either one is a solid three to four hours including the ride there and back. Park once, walk, and let the afternoon be slow. This is the block people most often ruin by adding a third stop.',
          'If it is over 90 degrees, weight this block toward indoor shopping and shade, and push the greenway to Sunday morning.',
          'Alternative for a group that wants to sit down: Wedgewood-Houston breweries. Easy parking, room for eight, no reservation required.',
        ],
      },
      {
        heading: 'Saturday evening: dinner and a room',
        body: [
          'Dinner in Germantown or East Nashville, booked two to four weeks earlier. This is the meal worth planning; the rest of the weekend can be improvised.',
          'Then one of three endings. A listening room if you want to hear songwriters and can get in. A rooftop if you want the skyline and are willing to queue. Broadway if the group wants noise and volume.',
          'Do not try to do two of those three. The transitions will cost you an hour and the second one will be a letdown.',
          'Rideshare back after 11pm from downtown is slow and surging. Walking a few blocks off the strip before requesting solves most of it.',
        ],
      },
      {
        heading: 'Sunday: slow, outdoors, and out',
        body: [
          'Brunch is the Sunday institution here and the wait lists are real. Before 10am, or after 1pm, or accept an hour of standing.',
          'Then one outdoor thing on your way out: the Pedestrian Bridge, Centennial Park and the Parthenon, or the Shelby Bottoms greenway if you are already east. Any of them takes an hour.',
          'Sunday evening is quietly one of the best times to be out here if you are staying an extra night. Rooms are open, nothing has a line, and staff are not underwater.',
          'BNA is fifteen to twenty-five minutes from downtown. Build in more than you think for security on Sunday afternoons, which are heavy.',
        ],
      },
      {
        heading: 'Adjusting for budget and group size',
        body: [
          'On a tight budget: the entire Friday evening, the Sunday outdoor block, and the Broadway hours are free. Cut the museum and keep the show, or vice versa. Lunch at a meat-and-three instead of dinner out saves the most.',
          'With a group of six or more: shift dinners earlier, book further ahead, and use breweries and food halls for the unreserved meals. Splitting into two smaller tables at one restaurant is usually better than finding one room that seats everyone badly.',
          'With more time: add a fourth morning for Radnor Lake or a historic site outside the city, and treat it as a half day of its own.',
          'With less time: keep Friday evening and Saturday exactly as written and cut Sunday to brunch and the bridge.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is a weekend enough time in Nashville?',
        answer:
          'For a first visit, yes. Friday evening through Sunday afternoon covers downtown, one museum, one neighborhood, and one show. You will not see the outlying sites, and that is the correct trade.',
      },
      {
        question: 'What should I do on my first night in Nashville?',
        answer:
          'Eat early, then walk Broadway between about 6pm and 9pm while the bands are still audible. Save the ticketed show for a night you are not arriving on if your flight lands late.',
      },
      {
        question: 'How much walking is involved?',
        answer:
          'A fair amount within each block, and very little between them. The downtown core is walkable end to end in fifteen minutes; the neighborhood afternoons involve a ride there and walking once you arrive.',
      },
      {
        question: 'What if it rains all weekend?',
        answer:
          'The museums, the honky-tonks, and the indoor music venues carry the whole itinerary. Broadway is entirely indoors and free. Summer storms here usually pass within an hour.',
      },
    ],
    relatedSlugs: [
      'nashville-first-time-visitors',
      'best-things-to-do-nashville',
      'best-restaurants-nashville',
      'where-to-stay-nashville',
    ],
    readingTimeMinutes: 10,
  },

  /* ------------------------------------------------------------------ *
   * 9. Bachelorette
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'nashville-bachelorette-guide',
    title: 'Planning a Bachelorette Weekend in Nashville',
    summary:
      'The logistics of running a group weekend in Nashville: lead times, transport, lodging, budget, and being a decent neighbor.',
    shortAnswer:
      'Book lodging and any dinner reservations six to eight weeks out, keep the group under ten if you want to eat together, and plan on rideshare rather than one vehicle. Budget roughly $400 to $800 per person for two nights excluding flights, and check current pricing because event weekends move it sharply. The single biggest quality-of-life decision is staying somewhere you can walk home from.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Logistics guidance only. Short-term rental rules, party-vehicle regulations, and group booking policies change; verify current rules before publication.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-05-06',
    cluster: 'Trip Planning',
    intro: [
      'Nashville hosts a very large number of group weekends, and the city is set up for them. That means the infrastructure exists, and it also means you are one of many groups doing the same thing on the same Saturday. Planning around that is most of the work.',
      'The things that go wrong are almost always logistical rather than about what you do: a restaurant that cannot seat twelve, a rental with a noise complaint on night one, four people in one rideshare and six waiting, and a budget nobody agreed on in advance.',
      'This guide is about those problems. It covers timing, lodging, transport, money, and etiquette, which is what actually determines whether the weekend is good.',
    ],
    sections: [
      {
        heading: 'Timing and lead times',
        body: [
          'Book lodging six to eight weeks out for a spring or fall weekend, longer if your dates overlap a festival or a large stadium event. Peak season here runs April through early June and September through October.',
          'Restaurant reservations for a group of eight or more need two to four weeks and often a phone call, because online booking widgets frequently cap at six.',
          'If a listening room show is on the list, that is the earliest booking of all and it should anchor the schedule rather than fit into it.',
          'Consider a Thursday-to-Saturday or Sunday-to-Tuesday window instead of Friday-to-Sunday. Rates drop, waits shorten, and the city is materially more pleasant.',
        ],
        picks: [],
      },
      {
        heading: 'Group size changes everything',
        body: [
          'Under six: you can behave like a normal small group. Restaurants will seat you, one rideshare holds everyone, and you can improvise.',
          'Six to ten: the practical sweet spot for a bachelorette weekend. Still bookable at most restaurants with notice, still two rideshares, and a rental house is cost-effective.',
          'Over ten: everything becomes an operation. Dinners require set menus or venues built for volume, transport needs a booked vehicle, and someone has to be the person who counts heads. It can be done well, but it requires an organizer who accepts that role.',
          'Whatever the size, name one person as the point of contact for reservations and one shared thread for logistics. Two organizers means double bookings.',
        ],
      },
      {
        heading: 'Where to stay',
        body: [
          'A short-term rental in East Nashville or near downtown is the usual choice for groups of six or more, and it is generally cheaper per head than hotel rooms while giving you a shared space for the morning.',
          'Book through a platform that shows a permit number. Nashville has revised its short-term rental rules repeatedly and unpermitted listings do get cancelled, sometimes close to the date.',
          'Hotel rooms in the Gulch or downtown cost more but remove the entire category of problems around cleaning fees, house rules, and neighbors. For a two-night trip with a group under eight, the math is closer than people assume.',
          'The most useful criterion is whether you can walk home. A place within fifteen minutes of where you will be at midnight saves money, time, and the recurring argument about who is calling the car.',
        ],
      },
      {
        heading: 'Getting around',
        body: [
          'Rideshare is the default and it works well until about 11pm on a weekend, when downtown pickup becomes slow and expensive. Walking three or four blocks off Broadway before requesting is the standard fix.',
          'For a group over eight, book a van or a driver in advance for the times you know you need to move together, particularly dinner and any show with a start time. Improvising transport for twelve people at 7:15 does not work.',
          'The pedal taverns, tractors, and open party vehicles on Broadway are an activity, not transport. They move slowly, they are weather-dependent, and several have restrictions on open containers and on where they can operate. Confirm the current rules with the operator when you book.',
          'Nobody drives. That is not a moral point, it is a logistics one: parking downtown is expensive and enforcement is active.',
        ],
      },
      {
        heading: 'Budget, and agreeing on it early',
        body: [
          'For a two-night weekend excluding flights, expect roughly $400 to $800 per person, depending heavily on lodging choice and how many meals are sit-down. Check current pricing; event weekends push this well above the range.',
          'Lodging is the biggest variable and the one where group size helps most. Dinners are the second. Activities are usually smaller than people expect, because Broadway is free.',
          'Have the money conversation before booking, not after. Circulate an estimated per-person total including lodging, one group dinner, transport, and a buffer, and let people opt into the optional items separately.',
          'Collect money up front for anything the organizer pays for personally. Chasing eight people for $60 after the fact is the most reliable way to sour a weekend.',
          'Assume automatic gratuity on large tables and factor it in rather than discovering it at the end.',
        ],
      },
      {
        heading: 'Being a good neighbor, and other etiquette',
        body: [
          'Short-term rentals sit on residential streets with people who live there. Quiet hours are usually written into the house rules and sometimes into local ordinance. Noise complaints can end a stay, and hosts do enforce them.',
          'Keep the noise inside after 10pm, do not use the street or the yard as a gathering space late at night, and park where the listing tells you to.',
          'On Broadway, tip the bands. They are paid almost entirely from the bucket, and a group of ten that watches four songs and leaves nothing is noticed.',
          'Book activities that do not depend on the whole group agreeing in the moment. A morning where three people sleep in and the rest walk to coffee is fine; a plan that collapses if two people are late is not.',
          'Build in downtime. Two full days of scheduled activity with a late night in the middle is how groups end up irritable by Sunday morning.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How far in advance should we book a bachelorette weekend in Nashville?',
        answer:
          'Six to eight weeks for lodging in spring or fall, and two to four weeks for group dinner reservations. If a small listening-room show is part of the plan, book that first because it has the tightest window.',
      },
      {
        question: 'How much does a Nashville bachelorette weekend cost?',
        answer:
          'Roughly $400 to $800 per person for two nights excluding flights, driven mostly by lodging and how many sit-down dinners you plan. Event weekends push it higher. Treat that as a planning range and check current pricing.',
      },
      {
        question: 'Should we stay downtown or get a house in East Nashville?',
        answer:
          'A house is usually cheaper per person at six or more and gives you a shared space. Downtown or the Gulch costs more but lets you walk home, which removes most of the late-night logistics. Under eight people for two nights, the totals are closer than they look.',
      },
      {
        question: 'Are pedal taverns and party buses worth it?',
        answer:
          'They are an activity rather than a way to get anywhere. They move at walking pace, they are weather-dependent, and rules on open containers and routes vary by operator and change. Confirm current terms when you book.',
      },
      {
        question: 'What is the best size for the group?',
        answer:
          'Six to ten. Below six you can improvise; above ten, every dinner, ride, and activity needs to be booked as a block and someone has to manage it full time.',
      },
    ],
    relatedSlugs: [
      'best-bars-rooftops-nashville',
      'where-to-stay-nashville',
      'nashville-weekend-itinerary',
      'best-restaurants-nashville',
    ],
    readingTimeMinutes: 11,
  },

  /* ------------------------------------------------------------------ *
   * 10. With kids
   * ------------------------------------------------------------------ */
  {
    kind: 'guide',
    slug: 'nashville-with-kids',
    title: 'Nashville with Kids',
    summary:
      'Which parts of Nashville work with children, which do not, and how to plan a day around naps, heat, and early dinners.',
    shortAnswer:
      'Base yourself in Green Hills, Sylvan Park, or a quieter edge of Germantown rather than downtown, and rent a car. Centennial Park and the Parthenon, the greenways, and the Adventure Science Center anchor most family days, with the Country Music Hall of Fame working well for kids over about eight. Eat dinner before 6pm and treat Broadway as a daytime walk-through rather than an evening plan.',
    dataStatus: 'unverified',
    dateChecked: '2026-08-01',
    dateUpdated: '2026-08-01',
    sourceNote:
      'Family logistics and public-space guidance. Age policies, stroller rules, and admission details vary by site and must be confirmed.',
    placement: 'editorial',
    authorSlug: 'editorial-desk',
    editorSlug: 'managing-editor',
    datePublished: '2026-06-10',
    cluster: 'Things to Do',
    intro: [
      'Nashville is a better family destination than its weekend reputation suggests, but the two versions of the city barely overlap. The one that shows up in photographs is loud, late, and built around bars. The one that works with a six-year-old is parks, museums, greenways, and early dinners.',
      'The main planning constraints are heat, distance, and evening noise. Summer afternoons here are genuinely oppressive for small children, most attractions are a drive apart, and the central districts get loud at exactly the hour you want everyone asleep.',
      'This guide is organized around those constraints: where to stay, what actually holds a child\'s attention, how to structure a day, and where not to bother.',
    ],
    sections: [
      {
        heading: 'Where to stay with kids',
        body: [
          'Not on Broadway. The blocks nearest the strip have amplified music running until the early hours, and no amount of asking for a high floor fully solves it.',
          'Green Hills is the easiest family base: quiet, plenty of free parking, shopping and everyday errands nearby, and fifteen to twenty minutes from downtown outside rush hour.',
          'Sylvan Park is the other good option, with greenway access, easy street parking, and almost no visitor traffic. It is residential, so lodging skews toward rentals.',
          'If you want to be central, the quieter edges of Germantown work. It is a five-minute drive to downtown and genuinely calm at night.',
          'Rent a car. With children, the rideshare-only approach that works for couples downtown does not, particularly once car seats enter the picture.',
        ],
        picks: [],
      },
      {
        heading: 'What holds their attention',
        body: [
          'Centennial Park and the Parthenon. The full-scale replica is startling at any age, the grounds are open and shaded, and there is a lake and space to run. Free outside the building itself.',
          'The Adventure Science Center south of downtown is the standard rainy-day answer for younger children, with hands-on exhibits and a planetarium.',
          'The Nashville Zoo is a half day on its own and is genuinely one of the better regional zoos. It is south of the city, so treat it as a self-contained trip.',
          'Shelby Bottoms and the other greenways are flat, paved, and stroller- and bike-friendly. This is the best low-effort outdoor block in the city.',
          'The Country Music Hall of Fame works for kids from about eight upward, especially if they play an instrument. Below that, an hour is the realistic ceiling.',
        ],
      },
      {
        heading: 'Structuring the day around heat and naps',
        body: [
          'From June through August, do outdoor things before 11am. The middle of the day is for indoor attractions, and the parks become usable again after about 6pm.',
          'Afternoon thunderstorms are common in summer and usually short. Have one indoor option held in reserve rather than rebuilding the day when one arrives.',
          'One major activity per half day is the sustainable pace. Two plus a drive is where things fall apart.',
          'Eat dinner at 5:00 or 5:30. Kitchens are quiet, service is fast, and you avoid the reservation problem entirely. Nashville restaurants are broadly welcoming to children at that hour and much less so at 8pm.',
        ],
      },
      {
        heading: 'Music with children',
        body: [
          'Broadway is legal to walk down at any age and most honky-tonks allow minors during daytime hours, but policies vary by bar and by time of day and many go 21-and-over in the evening. Confirm at the door rather than assuming.',
          'The practical version is a late-morning or early-afternoon walk down the strip. The bands are playing, the crowd is thin, and you can leave in twenty minutes.',
          'The Grand Ole Opry is a good family show: multiple short sets, an early-evening start on many nights, and a format that does not demand sustained attention. Check age and seating policies when booking.',
          'Ryman tours run during the day and are more interesting to children than an evening concert would be.',
        ],
      },
      {
        heading: 'What to skip',
        body: [
          'Downtown after dark with young children. It is crowded, loud, and largely a bar district by 8pm.',
          'Hot chicken, unless you are ordering the mildest option and know your child. The heat is not scaled for children even at the lower levels.',
          'Long drives to a single outlying attraction on a short trip. The car time will cost more than the stop returns, and everyone will be worse for it.',
          'Trying to combine a family day with an evening out. Book a sitter through a licensed local agency if you want an adult night, and plan it as a separate thing rather than an extension of the day.',
        ],
      },
      {
        heading: 'Practical costs and logistics',
        body: [
          'Family admission to the larger attractions adds up quickly. Expect roughly $20 to $35 per adult with reduced child rates at most sites, but check current pricing and age cutoffs.',
          'The free options carry a lot of weight here: the parks, the greenways, the Pedestrian Bridge, the farmers market, and walking Broadway in daylight.',
          'Downtown parking with a car full of gear is a recurring expense. Another reason to base yourself outside the core.',
          'Strollers are fine on the greenways, in the parks, and in the museums, and awkward on a crowded Broadway sidewalk. A carrier is easier for the downtown block.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is Nashville a good place to visit with kids?',
        answer:
          'Yes, if you plan around the family version of the city rather than the weekend one. The parks, greenways, science center, and zoo carry several days, and the downtown attractions work in daylight.',
      },
      {
        question: 'Can children go into the Broadway honky-tonks?',
        answer:
          'Many allow minors during daytime hours and switch to 21-and-over in the evening, but it varies by bar and by night. Walk the strip in the late morning or early afternoon and check at the door.',
      },
      {
        question: 'Where should a family stay in Nashville?',
        answer:
          'Green Hills or Sylvan Park for quiet and easy parking, or the calmer edges of Germantown if you want to be central. Avoid the blocks nearest Broadway, which stay loud late.',
      },
      {
        question: 'What is there to do with kids when it is hot?',
        answer:
          'Move outdoor plans to before 11am and after 6pm, and use the science center, the downtown museums, or the zoo\'s indoor areas in the middle of the day. Afternoon storms in summer are common and usually short.',
      },
      {
        question: 'Do we need a car?',
        answer:
          'With children, yes. Car seats make rideshare impractical, the family-friendly attractions are spread across the metro area, and parking outside downtown is easy and mostly free.',
      },
    ],
    relatedSlugs: [
      'best-things-to-do-nashville',
      'where-to-stay-nashville',
      'nashville-neighborhood-guide',
      'nashville-first-time-visitors',
    ],
    readingTimeMinutes: 10,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function guidesByCluster(cluster: GuideCluster): Guide[] {
  return guides.filter((g) => g.cluster === cluster);
}

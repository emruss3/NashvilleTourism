import type { Neighborhood } from '../types';

/**
 * Neighborhood orientation. Geography, character, and getting-around notes are
 * general local knowledge rather than claims about specific businesses.
 * Parking and transit specifics still carry a check date.
 */
export const neighborhoods: Neighborhood[] = [
  {
    slug: 'downtown-broadway',
    name: 'Downtown / Broadway',
    summary:
      'The dense core along Lower Broadway, where the honky-tonks, the Ryman, and most of the big hotels sit within a few blocks of each other.',
    overview: [
      'Lower Broadway is the strip most visitors picture: multi-floor bars with live bands running from late morning until close, all of them free to enter. It is loud, crowded on weekends, and walkable end to end in about fifteen minutes.',
      'The blocks just south and east hold the Country Music Hall of Fame, the arena, and the convention center, so a lot of trips end up anchored here whether or not you plan it that way.',
      'Stay downtown if you want to walk everywhere and do not mind noise. If you want to sleep, look at the quieter edges near Germantown or the Gulch instead.',
    ],
    bestFor: ['First-time visitors', 'Groups', 'Walking to nightlife', 'Short trips'],
    knownFor: ['Honky-tonks', 'Live music', 'Hotels', 'Museums'],
    gettingThere:
      'Roughly 15-25 minutes from BNA by car depending on traffic. Most of the district is walkable once you arrive.',
    parkingNote:
      'Garages are the practical option; street parking is limited and enforced. Rates rise sharply on event nights.',
    halfDayItinerary: [
      { time: 'Late morning', activity: 'Country Music Hall of Fame', note: 'Budget two hours if you read the exhibits.' },
      { time: 'Lunch', activity: 'Meat-and-three or barbecue nearby', note: 'Lines peak 12-1pm.' },
      { time: 'Afternoon', activity: 'Walk Lower Broadway and the Pedestrian Bridge', note: 'The bridge has the best skyline view in the city.' },
      { time: 'Evening', activity: 'Ryman show or a honky-tonk crawl', note: 'Check the Ryman calendar before you commit the night.' },
    ],
    mapQuery: 'Lower Broadway, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: '12-south',
    name: '12 South',
    summary:
      'A walkable half-mile of restaurants, coffee shops, and boutiques in a residential pocket south of downtown.',
    overview: [
      '12 South is a compact commercial strip running through a neighborhood of bungalows. The appeal is that you can park once and cover the whole thing on foot in an afternoon.',
      'It draws a steady weekend crowd, and the wait at the better-known spots reflects that. Weekday mornings are calmer.',
      'It is a good base if you want a quieter stay with easy access to downtown, which is about ten minutes by car.',
    ],
    bestFor: ['Couples', 'Coffee and shopping', 'Walkable afternoons', 'Brunch'],
    knownFor: ['Boutiques', 'Coffee', 'Brunch', 'Murals'],
    gettingThere: 'About 10 minutes by car from downtown. Rideshare is the simplest option.',
    parkingNote: 'Street parking only, and it fills on weekends. Respect the residential restrictions on side streets.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Coffee on the strip', note: 'Arrive before 10am on weekends to avoid the wait.' },
      { time: 'Late morning', activity: 'Browse the boutiques', note: 'Most of the retail sits in a four-block stretch.' },
      { time: 'Lunch', activity: 'Patio lunch on 12th Ave S', note: 'Outdoor seating is the draw in spring and fall.' },
      { time: 'Afternoon', activity: 'Walk to Sevier Park', note: 'Shaded and quiet, good reset before dinner.' },
    ],
    mapQuery: '12 South, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'the-gulch',
    name: 'The Gulch',
    summary:
      'A dense, modern district of mid-rise buildings between downtown and Midtown, with hotels and restaurants at street level.',
    overview: [
      'The Gulch is the most recently built part of central Nashville, which shows: it is tidy, vertical, and easy to walk. It sits close enough to downtown to walk there in about fifteen minutes.',
      'It carries a well-known mural and a concentration of newer hotels, so it is a common landing spot for weekend groups who want to be near the action without being on Broadway.',
      'Prices skew higher here than in East Nashville or Sylvan Park.',
    ],
    bestFor: ['Groups', 'Hotel stays', 'Walkability', 'Nightlife without Broadway'],
    knownFor: ['Hotels', 'Restaurants', 'Bluegrass at the Station Inn', 'Murals'],
    gettingThere: 'Walking distance from downtown, roughly 15 minutes. 15-20 minutes from BNA by car.',
    parkingNote: 'Garage parking under most buildings, usually paid. Validation varies by business.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Coffee and a walk through the district', note: 'Compact enough to cover in 30 minutes.' },
      { time: 'Lunch', activity: 'Sit-down lunch in the Gulch', note: 'Reservations help on weekends.' },
      { time: 'Afternoon', activity: 'Walk to downtown via the Gulch connector', note: 'About 15 minutes on foot.' },
      { time: 'Evening', activity: 'Bluegrass at the Station Inn', note: 'Cash bar, arrive early for a seat.' },
    ],
    mapQuery: 'The Gulch, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'east-nashville',
    name: 'East Nashville',
    summary:
      'Across the river from downtown: independent restaurants, dive bars, and vintage shops spread across several walkable pockets.',
    overview: [
      'East Nashville is where a lot of the city\'s independent food and drink has landed. It is not one strip but several clusters, so plan on driving between them.',
      'The crowd skews local and the rooms are smaller. It is the part of town people recommend when a visitor asks where Nashvillians actually eat.',
      'Five to ten minutes from downtown by car, but not practical to walk from there.',
    ],
    bestFor: ['Food-focused trips', 'Repeat visitors', 'Bars', 'Brunch'],
    knownFor: ['Independent restaurants', 'Dive bars', 'Vintage shops', 'Live music'],
    gettingThere: 'About 5-10 minutes by car from downtown across the Cumberland.',
    parkingNote: 'Mostly free street parking, tighter around the busiest blocks on weekend nights.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Brunch in the Five Points area', note: 'Expect a wait after 10am on weekends.' },
      { time: 'Late morning', activity: 'Vintage and record shopping', note: 'Several shops within a few blocks.' },
      { time: 'Afternoon', activity: 'Shelby Bottoms Greenway', note: 'Flat, shaded walking and biking along the river.' },
      { time: 'Evening', activity: 'Dinner and a neighborhood bar', note: 'Smaller rooms; book dinner ahead.' },
    ],
    mapQuery: 'East Nashville, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'germantown',
    name: 'Germantown',
    summary:
      'A small historic district just north of downtown with brick streets, a concentrated restaurant scene, and the farmers market.',
    overview: [
      'Germantown is compact, quiet, and one of the better dinner neighborhoods in the city. Most of it fits in about six blocks.',
      'It sits next to the Nashville Farmers\' Market and the state capitol grounds, and it is walkable to downtown in roughly twenty minutes.',
      'Good choice if you want to eat well and sleep somewhere calm without leaving the center of the city.',
    ],
    bestFor: ['Dinner', 'Couples', 'Quieter downtown-adjacent stays', 'Walking'],
    knownFor: ['Restaurants', 'Historic architecture', 'Farmers market', 'Baseball'],
    gettingThere: 'About 20 minutes on foot from downtown, or 5 minutes by car.',
    parkingNote: 'Street parking plus a few small lots. Fills up on game nights at the nearby ballpark.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Nashville Farmers\' Market', note: 'Food hall plus produce sheds.' },
      { time: 'Late morning', activity: 'Walk the historic blocks', note: 'Late 1800s brick housing stock.' },
      { time: 'Afternoon', activity: 'Bicentennial Capitol Mall State Park', note: 'Free, and a good overview of state history.' },
      { time: 'Evening', activity: 'Dinner in Germantown', note: 'This is the neighborhood\'s strength. Reserve ahead.' },
    ],
    mapQuery: 'Germantown, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'wedgewood-houston',
    name: 'Wedgewood-Houston',
    summary:
      'A former industrial pocket south of downtown, now holding galleries, breweries, and studios in converted warehouses.',
    overview: [
      'Wedgewood-Houston, usually shortened to WeHo, is the arts district. Galleries and studios occupy old industrial buildings, and the scene concentrates around monthly art crawls.',
      'It is less polished than the Gulch and less crowded than Broadway. Come for galleries, breweries, and a quieter evening.',
      'About ten minutes from downtown by car.',
    ],
    bestFor: ['Art', 'Breweries', 'Avoiding crowds', 'Repeat visitors'],
    knownFor: ['Galleries', 'Breweries', 'Art crawls', 'Studios'],
    gettingThere: 'Roughly 10 minutes by car from downtown.',
    parkingNote: 'Free street and lot parking most days. Art crawl nights are the exception.',
    halfDayItinerary: [
      { time: 'Afternoon', activity: 'Gallery walk', note: 'Check hours; many galleries open Thursday to Saturday.' },
      { time: 'Late afternoon', activity: 'Brewery taproom', note: 'Several within walking distance of each other.' },
      { time: 'Evening', activity: 'Dinner in the district', note: 'Smaller selection than Germantown, but less busy.' },
    ],
    mapQuery: 'Wedgewood-Houston, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'midtown',
    name: 'Midtown',
    summary:
      'Between downtown and Vanderbilt, holding Music Row, a college-heavy bar scene, and several of the original hot chicken counters.',
    overview: [
      'Midtown runs along Broadway west of downtown and takes in Music Row, where the publishing houses and studios sit in converted houses.',
      'The bar scene here skews younger because of Vanderbilt. It is also where several well-known hot chicken counters operate.',
      'Convenient base if you want to be near both downtown and the west side without paying downtown hotel rates.',
    ],
    bestFor: ['Music industry history', 'Hot chicken', 'Younger nightlife', 'Value stays'],
    knownFor: ['Music Row', 'Hot chicken', 'Vanderbilt', 'Bars'],
    gettingThere: 'About 5-10 minutes by car from downtown; walkable in around 25 minutes.',
    parkingNote: 'Mixed street and garage parking. Vanderbilt event nights tighten it considerably.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'RCA Studio B tour', note: 'Ticketed through the Country Music Hall of Fame.' },
      { time: 'Lunch', activity: 'Hot chicken', note: 'Order one heat level below what you think you want.' },
      { time: 'Afternoon', activity: 'Walk Music Row', note: 'Mostly working offices, not attractions. Good context.' },
      { time: 'Evening', activity: 'Bars around Division and Demonbreun', note: 'Busiest Thursday through Saturday.' },
    ],
    mapQuery: 'Midtown, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'hillsboro-village',
    name: 'Hillsboro Village',
    summary:
      'A short, walkable commercial strip next to Vanderbilt and Belmont, with long-running restaurants and an independent theater.',
    overview: [
      'Hillsboro Village is two blocks of storefronts wedged between two universities. It has a settled, everyday feel that the newer districts do not.',
      'Several businesses here have operated for decades, which makes it a useful stop if you want somewhere that predates the recent building boom.',
      'Easy to combine with 12 South, which is a few minutes away.',
    ],
    bestFor: ['Coffee', 'Low-key afternoons', 'Students and academics', 'Independent film'],
    knownFor: ['Independent theater', 'Long-running restaurants', 'Bookshops', 'Coffee'],
    gettingThere: 'About 10 minutes by car from downtown.',
    parkingNote: 'Street parking and a small garage. Tightest during Vanderbilt terms.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Coffee and a bookshop', note: 'The strip is short; 30 minutes covers it.' },
      { time: 'Lunch', activity: 'Lunch in the Village', note: 'Several long-running rooms here.' },
      { time: 'Afternoon', activity: 'Walk to Centennial Park and the Parthenon', note: 'About 15 minutes on foot.' },
    ],
    mapQuery: 'Hillsboro Village, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'sylvan-park',
    name: 'Sylvan Park',
    summary:
      'A residential west-side neighborhood with a small restaurant row, greenway access, and almost no tourist traffic.',
    overview: [
      'Sylvan Park is mostly houses, with a compact commercial stretch along Murphy Road and 46th Avenue. Visitors rarely end up here by accident.',
      'It is worth the drive if you want a meal without a wait and a walk that is not a tourist route. Richland Creek Greenway runs through it.',
      'About fifteen minutes from downtown.',
    ],
    bestFor: ['Locals', 'Quiet meals', 'Running and walking', 'Longer stays'],
    knownFor: ['Neighborhood restaurants', 'Greenway', 'Residential streets', 'Parks'],
    gettingThere: 'Roughly 15 minutes by car from downtown. A car is effectively required.',
    parkingNote: 'Free street parking, generally easy.',
    halfDayItinerary: [
      { time: 'Morning', activity: 'Richland Creek Greenway', note: 'Flat and shaded.' },
      { time: 'Lunch', activity: 'Lunch on the 46th Ave strip', note: 'Small, mostly independent rooms.' },
      { time: 'Afternoon', activity: 'Drive to Centennial Park', note: 'About 8 minutes east.' },
    ],
    mapQuery: 'Sylvan Park, Nashville, TN',
    dateChecked: '2026-08-01',
  },
  {
    slug: 'green-hills',
    name: 'Green Hills',
    summary:
      'An affluent area south of the city known for shopping and for the Bluebird Cafe songwriter rounds.',
    overview: [
      'Green Hills is primarily a shopping and residential district, anchored by a large mall and surrounded by established housing.',
      'For visitors the main draw is the Bluebird Cafe, a small room where songwriters perform in the round. It seats very few people and sells out well in advance.',
      'Traffic on Hillsboro Pike is the main friction. Allow more time than the distance suggests.',
    ],
    bestFor: ['Shopping', 'Songwriter shows', 'Quiet stays', 'Families'],
    knownFor: ['Bluebird Cafe', 'Shopping', 'Residential streets', 'Restaurants'],
    gettingThere: 'About 15-20 minutes by car from downtown, longer at rush hour.',
    parkingNote: 'Ample lot and garage parking, most of it free.',
    halfDayItinerary: [
      { time: 'Afternoon', activity: 'Shopping on Hillsboro Pike', note: 'The mall anchors the district.' },
      { time: 'Early evening', activity: 'Dinner nearby', note: 'Reserve; the area gets busy at 6pm.' },
      { time: 'Evening', activity: 'Bluebird Cafe round', note: 'Reservations open in advance and go quickly. Plan ahead.' },
    ],
    mapQuery: 'Green Hills, Nashville, TN',
    dateChecked: '2026-08-01',
  },
];

export function getNeighborhood(slug: string): Neighborhood | undefined {
  return neighborhoods.find((n) => n.slug === slug);
}

export function neighborhoodName(slug: string): string {
  return getNeighborhood(slug)?.name ?? slug;
}

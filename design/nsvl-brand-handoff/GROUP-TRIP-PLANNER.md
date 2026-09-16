# Group-optimized trip planner — governing specification

This replaces earlier descriptions of Plan as primarily a saved itinerary list. The primary product is a guided planner that recommends and schedules an itinerary around the party. Saving, editing and sharing support that product.

## Page and flow

### 1. Landing / Your group
H1: **One good plan changes everything.**
Support: **Tell us who is coming. We’ll build the trip around you.**
A short editorial group-photo treatment accompanies the form on desktop. On mobile the form takes priority; do not place a tall photo before it.

Show a three-step indicator: Your group / Your style / Your plan.
First choose the occasion: Bachelorette, Bachelor, Friends, Family, Couples, Corporate retreat, or Other. Then collect headcount, age ranges/mixed-age composition, dates and arrival/departure windows. Ask an age band rather than birth dates. Support undecided dates and do not assume the group is all the same age.

Next collect lodging location or intended neighborhood, transportation preferences, and budget per person with clear scope: activities/dining only or including accommodation. Let users specify a total group budget instead, showing the conversion without losing the original input. Room count/configuration belongs in a separate lodging question when needed.

### 2. Your style — conditional, concise questions
| Group type | Relevant follow-ups |
|---|---|
| Bachelorette / bachelor | Celebration style, nightlife interest, private experiences, brunch, photo opportunities, late-night preference, alcohol-free options, honoree must-dos. Do not infer these preferences from the occasion alone. |
| Corporate retreat | Work/social balance, immovable meetings, meeting-space needs, team activity preferences, dinner/private-room capacity, expense budget, accessibility and dietary requirements. |
| Family | Adult/child counts and age bands, child-friendly needs, rest/nap windows, stroller/accessibility preferences, earlier evenings. |
| Friends / couples / other | Interests, food preferences, energy/pace, must-dos, avoid list, start/end times and transport. |

Universal fields: food restrictions, accessibility requirements, interests, desired pace, must-do stops and fixed commitments. Use optional chips plus a short free-text field. Do not demand names, contact details or individual profiles to create an initial plan. Specific stated preferences override occasion-based defaults.

Primary CTA: **Build our trip**. Explain that the draft uses the supplied preferences and that reservations are separate.

### 3. Your plan — optimized draft
Desktop: compact editable group summary at left, day-by-day itinerary in the center, contextual alternatives and explanation at right. Mobile: group summary collapsed above a day selector, chronological stops, Add/Swap actions and an optional map view. Display a concrete recap such as “Bachelorette · 12 people · Ages 25–34 · Balanced pace”; this is illustrative until replaced by input.

Each stop exposes time/duration, location, group-fit reason, travel from previous stop, estimated per-person/group cost with basis, and availability state. Short explanation examples: “Fits your group size,” “Near your stay,” “Matches your food preferences.” Only claim a fit supported by data; otherwise say the check is outstanding.

Use **Keep this stop** to lock an item, **Swap** to see feasible alternatives, **Make it more relaxed**, **Lower the budget**, and **Rebuild this day** for controlled changes. Preserve locked reservations and commitments. Before applying a change, show effects on cost, travel and schedule. Do not silently change dates, party size, budget or a locked activity.

At the end show estimated trip cost, what is included/excluded, unscheduled must-dos, constraints needing attention, and booking actions. Share/vote features require a real durable backend; guest local drafts may work without accounts. Reservation status remains separate from itinerary status.

## What optimized means
The planner must do more than generate plausible prose. Assemble candidates from actual venue/event/restaurant/tour/hotel records and check constraints before presenting a schedule.

**Hard constraints:** trip dates and windows; fixed commitments; actual opening/operating times; age restrictions; required accessibility; stated dietary requirements where confirmed; provider group capacity; bookable start times/durations; transit plus buffers; hard budget ceiling when explicitly selected. Unknown capacity, hours, accessibility or inventory cannot be treated as verified feasible. Offer a tentative suggestion with an explicit check needed, or exclude it when the requirement is essential. Never infer a booking for 12 from inventory for two, or split a party without consent.

**Soft preferences:** occasion, interests, desired atmosphere, pace, cost preference, variety, neighborhood proximity and useful downtime. Rank feasible combinations by preference fit, then reduce unnecessary cross-city travel and budget mismatch. Avoid repeatedly suggesting the same activity type. No numeric “98% match” without an actual defined, tested scoring system.

Schedule geographically compatible stops within real windows, accounting for meals, downtime, transport and existing reservations. Revalidate changing inventory before booking. If no plan satisfies all hard constraints, explain the conflict and offer specific changes; do not silently relax constraints. If transit estimates are unavailable, identify estimates and allow extra buffers rather than present exact travel times.

Generated language can explain and summarize the plan. Eligibility, times, availability and totals must come from validated data and explicit calculations. A conversational model alone must not invent provider facts.

## Cost and availability
Show currency, per-person and whole-group basis, adults/children where pricing differs, taxes/fees/tips/transport inclusions, estimate freshness and known omissions. If only some stops are priced, label the total “Known costs” and identify unpriced items; do not claim compliance with a hard all-in budget.

Use clear states: Suggested / Availability checked [time] / Inquiry needed / Booked [evidence]. Outbound click is not a booking. Private dining, meeting rooms and large groups may need a request rather than instant checkout. On provider outage, preserve the draft and mark affected checks unavailable.

## Data contract for implementation
Group profile: occasion; headcount; age-band counts; dates/windows; lodging location; transport; budget value/scope/currency; interests; dietary/accessibility needs; pace; must-dos; fixed/locked items; optional occasion-specific answers.
Candidate records: stable entity/provider IDs; location; source/review time; operating windows; activity duration; relevant party limits; age/accessibility/dietary facts; group booking mode; price basis; terms; available options; booking/inquiry link.
Plan record: inputs and version; day/stop ordering; explicit time zones; travel/buffers; feasibility status; reasons; costs and omissions; unresolved checks; locked stops; source IDs and freshness. Share visibility must be explicit.

## Acceptance examples
- A 12-person celebration cannot receive a “confirmed group fit” based on a four-seat booking result. Offer a real large-group option or an inquiry.
- A corporate retreat with 9am–3pm meetings keeps those blocks fixed and finds a feasible group dinner and evening activity.
- A family with children cannot receive age-restricted nightlife as an eligible shared activity.
- Swapping a dinner retains a locked concert, then checks location, travel buffer and opening time again.
- A budget reduction preserves locked commitments, labels unpriced items, and explains if the revised ceiling cannot be met.
- With missing live availability, the draft remains useful but unverified stops never look reserved.
- Changing group type changes follow-up questions and ranking inputs; explicitly selected preferences remain editable.

The visual concept is an art-direction example. Implementation must not claim the optimizer exists until these behaviors work against the actual data/integrations.

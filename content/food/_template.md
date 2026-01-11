---
# Required
name: "TODO: Place name"
type: "pizza"            # pizza | bakery | restaurant
date: "YYYY-MM-DD"

# Location (used for list, filters, map)
location: "TODO: Human-readable location (e.g. Upper West Side, NYC)"
location_normalized: "TODO: Canonical location string"
lat: TODO                # decimal latitude, or null
lng: TODO                # decimal longitude, or null

# Scoring (optional but recommended)
score: TODO              # integer or float, your overall score
max_score: TODO          # optional, e.g. 43 or 50

# Cost / logistics (optional)
price: "$"               # $, $$, $$$, or null
address: "TODO"          # optional
website: "TODO"          # optional
google_maps_url: "TODO"  # optional

# Food-specific (optional, flexible)
item_ordered: "TODO"     # pizza name / pastry / dish
toppings: "TODO"         # optional
dietary: ["gluten-free"] # optional array

# Metadata
tags: ["nyc"]             # optional
draft: false
---

<!--
Writing notes (delete later if you want):
- Write this like you’re telling a friend where you ate.
- No need to justify the score.
- It’s okay to be subjective and specific.
-->

TODO: Your review text starts here.

You can write one paragraph or many.
You don’t need headings unless they help *you*.

If you want to mention context (who you were with, what you expected, why you went),
that’s good. If not, skip it.

If you want to come back and edit later, that’s fine too.

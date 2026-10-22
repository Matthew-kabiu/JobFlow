# Search UI

## Direction

Search-first, restrained product UI built on the existing React, Tailwind 3,
Radix/shadcn primitives, and Lucide icon family. The visual system uses cool
neutral surfaces and one orange accent. Controls use a 10px radius and main
surfaces 16px. No new dependencies were installed for this iteration.

The default view has the search hero followed by the full **Job filters** form.
The discovery shortcuts and explanatory marketing section were removed following
owner feedback. Results use bounded content widths, concise job cards, a compact
filter sidebar, and a full detail pane on wide screens. Smaller screens use
accessible filter/job-detail sheets.

## Theme and controls

- Appearance offers Light, Dark, and System using the already-installed
  `next-themes` provider. Selection is stored as the UI preference `jobflow-theme`.
- All visible select controls use the shared `AppSelect` wrapper around existing
  Radix Select primitives, with themed surfaces, selected indicators, focus states,
  type-ahead, scrolling, and keyboard controls.
- Currency uses a searchable Popover/Command picker. Users can search ISO code
  or currency name. The backend supplies the free, cached catalogue; common
  currencies remain available while loading, and a built-in list handles outages.
- Currency selection does not convert salary values. Original currency/pay period
  information stays attached to each listing.
- Popovers use layer 60, sheets use the existing Radix layer 50, and the header
  uses layer 20. Reduced motion is respected.

## Reset and information preservation

Reset filters clears query, city, country, category, type, salary bounds,
currency/pay-period settings, exclusions, sort, page, selection, results and error
state. It aborts the browser's pending search and ignores a late response, returning
to the default filter view without issuing an extra broad search. Theme preference
is independent of search/reset state.

Source refresh times, provider status/messages, limited-pool explanations, and
remote-work caveats remain in the labelled Source coverage disclosure. The full
description and original source/application links remain available. Raw location
and timezone restrictions and expiry information are retained in Location &
eligibility rather than occupying the top of the job description.

## Asset provenance

The locally served workspace photograph comes from Unsplash:
https://images.unsplash.com/photo-1497366216548-37526070297c

It is not project-owned artwork. Its source/licensing reference is
https://unsplash.com/license. The asset is served locally rather than making
visitors fetch it from a third-party image host.

## Verification

Interaction checks cover theme selection/persistence, custom select controls,
currency search/selection, complete reset, pending-request cancellation, source
disclosures, source application links, and applied-search pagination. Backend
tests cover catalogue filtering, daily caching, CDN fallback and the currency API
route. No further screenshots are used for this UI iteration after owner feedback;
visual review is left to the owner in the running development app.

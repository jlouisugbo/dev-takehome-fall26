# Checklist

<!-- Make sure you fill out this checklist with what you've done before submitting! -->

- [X] Read the README [please please please]
- [X] Something cool!
- [X] Back-end
  - [X] Minimum Requirements
    - [X] Setup MongoDB database
    - [X] Setup item requests collection
    - [X] `PUT /api/request`
    - [X] `GET /api/request?page=_`
  - [X] Main Requirements
    - [X] `GET /api/request?status=pending`
    - [X] `PATCH /api/request`
  - [X] Above and Beyond
    - [X] Batch edits
    - [X] Batch deletes
- [X] Front-end
  - [X] Minimum Requirements
    - [X] Dropdown component
    - [X] Table component
    - [X] Base page [table with data]
    - [X] Table dropdown interactivity
  - [X] Main Requirements
    - [X] Pagination
    - [X] Tabs
  - [X] Above and Beyond
    - [X] Batch edits
    - [X] Batch deletes

# Notes

<!-- Notes go here -->
Admin at /admin talks to Mongo via /api/request (ObjectId strings). /cool is a small Daggerheart-style board. Paste .env.local in the application; Atlas allows 0.0.0.0/0. Did not commit secrets.

I made an edit on the admin table because the header kept pushing the table up and down and that's a known design anti-pattern and so I changed that
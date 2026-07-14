# AEGIS Evidence Intelligence Platform

A new MVP scaffold for an Australian government evidence investigation platform.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the platform:
   ```bash
   npm run dev
   ```

## Features in this MVP

- Evidence ingestion from URLs, HTML, JSON, XML, CSV, and PDF
- Government source trust scoring
- Investigation workspace with evidence linking
- Unified search across evidence and investigations
- Report generation for investigations
- Minimal modern UI scaffold with navigation

## Architecture

- `src/backend` - API server, ingestion, crawler, evidence services, storage
- `src/frontend` - React app, workspace UI, search, investigations, reports
- `src/shared` - Domain models and interfaces

## Notes

This scaffold is designed for extensibility with modular engine services and a clean separation between backend and frontend.

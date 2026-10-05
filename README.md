# Time Difference App

A lightweight timezone comparison tool built with React and Vite. It helps you compare cities, see the current time in each location, and find overlapping working hours across time zones.

## What it does

- Compare the current time in multiple cities
- Search for cities worldwide and add them to a comparison list
- See weather for each selected city
- Customize daily availability windows for each location
- View a 24-hour, 3-day, or 7-day comparison grid
- Identify overlapping work hours and daylight-saving time status

## Tech stack

- React 19
- Vite
- Lucide icons
- Open-Meteo geocoding and weather APIs

## Prerequisites

- Node.js 18 or newer
- npm

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open the app in your browser:
   ```text
   http://localhost:5173
   ```

The Vite dev server will hot-reload while you work.

## Production build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project structure

```text
.
├── public/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── App.css
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

## Notes

- City search and weather data are fetched from Open-Meteo in the browser.
- Some browser/network restrictions may prevent live API access in restricted environments, but the app is designed to work normally in a standard local setup.
- Availability defaults to a 9:00 AM to 5:00 PM work window, which you can customize per city.
